async function loadXpTable() {
  const res = await fetch('required_xp.csv');
  const txt = await res.text();
  const lines = txt.trim().split('\n').slice(1);
  const xp = {};
  for (const line of lines) {
    const cols = line.split(',');
    const lvl = parseInt(cols[0], 10);
    const xpReq = parseInt(cols[1], 10);
    xp[lvl] = xpReq;
  }
  return xp;
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

function calcEtaJs(currLvl, currExp, tgtLvl, xpPerHr, currentTsMs, outputTz, xpTable) {
  let xpRequired = 0;
  for (let lvl = currLvl + 1; lvl <= tgtLvl; lvl++) {
    xpRequired += (xpTable[lvl] || 0);
  }
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
  const xpTable = await loadXpTable();
  const form = document.getElementById('calc-form');
  const result = document.getElementById('result');
  const tzSelect = document.getElementById('output_tz');

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

    // Always use the current instant in UTC
    const nowMs = Date.now();

    const out = calcEtaJs(currLvl, currExp, tgtLvl, xpPerHr, nowMs, outputTz, xpTable);
    if (out.note) {
      result.innerHTML = `<strong>${out.note}</strong>`;
    } else {
      result.innerHTML = `<div><strong>ETA:</strong> ${out.formatted}</div><div><strong>Free resets crossed:</strong> ${out.freeResets}</div>`;
    }
  });
});
