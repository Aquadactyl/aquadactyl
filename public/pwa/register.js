(() => {
  if (!window.isSecureContext || !("serviceWorker" in navigator)) return;
  const options = document.currentScript?.dataset;
  const enabled = options?.pwaEnabled !== "false";
  const offline = enabled && options?.pwaOffline !== "false";
  if (!offline) {
    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const worker = registration.active || registration.waiting || registration.installing;
        if (!worker) continue;
        const url = new URL(worker.scriptURL);
        if (url.origin === window.location.origin && url.pathname === "/pwa/service-worker") await registration.unregister();
      }
      if ("caches" in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith("aquadactyl-offline-")).map((key) => window.caches.delete(key)));
      }
    })().catch(() => {});
  } else {
  // Failure to install must never prevent login or normal panel operation.
  navigator.serviceWorker.register("/pwa/service-worker", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }
  let prompt;
  const buttons = () => document.querySelectorAll("[data-pwa-install]");
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    if (!enabled) return;
    prompt = event;
    buttons().forEach((button) => { button.hidden = false; });
  });
  window.addEventListener("appinstalled", () => {
    prompt = undefined;
    buttons().forEach((button) => { button.hidden = true; });
  });
  document.addEventListener("click", async (event) => {
    const button = event.target.closest?.("[data-pwa-install]");
    if (!button || !prompt || button.disabled) return;
    const install = prompt;
    prompt = undefined;
    button.disabled = true;
    try {
      await install.prompt();
    } catch {
      // The browser can withdraw or dismiss an installation prompt.
    } finally {
      buttons().forEach((item) => { item.hidden = true; item.disabled = false; });
    }
  });
})();
