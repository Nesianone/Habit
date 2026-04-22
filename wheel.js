const R_CENTER = 48;
const RING_W   = 12;
const RING_GAP = 2;
const RING_STEP = RING_W + RING_GAP;
const R_TOTAL  = 185;
const CX = 200, CY = 200;

/** Days in a given "YYYY-MM" string */
function daysInMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** Convert polar coords to SVG cartesian. angle in radians. */
function polar(cx, cy, r, angle) {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

/** Build an SVG arc path string for a donut segment */
function arcPath(cx, cy, rInner, rOuter, startDeg, endDeg) {
  const pad = 0.5; // degrees of padding between segments
  const s1 = (startDeg + pad) * Math.PI / 180;
  const e1 = (endDeg   - pad) * Math.PI / 180;
  const [x1, y1] = polar(cx, cy, rOuter, s1);
  const [x2, y2] = polar(cx, cy, rOuter, e1);
  const [x3, y3] = polar(cx, cy, rInner, e1);
  const [x4, y4] = polar(cx, cy, rInner, s1);
  const large = (endDeg - startDeg > 180) ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4}`,
    'Z'
  ].join(' ');
}

/** Pick segment fill colour based on log status and whether the day is in the future */
function segmentColour(status, dayNum, today, activeMonth) {
  const todayYM = currentYearMonth();
  const isCurrentMonth = activeMonth === todayYM;
  const todayDay = new Date().getDate();
  if (status === 'done')   return 'var(--green)';
  if (status === 'missed') return 'var(--red)';
  if (isCurrentMonth && dayNum > todayDay) return 'var(--bg-card)'; // future
  return 'var(--grey-seg)'; // unlogged past
}

/**
 * Render the habit wheel into #wheel-container.
 * habits: array of habit objects (ordered)
 * logs:   array of log objects for this month
 * yearMonth: "YYYY-MM"
 */
function renderWheel(habits, logs, yearMonth) {
  const days = daysInMonth(yearMonth);
  const segAngle = 360 / days;
  const startOffset = -90; // top of circle

  // Build log lookup: habitId+date -> status
  const logMap = {};
  logs.forEach(l => { logMap[`${l.habitId}-${l.date}`] = l.status; });

  let svg = `<svg id="wheel-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">`;

  // Rings — one per habit, innermost ring = first habit
  habits.forEach((habit, ringIdx) => {
    const rInner = R_CENTER + ringIdx * RING_STEP;
    const rOuter = rInner + RING_W;

    for (let day = 1; day <= days; day++) {
      const startDeg = startOffset + (day - 1) * segAngle;
      const endDeg   = startOffset + day * segAngle;
      const dateStr  = `${yearMonth}-${String(day).padStart(2, '0')}`;
      const status   = logMap[`${habit.id}-${dateStr}`] || null;
      const colour   = segmentColour(status, day, new Date(), yearMonth);
      const d        = arcPath(CX, CY, rInner, rOuter, startDeg, endDeg);
      svg += `<path d="${d}" fill="${colour}" data-habit="${habit.id}" data-date="${dateStr}" class="seg"/>`;
    }
  });

  // Day number labels at the outer edge
  const rLabel = R_TOTAL + 10;
  for (let day = 1; day <= days; day++) {
    const midDeg = startOffset + (day - 0.5) * segAngle;
    const rad    = midDeg * Math.PI / 180;
    const [tx, ty] = polar(CX, CY, rLabel, rad);
    const fontSize = days > 29 ? 7 : 8;
    svg += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}"
      text-anchor="middle" dominant-baseline="middle"
      fill="var(--text-muted)" font-size="${fontSize}"
      class="day-label" data-day="${day}"
      style="cursor:pointer">${day}</text>`;
  }

  // Centre circle with month and year
  const [y, m] = yearMonth.split('-').map(Number);
  const monthName = new Date(y, m - 1, 1).toLocaleString('default', { month: 'short' }).toUpperCase();
  svg += `<circle cx="${CX}" cy="${CY}" r="${R_CENTER - 2}" fill="var(--bg)"/>`;
  svg += `<text x="${CX}" y="${CY - 7}" text-anchor="middle" fill="var(--text-muted)" font-size="10">${monthName}</text>`;
  svg += `<text x="${CX}" y="${CY + 9}" text-anchor="middle" fill="var(--text)" font-size="13" font-weight="700">${y}</text>`;

  svg += `</svg>`;

  const container = document.getElementById('wheel-container');
  container.innerHTML = svg;
  attachWheelListeners(yearMonth);
}

/** Attach click listeners to day labels so tapping a day opens the day popup */
function attachWheelListeners(yearMonth) {
  document.querySelectorAll('.day-label').forEach(el => {
    el.addEventListener('click', () => openDayPopup(parseInt(el.dataset.day), yearMonth));
  });
}

