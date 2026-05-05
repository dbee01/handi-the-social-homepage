const CACHE = "ple-v1";

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll([
        "/",
        "/index.html",
        "/app.js",
        "/styles/main.css"
      ]);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});