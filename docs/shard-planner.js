const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const NUMBER_FORMATTER = new Intl.NumberFormat();

function parseDungeonCountdown(value) {
  const match = value.trim().match(/^(\d{1,3}):([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  const [, days, hours, minutes] = match.map(Number);
  return ((days * 24 + hours) * 60 + minutes) * 60 * 1000;
}

function createProjection({ countdownMs, shardsPerRun, gearCount, shardsOnHand }, today = new Date()) {
  const target = gearCount * 100;
  const dailyYield = shardsPerRun * 4;
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const dungeonStart = new Date(today.getTime() + countdownMs);
  const dungeonStartDate = new Date(
    dungeonStart.getFullYear(),
    dungeonStart.getMonth(),
    dungeonStart.getDate(),
    12,
  );
  const dayBeforeDungeon = new Date(dungeonStartDate);
  dayBeforeDungeon.setDate(dayBeforeDungeon.getDate() - 1);
  const craftDeadline = new Date(dungeonStartDate);
  craftDeadline.setDate(craftDeadline.getDate() - 2);
  const deadlinePassed = craftDeadline < startDate;
  const finalCraftDate = deadlinePassed ? startDate : craftDeadline;
  const dates = [];
  for (const date = new Date(startDate); date <= dungeonStartDate; date.setDate(date.getDate() + 1)) {
    dates.push(new Date(date));
  }
  const earnings = dates.map((date, dayOffset) => {
    if (dayOffset === 0 || date >= dayBeforeDungeon) return 0;
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return dungeonStart.getTime() - dayStart.getTime() < DAY_MS ? 0 : dailyYield;
  });
  const craftDeadlineIndex = Math.max(0, dates.findIndex((date) => date.getTime() === finalCraftDate.getTime()));
  const totalAvailableByDeadline = shardsOnHand
    + earnings.slice(0, craftDeadlineIndex + 1).reduce((total, value) => total + value, 0);
  const canMeetTarget = totalAvailableByDeadline >= target;
  const days = [];
  let stash = shardsOnHand;
  let craftedTotal = 0;

  for (let dayOffset = 0; dayOffset < dates.length; dayOffset += 1) {
    const date = dates[dayOffset];
    const earned = earnings[dayOffset];
    const isDungeonStart = dayOffset === dates.length - 1;
    if (isDungeonStart) {
      days.push({
        date,
        earned: 0,
        crafted: 0,
        craftedTotal,
        projected: stash,
        minimumToKeep: 0,
        excessToSell: 0,
        shortfall: 0,
        remaining: Math.max(0, gearCount - craftedTotal),
        isToday: dayOffset === 0,
        isCraftDate: false,
        isDungeonStart: true,
      });
      continue;
    }
    stash += earned;

    const futureYield = dayOffset < craftDeadlineIndex
      ? earnings.slice(dayOffset + 1, craftDeadlineIndex + 1).reduce((total, value) => total + value, 0)
      : 0;
    const reserveBeforeCrafting = Math.max(0, (gearCount - craftedTotal) * 100 - futureYield);
    const sellableExcess = Math.max(0, stash - reserveBeforeCrafting);
    const excessToSell = canMeetTarget ? Math.floor(sellableExcess / 10) * 10 : 0;
    stash -= excessToSell;
    let crafted = 0;

    if (dayOffset <= craftDeadlineIndex) {
      while (craftedTotal < gearCount && stash >= 100) {
        const remainingAfterCraft = gearCount - craftedTotal - 1;
        const reserveAfterCraft = Math.max(0, remainingAfterCraft * 100 - futureYield);
        if (canMeetTarget && stash - 100 < reserveAfterCraft) break;
        stash -= 100;
        crafted += 1;
        craftedTotal += 1;
      }
    }

    const remainingPieces = gearCount - craftedTotal;
    const minimumToKeep = Math.max(0, remainingPieces * 100 - futureYield);

    days.push({
      date,
      earned,
      crafted,
      craftedTotal,
      projected: stash,
      minimumToKeep,
      excessToSell,
      shortfall: Math.max(0, minimumToKeep - stash),
      remaining: Math.max(0, gearCount - craftedTotal),
      isToday: dayOffset === 0,
      isCraftDate: dayOffset === craftDeadlineIndex,
      isDungeonStart: false,
    });
  }

  return { target, dailyYield, days, craftDate: finalCraftDate, deadlinePassed, craftedTotal, gearCount };
}

function renderCalendar(projection, visibleMonth) {
  const calendar = document.getElementById('calendar');
  const monthTitle = document.getElementById('month-title');
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12);
  const monthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0, 12);
  const firstWeekday = monthStart.getDay();
  const finalProjectionDate = projection.days[projection.days.length - 1].date;
  const daysByDate = new Map(projection.days.map((day) => [
    `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`,
    day,
  ]));

  monthTitle.textContent = MONTH_FORMATTER.format(monthStart);
  const firstMonth = new Date(projection.days[0].date.getFullYear(), projection.days[0].date.getMonth(), 1, 12);
  const finalMonth = new Date(finalProjectionDate.getFullYear(), finalProjectionDate.getMonth(), 1, 12);
  document.getElementById('previous-month').disabled = monthStart <= firstMonth;
  document.getElementById('next-month').disabled = monthStart >= finalMonth;
  calendar.replaceChildren();
  for (const weekday of WEEKDAYS) {
    const heading = document.createElement('span');
    heading.className = 'weekday';
    heading.textContent = weekday;
    calendar.append(heading);
  }

  for (let blank = 0; blank < firstWeekday; blank += 1) {
    const empty = document.createElement('span');
    empty.className = 'day-cell empty';
    empty.setAttribute('aria-hidden', 'true');
    calendar.append(empty);
  }

  for (let dayNumber = 1; dayNumber <= monthEnd.getDate(); dayNumber += 1) {
    const dayData = daysByDate.get(`${monthStart.getFullYear()}-${monthStart.getMonth()}-${dayNumber}`);
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (!dayData) {
      cell.classList.add('empty');
      const calendarDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), dayNumber, 12);
      if (calendarDate <= finalProjectionDate) {
        cell.innerHTML = `<span class="day-number">${dayNumber}</span>`;
      } else {
        cell.setAttribute('aria-hidden', 'true');
      }
    } else {
      if (dayData.isDungeonStart) {
        cell.classList.add('dungeon-start');
        cell.innerHTML = '<span class="dungeon-start-label">NEW DUNGEON START</span>';
        cell.setAttribute('aria-label', `${MONTH_FORMATTER.format(dayData.date)} ${dayNumber}: new dungeon start`);
      } else {
        if (dayData.isToday) cell.classList.add('today');
        if (dayData.crafted > 0) cell.classList.add('craft-day');
        if (dayData.earned === 0) cell.classList.add('zero-earn');
        if (dayData.isCraftDate) cell.classList.add('planned-craft-date');
        const craftLabel = dayData.crafted > 0
          ? `Crafted ${dayData.crafted} ${dayData.crafted === 1 ? 'piece' : 'pieces'}`
          : dayData.isCraftDate
            ? `${dayData.remaining} ${dayData.remaining === 1 ? 'piece' : 'pieces'} not craftable`
            : '';
        const reserveLabel = dayData.shortfall > 0
          ? `Short ${NUMBER_FORMATTER.format(dayData.shortfall)}`
          : `Keep ${NUMBER_FORMATTER.format(dayData.minimumToKeep)}`;
        const saleLabel = `Sell ${NUMBER_FORMATTER.format(dayData.excessToSell)}`;
        cell.innerHTML = `<span class="day-number">${dayNumber}</span><span class="day-balance">${reserveLabel}</span><span class="day-status">${saleLabel}</span>${craftLabel ? `<span class="craft-label">${craftLabel}</span>` : ''}`;
        cell.setAttribute('aria-label', `${MONTH_FORMATTER.format(dayData.date)} ${dayNumber}: minimum ${dayData.minimumToKeep} shards to keep, ${dayData.excessToSell} excess shards to sell${dayData.shortfall ? `, short by ${dayData.shortfall}` : ''}${craftLabel ? `, ${craftLabel}` : ''}`);
      }
    }
    calendar.append(cell);
  }
}

