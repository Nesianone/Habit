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

/** Wire up the bottom nav buttons */
function setupNavListeners() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.screen));
  });
}

document.addEventListener('DOMContentLoaded', init);
