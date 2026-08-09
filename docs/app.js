async function loadExpEntries() {
  const remoteUrl = 'https://qenu.github.io/ethna-timeline/assets/data/exp_required.json';
  const fallbackUrl = 'season_exp.json';

  try {
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      throw new Error(`Remote XP data unavailable (${response.status})`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Unexpected XP data format from remote source');
    }
    return data;
  } catch (error) {
    const fallbackResponse = await fetch(fallbackUrl);
    if (!fallbackResponse.ok) {
      throw new Error('Unable to load XP data from remote or local sources');
    }

    const data = await fallbackResponse.json();
    if (!Array.isArray(data)) {
      throw new Error('Unexpected XP data format from local source');
    }
    return data;
  }
}

function calcRequiredExp(expEntries, currentLvl, targetLvl, season) {
  let requiredExp = 0;
  for (const entry of expEntries) {
    const level = Number(entry.level);
    const exp = Number(entry.exp);
    const entrySeason = Number(entry.season);

    if (level > currentLvl && level <= targetLvl && entrySeason === season) {
      requiredExp += exp;
    }
  }
  return requiredExp;
}

function countResetsPassed(startMs, deltaMs) {
  const resetMs = 13 * 3600 * 1000; // 13:00 UTC in ms
  const endMs = startMs + deltaMs;
  const startShifted = startMs - resetMs;
  const endShifted = endMs - resetMs;

  function dateUtcMs(ms) {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  const startDateMs = dateUtcMs(startShifted);
  const endDateMs = dateUtcMs(endShifted);
  const daysPassed = Math.floor((endDateMs - startDateMs) / (24 * 3600 * 1000));
  return Math.max(0, daysPassed);
}

function calcEtaJs(currLvl, currExp, tgtLvl, xpPerHr, currentTsMs, outputTz, season, expEntries) {
  const xpRequired = calcRequiredExp(expEntries, currLvl, tgtLvl, season);
  const remainingXp = xpRequired - currExp;
  if (remainingXp <= 0) return {eta: new Date(currentTsMs), note: 'Already reached target'};
  const timeRequiredHr = remainingXp / xpPerHr;

  const freeResets = countResetsPassed(currentTsMs, timeRequiredHr * 3600 * 1000);
  const remainingTimeHr = Math.max(0, timeRequiredHr - (2 * freeResets));

  const etaMs = currentTsMs + remainingTimeHr * 3600 * 1000;
  const etaDate = new Date(etaMs);
  const formatter = new Intl.DateTimeFormat(undefined, {dateStyle:'medium', timeStyle:'short', timeZone: outputTz || 'America/New_York'});
  return {eta: etaDate, formatted: formatter.format(etaDate), freeResets};
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('calc-form');
  const result = document.getElementById('result');
  const tzSelect = document.getElementById('output_tz');
  const seasonSelect = document.getElementById('season');

  let expEntries = [];
  try {
    expEntries = await loadExpEntries();
  } catch (error) {
    result.innerHTML = `<strong>${error.message}</strong>`;
    return;
  }

  if (seasonSelect) {
    const seasons = Array.from(new Set(expEntries.map((entry) => Number(entry.season)).filter(Boolean))).sort((a, b) => a - b);
    for (const season of seasons) {
      const opt = document.createElement('option');
      opt.value = season;
      opt.textContent = `Season ${season}`;
      seasonSelect.appendChild(opt);
    }
    seasonSelect.value = seasons[0] ? String(seasons[0]) : '1';
  }

  // populate timezone select from TIMEZONES provided by timezones.js
  if (window.TIMEZONES && tzSelect) {
    for (const tz of window.TIMEZONES) {
      const opt = document.createElement('option');
      opt.value = tz;
      opt.textContent = tz;
      tzSelect.appendChild(opt);
    }
    tzSelect.value = 'America/New_York';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const currLvl = parseInt(document.getElementById('current_level').value, 10);
    const currExp = parseInt(document.getElementById('current_exp').value, 10);
    const tgtLvl = parseInt(document.getElementById('target_level').value, 10);
    const xpPerHr = parseFloat(document.getElementById('xp_per_hr').value);
    const outputTz = document.getElementById('output_tz').value || 'America/New_York';
    const season = parseInt(seasonSelect?.value || '1', 10);

    // Always use the current instant in UTC
    const nowMs = Date.now();

    const out = calcEtaJs(currLvl, currExp, tgtLvl, xpPerHr, nowMs, outputTz, season, expEntries);
    if (out.note) {
      result.innerHTML = `<strong>${out.note}</strong>`;
    } else {
      result.innerHTML = `<div><strong>ETA:</strong> ${out.formatted}</div><div><strong>Free resets crossed:</strong> ${out.freeResets}</div>`;
    }
  });
});