function setSummary(projection, shardsOnHand) {
  const { target, dailyYield, craftDate, deadlinePassed, craftedTotal, gearCount } = projection;
  const fundedPercent = Math.min(100, Math.round((craftedTotal / gearCount) * 100));

  document.getElementById('target-total').textContent = NUMBER_FORMATTER.format(target);
  document.getElementById('daily-total').textContent = NUMBER_FORMATTER.format(dailyYield);
  document.getElementById('current-total').textContent = NUMBER_FORMATTER.format(shardsOnHand);
  document.getElementById('progress-label').textContent = `${craftedTotal} / ${gearCount} crafted`;
  const remainingPieces = gearCount - craftedTotal;
  document.getElementById('remaining-label').textContent = `${remainingPieces} ${remainingPieces === 1 ? 'piece' : 'pieces'} to go`;
  document.getElementById('progress-fill').style.width = `${fundedPercent}%`;
  document.querySelector('.progress-track').setAttribute('aria-valuenow', String(fundedPercent));
  if (deadlinePassed) {
    document.getElementById('ready-in').textContent = craftedTotal === gearCount
      ? 'Two-day craft date passed; target crafted'
      : `Two-day craft date passed; ${craftedTotal} of ${gearCount} craftable today`;
  } else {
    const craftDateText = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(craftDate);
    document.getElementById('ready-in').textContent = craftedTotal === gearCount
      ? `All pieces crafted; latest date ${craftDateText}`
      : `Latest date ${craftDateText}; ${craftedTotal} of ${gearCount} craftable`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('planner-form');
  const error = document.getElementById('form-error');
  let projection;
  let visibleMonth = new Date();

  function updatePlan(event) {
    event?.preventDefault();
    const countdownMs = parseDungeonCountdown(form.elements.nextDungeon.value);
    const shardsPerRun = Number(form.elements.shardsPerRun.value);
    const gearCount = Number(form.elements.gearCount.value);
    const shardsOnHand = Number(form.elements.shardsOnHand.value);

    if (countdownMs === null || shardsPerRun <= 0 || gearCount <= 0 || shardsOnHand < 0) {
      error.textContent = 'Enter a valid DD:HH:mm countdown and non-negative shard amounts.';
      return;
    }

    error.textContent = '';
    projection = createProjection({ countdownMs, shardsPerRun, gearCount, shardsOnHand });
    visibleMonth = new Date();
    setSummary(projection, shardsOnHand);
    renderCalendar(projection, visibleMonth);
  }

  form.addEventListener('submit', updatePlan);
  document.getElementById('previous-month').addEventListener('click', () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1, 12);
    renderCalendar(projection, visibleMonth);
  });
  document.getElementById('next-month').addEventListener('click', () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1, 12);
    renderCalendar(projection, visibleMonth);
  });

  const readyIn = document.createElement('span');
  readyIn.id = 'ready-in';
  readyIn.className = 'summary-item-ready';
  const progress = document.querySelector('.progress-copy');
  progress.append(readyIn);
  updatePlan();
});