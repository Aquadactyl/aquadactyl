/* Only public, account-independent offline pages enter this cache. */
const OFFLINE = ["en", "fr", "de"].map((lang) => "/pwa/offline?lang=" + lang);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      for (const url of OFFLINE) {
        const response = await fetch(url, {
          credentials: "omit",
          cache: "no-store",
          redirect: "error",
        });
        if (!response.ok) throw new Error("Offline page unavailable");
        await cache.put(url, response);
      }
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter(
            (key) => key.startsWith("aquadactyl-offline-") && key !== CACHE,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // API requests, mutations, downloads, and cross-origin resources go directly to the network.
  if (
    request.method !== "GET" ||
    request.mode !== "navigate" ||
    url.origin !== self.location.origin ||
    /^\/(?:api|pwa)(?:\/|$)/.test(url.pathname)
  )
    return;
  event.respondWith(
    fetch(request, { cache: "no-store" }).catch(async () => {
      const language = self.navigator.language.split("-")[0];
      const locale = ["fr", "de"].includes(language) ? language : "en";
      const cache = await caches.open(CACHE);
      return cache.match("/pwa/offline?lang=" + locale);
    }),
  );
});
