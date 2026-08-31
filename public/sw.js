// Minimal service worker: exists only to satisfy PWA installability checks
// (PWABuilder / Chrome install prompt). It deliberately does NOT cache
// anything — every request goes straight to the network, so the app can
// never serve stale HTML or chunks.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch handler (required by Chromium for install prompt).
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
