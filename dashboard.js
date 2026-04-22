/** Completion rate 0-100 for one habit over a month */
function completionRate(habitId, logs, yearMonth) {
  const days     = daysInMonth(yearMonth);
  const today    = new Date();
  const isThisMonth = yearMonth === currentYearMonth();
  const countDays   = isThisMonth ? today.getDate() : days;

  let done = 0;
  for (let d = 1; d <= countDays; d++) {
    const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`;
    const log     = logs.find(l => l.habitId === habitId && l.date === dateStr);
    if (log && log.status === 'done') done++;
  }
  return countDays > 0 ? Math.round((done / countDays) * 100) : 0;
}

/** Longest streak for a habit within a month */
function longestStreakInMonth(habitId, logs, yearMonth) {
  const days = daysInMonth(yearMonth);
  let max = 0, cur = 0;
  for (let d = 1; d <= days; d++) {
    const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`;
    const log     = logs.find(l => l.habitId === habitId && l.date === dateStr);
    if (log && log.status === 'done') { cur++; max = Math.max(max, cur); }
    else cur = 0;
  }
  return max;
}

/** Pick bar/dot colour based on completion rate */
function rateColour(rate) {
  if (rate >= 75) return 'var(--green)';
  if (rate >= 55) return 'var(--yellow)';
  if (rate >= 35) return 'var(--orange)';
  return 'var(--red)';
}

/** Fetch data and render the full dashboard into #screen-dashboard */
async function renderDashboard(yearMonth) {
  const habits = loadHabits();
  const logs   = await getLogsForMonth(yearMonth);
  const [y, m] = yearMonth.split('-').map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });

  // Compute rates and streaks, sorted highest rate first
  const rates = habits.map(h => ({
    ...h,
    rate:   completionRate(h.id, logs, yearMonth),
    streak: longestStreakInMonth(h.id, logs, yearMonth),
  })).sort((a, b) => b.rate - a.rate);

  const overall = rates.length
    ? Math.round(rates.reduce((s, h) => s + h.rate, 0) / rates.length)
    : 0;

  // Top 3 by longest streak
  const topStreaks = [...rates].sort((a, b) => b.streak - a.streak).slice(0, 3);

  // Bottom 3 by lowest rate (focus next month)
  const focus = [...rates].sort((a, b) => a.rate - b.rate).slice(0, 3);

  const screen = document.getElementById('screen-dashboard');
  screen.innerHTML = `
    <div class="dashboard-header">
      <div>
        <div class="dash-title">${monthLabel}</div>
        <div class="dash-sub">Monthly Review</div>
      </div>
      <div class="score-badge">
        <div class="score-value">${overall}%</div>
        <div class="score-label">overall</div>
      </div>
    </div>

    <div class="dash-section">
      <div class="section-label">Habit Completion</div>
      ${rates.map(h => `
        <div class="habit-bar-row">
          <div class="habit-bar-meta">
            <span>${h.name}</span>
            <span style="color:${rateColour(h.rate)}">${h.rate}%</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${h.rate}%;background:${rateColour(h.rate)}"></div>
          </div>
        </div>`).join('')}
    </div>

    <div class="dash-section">
      <div class="section-label">Best Streaks</div>
      <div class="streaks-grid">
        ${topStreaks.map(h => `
          <div class="streak-card">
            <div class="streak-num">${h.streak}</div>
            <div class="streak-unit">days</div>
            <div class="streak-habit">${h.name.split(' ')[0]}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="dash-section">
      <div class="section-label">Focus Next Month</div>
      ${focus.map(h => `
        <div class="focus-item">
          <div class="focus-dot" style="background:${rateColour(h.rate)}"></div>
          <div class="focus-name">${h.name}</div>
          <div class="focus-pct" style="color:${rateColour(h.rate)}">${h.rate}%</div>
        </div>`).join('')}
    </div>
  `;
}
