(() => {
  if (!("serviceWorker" in navigator) || location.protocol !== "https:") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .catch(error => console.warn("PWA offline shell registration failed", error));
  }, { once: true });
})();