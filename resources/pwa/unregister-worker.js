/* Retire this panel's previous offline worker without touching addon caches. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("aquadactyl-offline-"))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
      await self.registration.unregister();
    })(),
  );
});
