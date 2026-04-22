/** Generate a simple unique ID */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Render the full settings screen */
function renderSettingsScreen() {
  const screen = document.getElementById('screen-settings');
  screen.innerHTML = `
    <div class="settings-title">Settings</div>
    <div class="settings-section" id="settings-habits">
      <div class="section-label">Habits</div>
      <div id="habit-list"></div>
      <div id="add-habit-area">
        <button class="btn-secondary" id="show-add-habit-btn" style="margin-top:10px">+ Add Habit</button>
      </div>
    </div>
    <div class="settings-section" id="settings-reminders">
      <div class="section-label">Reminders</div>
      <div id="reminders-list"></div>
    </div>
    <div class="settings-section" id="settings-appearance">
      <div class="section-label">Appearance</div>
      <div class="theme-toggle-row">
        <span>Theme</span>
        <div id="theme-toggle" class="toggle-switch ${loadPrefs().theme === 'light' ? 'on' : ''}"></div>
      </div>
    </div>
    <div class="settings-section" id="settings-notes">
      <div class="section-label">Monthly Notes — ${state.activeMonth}</div>
      <div class="section-label" style="margin-top:8px">Observations</div>
      <textarea id="observations-input" placeholder="How did this month go?"></textarea>
      <div class="section-label">Key Goals</div>
      <div id="goals-inputs"></div>
    </div>
    <div class="settings-section">
      <div class="section-label">Data</div>
      <div class="export-row">
        <button class="export-btn" id="export-json-btn">⬇ Export JSON</button>
        <button class="export-btn" id="export-csv-btn">⬇ Export CSV</button>
      </div>
    </div>
  `;

  renderHabitList();
  renderReminders();
  setupThemeToggle();
  loadMonthNotes();
  setupExportButtons();
}

/** Render the habit list inside #habit-list */
function renderHabitList() {
  const habits = loadHabits();
  const list = document.getElementById('habit-list');
  const MAX = 10;

  list.innerHTML = habits.map((h, i) => `
    <div class="habit-item" draggable="true" data-id="${h.id}" data-index="${i}">
      <span class="drag-handle">⠿</span>
      <span class="habit-item-name">${escapeHtml(h.name)}</span>
      <span class="habit-tag">${h.timeOfDay}</span>
      <button class="icon-btn" data-action="edit" data-id="${h.id}">✏️</button>
      <button class="icon-btn" data-action="delete" data-id="${h.id}">🗑️</button>
    </div>`).join('');

  const addBtn = document.getElementById('show-add-habit-btn');
  if (addBtn) {
    addBtn.style.display = habits.length >= MAX ? 'none' : '';
    addBtn.onclick = showAddHabitForm;
  }

  attachHabitListListeners();
  setupDragReorder();
}

/** Wire up edit and delete buttons on each habit row */
function attachHabitListListeners() {
  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const habits = loadHabits().filter(h => h.id !== btn.dataset.id);
      saveHabits(habits);
      renderHabitList();
      renderWheelScreen();
    });
  });

  document.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => showEditHabitForm(btn.dataset.id));
  });
}

/** Show inline form to add a new habit */
function showAddHabitForm() {
  const area = document.getElementById('add-habit-area');
  area.innerHTML = `
    <div class="add-habit-form">
      <input type="text" id="new-habit-name" placeholder="Habit name" maxlength="40">
      <div class="tod-selector">
        <button class="tod-btn active" data-tod="morning">☀️ Morning</button>
        <button class="tod-btn" data-tod="midday">🌤 Midday</button>
        <button class="tod-btn" data-tod="night">🌙 Night</button>
      </div>
      <button class="btn-primary" id="save-new-habit-btn">Add Habit</button>
      <button class="btn-secondary" id="cancel-new-habit-btn" style="margin-top:8px">Cancel</button>
    </div>`;

  let selectedTod = 'morning';
  area.querySelectorAll('.tod-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      area.querySelectorAll('.tod-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTod = btn.dataset.tod;
    });
  });

  document.getElementById('save-new-habit-btn').addEventListener('click', () => {
    const name = document.getElementById('new-habit-name').value.trim();
    if (!name) return;
    const habits = loadHabits();
    if (habits.length >= 10) return;
    habits.push({ id: uid(), name, timeOfDay: selectedTod, order: habits.length });
    saveHabits(habits);
    renderSettingsScreen();
    renderWheelScreen();
  });

  document.getElementById('cancel-new-habit-btn').addEventListener('click', renderSettingsScreen);
}

