(() => {
  const isNativeApp =
    window.location.hostname === "localhost" &&
    (window.Capacitor?.isNativePlatform?.() === true || !!window.Capacitor);

  if (!isNativeApp) return;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
      .catch(() => undefined);
  }

  // A previously cached PWA shell may still be the first page shown after the migration APK.
  // In that case, load the updater from the newly installed native assets explicitly.
  if (!window.__RUKN_NATIVE_OTA__ && !document.getElementById("rukn-ota-runtime-loader")) {
    const config = document.createElement("script");
    config.id = "rukn-ota-runtime-loader";
    config.src = "/ota-config.js";
    config.onload = () => {
      const runtime = document.createElement("script");
      runtime.src = "/ota.js";
      document.head.appendChild(runtime);
    };
    document.head.appendChild(config);
  }
})();