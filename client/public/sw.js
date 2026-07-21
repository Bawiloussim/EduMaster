// Minimal service worker — required for PWA installability.
// No caching/offline strategy on purpose: EduMaster's content depends on
// live API data, so we don't precache pages or intercept fetches here.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
