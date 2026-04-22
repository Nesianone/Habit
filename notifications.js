/** Request notification permission from the user. Returns true if granted. */
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Schedule daily reminders based on saved prefs.
 * Uses setTimeout to fire at the configured time on the current day.
 * Reminders only fire if the app is open (PWA v1 limitation — no background push server).
 * Re-registers each time the app opens.
 */
function scheduleReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const prefs  = loadPrefs();
  const remind = prefs.reminders || {};
  const habits = loadHabits();

  ['morning', 'midday', 'night'].forEach(tod => {
    const r = remind[tod];
    if (!r || !r.on) return;

    const [hh, mm] = r.time.split(':').map(Number);
    const now  = new Date();
    const fire = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
    if (fire <= now) return; // already passed today

    const delay     = fire - now;
    const todHabits = habits.filter(h => h.timeOfDay === tod).map(h => h.name);
    if (!todHabits.length) return;

    setTimeout(() => {
      new Notification('Habit Wheel', {
        body:  `Time to log your ${tod} habits: ${todHabits.join(', ')}`,
        icon:  'icons/icon-192.png',
        badge: 'icons/icon-192.png',
      });
    }, delay);
  });
}
