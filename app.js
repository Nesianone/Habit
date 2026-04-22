// Shared app state
const state = {
  activeScreen: 'wheel',
  activeMonth: currentYearMonth(), // e.g. "2026-04"
};

/** Returns "YYYY-MM" for today */
function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

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

/** Wire up the bottom nav buttons */
function setupNavListeners() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.screen));
  });
}

document.addEventListener('DOMContentLoaded', init);
