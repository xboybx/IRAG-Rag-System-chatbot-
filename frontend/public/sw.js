// Minimal Service Worker for IRAG PWA
// Offline is intentionally deferred - all requests pass through to Vercel/Render directly.

const CACHE_NAME = 'irag-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Pass-through fetch handler required by Chromium PWA install criteria
self.addEventListener('fetch', (event) => {
  // Let the browser handle all requests natively
  return;
});
