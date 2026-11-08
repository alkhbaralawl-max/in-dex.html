const CACHE_NAME = "rukn-gold-shell-v3";
const SHELL = ["/", "/manifest.webmanifest", "/icons/app-icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith("rukn-gold-shell-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.includes("/functions/v1/")) return;

  const isShell = url.pathname === "/" || url.pathname === "/index.html" ||
    url.pathname === "/manifest.webmanifest" || url.pathname === "/icons/app-icon.svg";
  if (!isShell) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const key = url.pathname === "/index.html" ? "/" : url.pathname;
    const cached = await cache.match(key);
    const network = fetch(request).then(response => {
      if (response && response.ok && response.type === "basic") {
        cache.put(key, response.clone()).catch(() => undefined);
      }
      return response;
    }).catch(() => cached || Response.error());
    if (cached) {
      event.waitUntil(network.then(() => undefined).catch(() => undefined));
      return cached;
    }
    return network;
  })());
});