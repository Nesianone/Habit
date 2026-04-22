let onboardStep = 0;
let onboardHabits = [];

/** Initialise and render the 4-step onboarding wizard into #screen-onboarding */
function initOnboarding() {
  onboardStep = 0;
  onboardHabits = [];
  const screen = document.getElementById('screen-onboarding');
  screen.classList.remove('hidden');

  screen.innerHTML = `
    <div class="onboard-screen">
      <div class="step-dots">
        ${[0,1,2,3].map(i => `<div class="step-dot ${i===0?'active':''}" id="dot-${i}"></div>`).join('')}
      </div>

      <!-- Step 0: Welcome -->
      <div class="onboard-step active" id="step-0">
        <div class="onboard-emoji">⭕</div>
        <div class="onboard-title">Welcome to Habit Wheel</div>
        <div class="onboard-sub">Track up to 10 daily habits on a beautiful circular wheel. Tap any day to log your progress.</div>
        <div class="onboard-actions">
          <button class="btn-primary" id="onboard-next-0">Get Started</button>
        </div>
      </div>

      <!-- Step 1: Add habits -->
      <div class="onboard-step" id="step-1">
        <div class="onboard-emoji">✅</div>
        <div class="onboard-title">Add Your Habits</div>
        <div class="onboard-sub">Start with at least one habit. You can add more later in Settings.</div>
        <div id="onboard-habit-list" style="margin-bottom:12px;"></div>
        <div class="add-habit-form" id="onboard-add-form">
          <input type="text" id="onboard-habit-name" placeholder="Habit name" maxlength="40">
          <div class="tod-selector" id="onboard-tod-selector">
            <button class="tod-btn active" data-tod="morning">☀️ Morning</button>
            <button class="tod-btn" data-tod="midday">🌤 Midday</button>
            <button class="tod-btn" data-tod="night">🌙 Night</button>
          </div>
          <button class="btn-secondary" id="onboard-add-habit-btn" style="margin-top:0">+ Add Habit</button>
        </div>
        <div class="onboard-actions" style="margin-top:16px">
          <button class="btn-primary" id="onboard-next-1" disabled>Continue</button>
        </div>
      </div>

      <!-- Step 2: Reminders -->
      <div class="onboard-step" id="step-2">
        <div class="onboard-emoji">🔔</div>
        <div class="onboard-title">Set Reminders</div>
        <div class="onboard-sub">Get notified to log your habits. You can set up to 3 daily reminders.</div>
        <div id="onboard-reminders">
          ${['morning', 'midday', 'night'].map(tod => `
            <div class="reminder-row">
              <span class="reminder-label">${tod.charAt(0).toUpperCase() + tod.slice(1)}</span>
              <input type="time" class="onboard-time" data-tod="${tod}"
                value="${tod==='morning'?'08:00':tod==='midday'?'12:30':'21:00'}">
              <div class="toggle-switch onboard-remind-toggle" data-tod="${tod}"></div>
            </div>`).join('')}
        </div>
        <div class="onboard-actions">
          <button class="btn-primary" id="onboard-next-2">Continue</button>
          <button class="btn-secondary" id="onboard-skip-2">Skip for now</button>
        </div>
      </div>

      <!-- Step 3: Theme -->
      <div class="onboard-step" id="step-3">
        <div class="onboard-emoji">🎨</div>
        <div class="onboard-title">Choose Your Theme</div>
        <div class="onboard-sub">Pick how the app looks. You can change this anytime in Settings.</div>
        <div style="display:flex;gap:12px;margin-bottom:24px;">
          <button class="btn-secondary" id="theme-btn-dark" style="flex:1;padding:20px;border-radius:12px;border:2px solid var(--green);">🌙 Dark</button>
          <button class="btn-secondary" id="theme-btn-light" style="flex:1;padding:20px;border-radius:12px;">☀️ Light</button>
        </div>
        <div class="onboard-actions">
          <button class="btn-primary" id="onboard-finish">Start Tracking</button>
        </div>
      </div>
    </div>`;

  setupOnboardListeners();
}

