/**
 * sw.js — Service worker for Save Dycson.
 *
 * A registered service worker with a fetch handler is one of the browser's
 * hard requirements for the "installable PWA" prompt (alongside a valid
 * manifest.json and HTTPS/localhost). This one does simple cache-first
 * offline support: core files are pre-cached on install, and any other
 * same-origin GET request gets cached opportunistically as it's fetched,
 * so a repeat visit (or a flaky connection) still loads the game.
 *
 * Bump CACHE_NAME whenever you ship a new version of the game files so
 * old caches get cleaned up and players pick up the update.
 */

const CACHE_NAME = 'save-dycson-v1';

// Only files we know exist are added eagerly; anything else (custom sprite/keyart/audio
// assets you may or may not have placed alongside index.html) is cached lazily on first
// fetch instead, via the fetch handler below — so a missing optional asset never breaks
// the whole install step.
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './data.js',
  './storage.js',
  './questions.js',
  './audio.js',
  './enemy.js',
  './narrative.js',
  './game.js',
  './logo.jpg',
  './logo.jpg',
  './logo-maskable.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // allSettled (not addAll) so one missing/renamed file doesn't fail the whole install
      return Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline and not cached: nothing more we can do
      // Cache-first: serve instantly from cache if we have it, still refresh in background.
      return cached || fetchPromise;
    })
  );
});
