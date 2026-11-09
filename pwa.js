(() => {
  if (window.__RUKN_NATIVE_OTA__ || window.Capacitor?.isNativePlatform?.()) {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
        .catch(() => undefined);
    }
    return;
  }

  if (!( "serviceWorker" in navigator) || location.protocol !== "https:") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .catch(error => console.warn("PWA offline shell registration failed", error));
  }, { once: true });
})();