/** Show inline form to edit an existing habit */
function showEditHabitForm(habitId) {
  const habits = loadHabits();
  const habit  = habits.find(h => h.id === habitId);
  if (!habit) return;
  const area = document.getElementById('add-habit-area');
  area.innerHTML = `
    <div class="add-habit-form">
      <input type="text" id="edit-habit-name" value="${escapeHtml(habit.name)}" maxlength="40">
      <div class="tod-selector">
        ${['morning','midday','night'].map(tod =>
          `<button class="tod-btn ${habit.timeOfDay === tod ? 'active' : ''}" data-tod="${tod}">
            ${tod === 'morning' ? '☀️ Morning' : tod === 'midday' ? '🌤 Midday' : '🌙 Night'}
          </button>`).join('')}
      </div>
      <button class="btn-primary" id="save-edit-habit-btn">Save</button>
      <button class="btn-secondary" id="cancel-edit-btn" style="margin-top:8px">Cancel</button>
    </div>`;

  let selectedTod = habit.timeOfDay;
  area.querySelectorAll('.tod-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      area.querySelectorAll('.tod-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTod = btn.dataset.tod;
    });
  });

  document.getElementById('save-edit-habit-btn').addEventListener('click', () => {
    const name = document.getElementById('edit-habit-name').value.trim();
    if (!name) return;
    const updated = habits.map(h => h.id === habitId ? { ...h, name, timeOfDay: selectedTod } : h);
    saveHabits(updated);
    renderSettingsScreen();
    renderWheelScreen();
  });

  document.getElementById('cancel-edit-btn').addEventListener('click', renderSettingsScreen);
}

/** HTML5 drag-and-drop reorder for the habit list */
function setupDragReorder() {
  const list = document.getElementById('habit-list');
  let dragSrc = null;

  list.querySelectorAll('.habit-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      dragSrc = item;
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    item.addEventListener('drop', e => {
      e.preventDefault();
      if (dragSrc === item) return;
      const habits  = loadHabits();
      const srcIdx  = parseInt(dragSrc.dataset.index);
      const destIdx = parseInt(item.dataset.index);
      const [moved] = habits.splice(srcIdx, 1);
      habits.splice(destIdx, 0, moved);
      habits.forEach((h, i) => { h.order = i; });
      saveHabits(habits);
      renderHabitList();
      renderWheelScreen();
    });
  });
}

/** Render the reminder toggles and time pickers (one per time-of-day group) */
function renderReminders() {
  const prefs  = loadPrefs();
  const remind = prefs.reminders || {};
  const list   = document.getElementById('reminders-list');
  if (!list) return;

  list.innerHTML = ['morning', 'midday', 'night'].map(tod => {
    const r = remind[tod] || { on: false, time: tod === 'morning' ? '08:00' : tod === 'midday' ? '12:30' : '21:00' };
    return `<div class="reminder-row" data-tod="${tod}">
      <span class="reminder-label">${tod.charAt(0).toUpperCase() + tod.slice(1)}</span>
      <input type="time" class="reminder-time-input" value="${r.time}" data-tod="${tod}">
      <div class="toggle-switch reminder-toggle ${r.on ? 'on' : ''}" data-tod="${tod}"></div>
    </div>`;
  }).join('');

  document.querySelectorAll('.reminder-toggle').forEach(sw => {
    sw.addEventListener('click', () => {
      sw.classList.toggle('on');
      const tod  = sw.dataset.tod;
      const time = document.querySelector(`.reminder-time-input[data-tod="${tod}"]`).value;
      saveReminderPref(tod, sw.classList.contains('on'), time);
    });
  });

  document.querySelectorAll('.reminder-time-input').forEach(input => {
    input.addEventListener('change', () => {
      const tod = input.dataset.tod;
      const sw  = document.querySelector(`.reminder-toggle[data-tod="${tod}"]`);
      saveReminderPref(tod, sw.classList.contains('on'), input.value);
    });
  });
}

