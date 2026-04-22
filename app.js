/** Returns "YYYY-MM" for today */
function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Shared app state
const state = {
  activeScreen: 'wheel',
  activeMonth: currentYearMonth(), // e.g. "2026-04"
};

/** Load habits from localStorage (returns array) */
function loadHabits() {
  return JSON.parse(localStorage.getItem('habits') || '[]');
}

/** Save habits array to localStorage */
function saveHabits(habits) {
  localStorage.setItem('habits', JSON.stringify(habits));
}

/** Load preferences object from localStorage */
function loadPrefs() {
  return JSON.parse(localStorage.getItem('prefs') || '{"theme":"dark","reminders":{}}');
}

/** Save preferences object to localStorage */
function savePrefs(prefs) {
  localStorage.setItem('prefs', JSON.stringify(prefs));
}

/** Switch visible screen and update nav */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(`screen-${name}`).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === name);
  });
  state.activeScreen = name;
  if (name === 'wheel') renderWheelScreen();
  if (name === 'dashboard') renderDashboardScreen();
  if (name === 'settings') renderSettingsScreen();
}

/** Apply theme class to body */
function applyTheme(theme) {
  document.body.classList.toggle('theme-light', theme === 'light');
  document.body.classList.toggle('theme-dark', theme === 'dark');
}

/** App entry point */
async function init() {
  const prefs = loadPrefs();
  applyTheme(prefs.theme || 'dark');

  const onboarded = localStorage.getItem('onboarded') === 'true';

  if (!onboarded) {
    initOnboarding();
    return;
  }

  await openDB();
  document.getElementById('bottom-nav').classList.remove('hidden');
  setupNavListeners();
  await checkMonthCloseOut();
  showScreen('wheel');
  scheduleReminders();
}

/** Render the wheel screen: builds the SVG wheel, legend, and wires up month navigation */
async function renderWheelScreen() {
  const habits = loadHabits();
  const logs   = await getLogsForMonth(state.activeMonth);
  const [y, m] = state.activeMonth.split('-').map(Number);
  const label  = new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  document.getElementById('wheel-month-label').textContent = label;

  const isCurrentMonth = state.activeMonth === currentYearMonth();
  document.getElementById('btn-next-month').disabled = isCurrentMonth;

  renderWheel(habits, logs, state.activeMonth);
  renderLegend(habits, logs, state.activeMonth);

  document.getElementById('btn-prev-month').onclick = () => {
    const [y, m] = state.activeMonth.split('-').map(Number);
    const prev   = new Date(y, m - 2, 1);
    state.activeMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    renderWheelScreen();
  };
  document.getElementById('btn-next-month').onclick = () => {
    if (state.activeMonth === currentYearMonth()) return;
    const [y, m] = state.activeMonth.split('-').map(Number);
    const next   = new Date(y, m, 1);
    state.activeMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    renderWheelScreen();
  };
}

/** Render the dashboard for the active month */
async function renderDashboardScreen() {
  await renderDashboard(state.activeMonth);
}

/** Wire up the bottom nav buttons */
function setupNavListeners() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.screen));
  });
}

/**
 * On first open of a new month, prompt user to add observations
 * for the previous month before they start the new one.
 */
async function checkMonthCloseOut() {
  const lastSeen = localStorage.getItem('lastSeenMonth');
  const now      = currentYearMonth();
  localStorage.setItem('lastSeenMonth', now);

  if (!lastSeen || lastSeen === now) return; // same month or first run

  // Build label for previous month
  const [y, m] = lastSeen.split('-').map(Number);
  const prevLabel = new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const nextLabel = new Date(y, m, 1).toLocaleString(undefined, { month: 'long' });

  const overlay = document.getElementById('closeout-overlay');
  const modal   = document.getElementById('closeout-modal');

  modal.innerHTML = `
    <div class="closeout-title">How did ${prevLabel} go?</div>
    <div class="closeout-sub">Add your observations before starting ${nextLabel}.</div>
    <div class="section-label">Observations</div>
    <textarea id="closeout-obs" placeholder="Reflect on last month..." style="margin-bottom:14px"></textarea>
    <div class="section-label">Key Goals for ${nextLabel}</div>
    ${[0,1,2].map(i => `
      <div class="goals-input">
        <span style="color:var(--text-muted);font-size:13px;">${i+1}.</span>
        <input type="text" class="closeout-goal" data-idx="${i}" placeholder="Goal ${i+1}" maxlength="80">
      </div>`).join('')}
    <button class="btn-primary" id="closeout-save-btn" style="margin-top:16px">Save & Continue</button>
    <button class="btn-secondary" id="closeout-skip-btn" style="margin-top:8px">Skip</button>
  `;

  // Pre-fill if data already exists for previous month
  const existing = await getMonth(lastSeen);
  if (existing) {
    document.getElementById('closeout-obs').value = existing.observations || '';
    document.querySelectorAll('.closeout-goal').forEach((el, i) => {
      el.value = (existing.goals || [])[i] || '';
    });
  }

  overlay.classList.remove('hidden');

  async function saveAndClose() {
    const observations = document.getElementById('closeout-obs').value;
    const goals = Array.from(document.querySelectorAll('.closeout-goal')).map(el => el.value);
    await saveMonth({ id: lastSeen, observations, goals });
    overlay.classList.add('hidden');
  }

  document.getElementById('closeout-save-btn').addEventListener('click', saveAndClose);
  document.getElementById('closeout-skip-btn').addEventListener('click', () => {
    overlay.classList.add('hidden');
  });
}

document.addEventListener('DOMContentLoaded', init);
