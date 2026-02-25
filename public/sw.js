// Minimal service worker for PWA install prompt support.
// Chrome requires a service worker to fire the beforeinstallprompt event.
// This is a no-op worker — it doesn't cache anything or intercept requests.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Pass through — don't intercept any requests
});