/** Wire all onboarding interactions */
function setupOnboardListeners() {
  // Step 0
  document.getElementById('onboard-next-0').addEventListener('click', () => goStep(1));

  // Step 1 — add habit form
  // selectedTod is scoped inside setupOnboardListeners, not at document/module level
  let selectedTod = 'morning';
  const todSelector = document.getElementById('onboard-tod-selector');
  todSelector.querySelectorAll('.tod-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      todSelector.querySelectorAll('.tod-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTod = btn.dataset.tod;
    });
  });

  document.getElementById('onboard-add-habit-btn').addEventListener('click', () => {
    const input = document.getElementById('onboard-habit-name');
    const name  = input.value.trim();
    if (!name || onboardHabits.length >= 10) return;
    onboardHabits.push({ id: uid(), name, timeOfDay: selectedTod, order: onboardHabits.length });
    input.value = '';
    renderOnboardHabitList();
    document.getElementById('onboard-next-1').disabled = false;
  });

  document.getElementById('onboard-next-1').addEventListener('click', () => goStep(2));

  // Step 2 — reminder toggles
  document.querySelectorAll('.onboard-remind-toggle').forEach(sw => {
    sw.addEventListener('click', () => sw.classList.toggle('on'));
  });

  document.getElementById('onboard-next-2').addEventListener('click', async () => {
    await saveOnboardReminders();
    goStep(3);
  });
  document.getElementById('onboard-skip-2').addEventListener('click', () => goStep(3));

  // Step 3 — theme
  document.getElementById('theme-btn-dark').addEventListener('click', () => {
    applyTheme('dark');
    document.getElementById('theme-btn-dark').style.borderColor = 'var(--green)';
    document.getElementById('theme-btn-light').style.borderColor = 'var(--border)';
  });
  document.getElementById('theme-btn-light').addEventListener('click', () => {
    applyTheme('light');
    document.getElementById('theme-btn-light').style.borderColor = 'var(--green)';
    document.getElementById('theme-btn-dark').style.borderColor = 'var(--border)';
  });

  document.getElementById('onboard-finish').addEventListener('click', finishOnboarding);
}

/** Render the list of habits added so far during onboarding */
function renderOnboardHabitList() {
  const el = document.getElementById('onboard-habit-list');
  el.innerHTML = onboardHabits.map(h => `
    <div class="habit-item">
      <span class="habit-item-name">${escapeHtml(h.name)}</span>
      <span class="habit-tag">${h.timeOfDay}</span>
    </div>`).join('');
}

/** Advance to onboarding step n */
function goStep(n) {
  document.querySelectorAll('.onboard-step').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.step-dot').forEach((d, i) => d.classList.toggle('active', i === n));
  document.getElementById(`step-${n}`).classList.add('active');
  onboardStep = n;
}

/** Save reminder prefs and request notification permission if any are enabled */
async function saveOnboardReminders() {
  const prefs = loadPrefs();
  prefs.reminders = {};
  document.querySelectorAll('.onboard-remind-toggle').forEach(sw => {
    const tod  = sw.dataset.tod;
    const time = document.querySelector(`.onboard-time[data-tod="${tod}"]`).value;
    prefs.reminders[tod] = { on: sw.classList.contains('on'), time };
  });
  savePrefs(prefs);

  if (Object.values(prefs.reminders).some(r => r.on)) {
    await requestNotificationPermission();
  }
}

/** Complete onboarding: save habits, theme, mark as done, show wheel */
async function finishOnboarding() {
  saveHabits(onboardHabits);

  const prefs = loadPrefs();
  prefs.theme = document.body.classList.contains('theme-light') ? 'light' : 'dark';
  savePrefs(prefs);

  localStorage.setItem('onboarded', 'true');

  await openDB();
  document.getElementById('screen-onboarding').classList.add('hidden');
  document.getElementById('bottom-nav').classList.remove('hidden');
  setupNavListeners();
  await checkMonthCloseOut();
  showScreen('wheel');
  scheduleReminders();
}