/** Persist a reminder preference and reschedule notifications */
function saveReminderPref(tod, on, time) {
  const prefs = loadPrefs();
  if (!prefs.reminders) prefs.reminders = {};
  prefs.reminders[tod] = { on, time };
  savePrefs(prefs);
  if (typeof scheduleReminders === 'function') scheduleReminders();
}

/** Wire the theme toggle switch in settings */
function setupThemeToggle() {
  const sw = document.getElementById('theme-toggle');
  if (!sw) return;
  sw.addEventListener('click', () => {
    sw.classList.toggle('on');
    const theme = sw.classList.contains('on') ? 'light' : 'dark';
    const prefs = loadPrefs();
    prefs.theme = theme;
    savePrefs(prefs);
    applyTheme(theme);
  });
}

/** Load and wire up the observations textarea and goal inputs for the active month */
async function loadMonthNotes() {
  const data  = await getMonth(state.activeMonth) || { observations: '', goals: ['', '', ''] };
  const obsEl = document.getElementById('observations-input');
  if (obsEl) {
    obsEl.value = data.observations || '';
    obsEl.addEventListener('input', debounce(async () => {
      const current = await getMonth(state.activeMonth) || { id: state.activeMonth, goals: ['', '', ''] };
      current.id = state.activeMonth;
      current.observations = obsEl.value;
      await saveMonth(current);
    }, 600));
  }

  const goalsEl = document.getElementById('goals-inputs');
  if (goalsEl) {
    const goals = data.goals || ['', '', ''];
    goalsEl.innerHTML = goals.map((g, i) => `
      <div class="goals-input">
        <span style="color:var(--text-muted);font-size:13px;">${i + 1}.</span>
        <input type="text" class="goal-input" data-idx="${i}" value="${escapeHtml(g)}" placeholder="Goal ${i + 1}" maxlength="80">
      </div>`).join('');

    goalsEl.querySelectorAll('.goal-input').forEach(input => {
      input.addEventListener('input', debounce(async () => {
        const current = await getMonth(state.activeMonth) || { id: state.activeMonth, observations: '' };
        current.id = state.activeMonth;
        current.goals = Array.from(goalsEl.querySelectorAll('.goal-input')).map(el => el.value);
        await saveMonth(current);
      }, 600));
    });
  }
}

/** Simple debounce: delays fn by ms after last call */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** Wire the JSON and CSV export buttons */
function setupExportButtons() {
  document.getElementById('export-json-btn')?.addEventListener('click', exportJSON);
  document.getElementById('export-csv-btn')?.addEventListener('click', exportCSV);
}

/** Export all data as a JSON file */
async function exportJSON() {
  const habits = loadHabits();
  const logs   = await getAllLogs();
  const months = await getAllMonths();
  const blob = new Blob([JSON.stringify({ habits, logs, months }, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `habit-wheel-export-${currentYearMonth()}.json`);
}

/** Export all logs as a CSV file */
async function exportCSV() {
  const habits = loadHabits();
  const logs   = await getAllLogs();
  const rows   = [['date', 'habit', 'timeOfDay', 'status']];
  logs.forEach(l => {
    const h = habits.find(h => h.id === l.habitId);
    if (h) rows.push([l.date, h.name, h.timeOfDay, l.status || '']);
  });
  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  triggerDownload(blob, `habit-wheel-export-${currentYearMonth()}.csv`);
}

/** Trigger a browser file download */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
