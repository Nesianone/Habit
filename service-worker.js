const CACHE = 'habit-wheel-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/db.js',
  '/wheel.js',
  '/dashboard.js',
  '/settings.js',
  '/notifications.js',
  '/onboarding.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

/** Cache all static assets on install */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

/** Remove old caches on activate */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/** Cache-first: serve from cache, fall back to network */
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