/** Render the legend below the wheel showing each habit's today status and streak */
function renderLegend(habits, logs, yearMonth) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const logMap = {};
  logs.forEach(l => { logMap[`${l.habitId}-${l.date}`] = l.status; });

  const streaks = {};
  habits.forEach(h => { streaks[h.id] = calcStreak(h.id, logs, yearMonth); });

  const legend = document.querySelector('.legend');
  legend.innerHTML = habits.map(h => {
    const todayStatus = logMap[`${h.id}-${todayStr}`] || null;
    const dotColour = todayStatus === 'done' ? 'var(--green)'
                    : todayStatus === 'missed' ? 'var(--red)'
                    : 'var(--grey-seg)';
    const streak = streaks[h.id];
    const streakHTML = streak > 0 ? `🔥 ${streak}` : '';
    return `<div class="legend-row">
      <span class="legend-dot" style="background:${dotColour}"></span>
      <span class="legend-name">${h.name}</span>
      <span class="legend-streak">${streakHTML}</span>
    </div>`;
  }).join('');
}

/**
 * Calculate current streak for a habit (consecutive 'done' days back from today).
 * logs: all logs for the active month.
 */
function calcStreak(habitId, logs, yearMonth) {
  const logMap = {};
  logs.forEach(l => { if (l.habitId === habitId) logMap[l.date] = l.status; });

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 31; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (logMap[dateStr] === 'done') streak++;
    else if (logMap[dateStr] === 'missed') break;
    else break;
  }
  return streak;
}

/** Open the day logging popup for a given day number and yearMonth */
async function openDayPopup(dayNum, yearMonth) {
  const isCurrentMonth = yearMonth === currentYearMonth();
  const todayDay = new Date().getDate();
  const readOnly = !isCurrentMonth || dayNum > todayDay;

  const dateStr  = `${yearMonth}-${String(dayNum).padStart(2, '0')}`;
  const habits   = loadHabits();
  const logs     = await getLogsForMonth(yearMonth);
  const logMap   = {};
  logs.forEach(l => { logMap[`${l.habitId}-${l.date}`] = l.status; });

  const [y, m] = yearMonth.split('-').map(Number);
  const dateLabel = new Date(y, m - 1, dayNum).toLocaleDateString('default', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  const groups = { morning: [], midday: [], night: [] };
  habits.forEach(h => groups[h.timeOfDay].push(h));

  let html = `<div class="popup-header">
    <span class="popup-date">${dateLabel}</span>
    <button class="popup-close" id="popup-close-btn">✕</button>
  </div>`;

  ['morning', 'midday', 'night'].forEach(tod => {
    if (!groups[tod].length) return;
    const label = tod.charAt(0).toUpperCase() + tod.slice(1);
    html += `<div class="time-group-label">${label}</div>`;
    groups[tod].forEach(h => {
      const status = logMap[`${h.id}-${dateStr}`] || null;
      const btnClass = status === 'done' ? 'done' : status === 'missed' ? 'missed' : '';
      const icon = status === 'done' ? '✓' : status === 'missed' ? '✗' : '·';
      const disabled = readOnly ? 'disabled style="opacity:0.5"' : '';
      html += `<div class="habit-toggle-row">
        <button class="toggle-btn ${btnClass}" data-habit="${h.id}" data-date="${dateStr}" ${disabled}>${icon}</button>
        <span class="habit-toggle-name">${h.name}</span>
      </div>`;
    });
  });

  if (readOnly) {
    html += `<p style="text-align:center;color:var(--text-muted);font-size:12px;margin-top:12px;">
      ${dayNum > new Date().getDate() && isCurrentMonth ? 'Future day — cannot log yet' : 'Past month — read only'}
    </p>`;
  }

  const popup   = document.getElementById('day-popup');
  const overlay = document.getElementById('day-popup-overlay');
  popup.innerHTML = html;
  overlay.classList.remove('hidden');

  document.getElementById('popup-close-btn').addEventListener('click', closeDayPopup);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeDayPopup(); }, { once: true });

  if (!readOnly) attachToggleListeners(yearMonth);
}

/** Close the day popup overlay */
function closeDayPopup() {
  document.getElementById('day-popup-overlay').classList.add('hidden');
}

/** Attach 3-state toggle listeners to habit buttons in popup */
function attachToggleListeners(yearMonth) {
  document.querySelectorAll('.toggle-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async () => {
      const habitId = btn.dataset.habit;
      const date    = btn.dataset.date;
      const current = btn.classList.contains('done') ? 'done'
                    : btn.classList.contains('missed') ? 'missed' : null;
      const next    = current === null ? 'done' : current === 'done' ? 'missed' : null;

      btn.className = `toggle-btn ${next || ''}`;
      btn.textContent = next === 'done' ? '✓' : next === 'missed' ? '✗' : '·';

      await saveLog({ habitId, date, status: next });
      renderWheelScreen(); // refresh wheel behind popup
    });
  });
}
