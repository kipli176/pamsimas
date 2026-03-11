const CACHE_NAME = "pamsimas-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./css/login.css",
  "./css/dashboard.css",
  "./js/config.js",
  "./js/api.js",
  "./js/auth.js",
  "./js/main.js",
  "./js/dashboard.js",
  "./js/pelanggan.js",
  "./js/pencatatan.js",
  "./js/pembayaran.js",
  "./js/laporan.js",
  "./js/admin.js",
  "./js/pwa.js",
  "./assets/icons/icon-192.svg",
  "./assets/icons/icon-512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("./dashboard.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
