const CACHE = "ple-v19";

// Check for updates every 24 hours
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
let lastUpdateCheck = 0;
const PRECACHE = [
  "/",
  "/index.html",
  "/settings.html",
  "/selector.html",
  "/docs.html",
  "/app.js",
  "/css/base.css",
  "/css/layout.css",
  "/css/theme.css",
  "/css/elderly.css",
  "/css/main.css",
  "/css/settings.css",
  "/css/site-pack.css",
  "/css/webrtc-widget.css",
  "/css/vendor/fa-7.2.0/css/all.min.css",
  "/js/core/module-registry.js",
  "/js/core/log.js",
  "/js/core/load.js",
  "/js/core/module-buttons.js",
  "/js/core/settings.js",
  "/js/core/handi-pack.js",
  "/js/core/storage.js",
  "/js/core/layout.js",
  "/js/core/footer-controls.js",
  "/js/core/first-popup.js",
  "/js/core/weather.js",
  "/js/core/message.js",
  "/js/core/admin-check.js",
  "/js/core/main-integration.js",
  "/js/core/theme-switcher.js",
  "/js/vendor/packery.pkgd.min.js",
  "/js/vendor/Sortable.min.js",
  "/js/vendor/rrule.min.js",
  "/js/vendor/matrix-js-sdk.bundle.js",
  "/js/vendor/transformers/transformers.js",
  "/js/vendor/transformers/ort.bundle.min.mjs",
  "/js/vendor/transformers/onnxruntime-web/ort-wasm-simd-threaded.wasm",
  "/images/favicon.png",
  "/images/favicon.ico",
  "/images/dashboard.jpg",
  "/manifest.json",
];

// Install — pre-cache all static assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(PRECACHE).catch((err) => {
        console.warn("[SW] Pre-cache failed for some assets:", err);
      });
    }),
  );
  self.skipWaiting();
});

// Activate — clean old caches, take control. (No "update" broadcast here:
// that would auto-reload every open tab on every SW activation. Update
// detection only happens via checkForUpdates(), which is content-based.)
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch — HTML pages and code are network-first so fresh deploys reach
// online clients immediately; the cache only serves as an offline fallback.
// Everything else (images, fonts, manifest) is cache-first, then network.
// HTML being cache-first is what left devices stuck on a stale — or blank —
// snapshot of the page: the cached copy was served forever and only replaced
// when the 24h checkForUpdates() happened to detect a change.
self.addEventListener("fetch", (e) => {
  // Skip non-GET requests and chrome-extension
  if (e.request.method !== "GET") return;
  if (e.request.url.startsWith("chrome-extension://")) return;

  // Skip API calls — let them go to network
  if (e.request.url.includes("/api/")) return;

  // Skip WebRTC / Infobip calls
  if (e.request.url.includes("rtc.cdn.infobip.com")) return;

  const isCode =
    e.request.destination === "script" ||
    e.request.destination === "style" ||
    e.request.url.endsWith(".js") ||
    e.request.url.endsWith(".css");

  // Page loads (and anything the browser wants as HTML)
  const isPage =
    e.request.mode === "navigate" ||
    (e.request.headers.get("accept") || "").includes("text/html");

  if (isPage) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE).then((cache) => {
            cache.put(e.request, clone);
          });
          return response;
        })
        .catch(() =>
          caches.match(e.request).then((cached) => {
            if (cached) return cached;
            // User is offline — show fallback for HTML pages
            return new Response(
              "<html><body style='display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;font-size:1.5rem;color:#64748b;'>📡 You're offline</body></html>",
              { headers: { "Content-Type": "text/html" } },
            );
          }),
        ),
    );
    return;
  }

  if (isCode) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE).then((cache) => {
            cache.put(e.request, clone);
          });
          return response;
        })
        .catch(() =>
          caches
            .match(e.request)
            .then((cached) => cached || new Response("", { status: 408 })),
        ),
    );
    return;
  }

  // Images, fonts, manifest, etc. — cache-first, then network
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE).then((cache) => {
            cache.put(e.request, clone);
          });
          return response;
        })
        .catch(() => new Response("", { status: 408 }));
    }),
  );
});

// Push notifications — wake up and show alert
self.addEventListener("push", (e) => {
  let data = { title: "Handi Homepage", body: "New notification" };
  try {
    if (e.data) data = e.data.json();
  } catch (_) {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/images/favicon.png",
      badge: "/images/favicon.png",
      vibrate: [200, 100, 200],
      requireInteraction: true,
      data: { url: "/" },
    }),
  );
});

// Notification click — open the app
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        clients.openWindow(e.notification.data?.url || "/");
      }
    }),
  );
});

// Check for updates — fetch index.html from network, reload if changed
async function checkForUpdates() {
  const now = Date.now();
  if (now - lastUpdateCheck < UPDATE_INTERVAL) return;
  lastUpdateCheck = now;

  try {
    const resp = await fetch("/index.html", { cache: "no-store" });
    if (!resp.ok) return;
    const newText = await resp.text();
    const cached = await caches.match("/index.html");
    if (!cached) return;
    const oldText = await cached.text();
    if (newText !== oldText) {
      // New version detected — clear cache and reload all clients
      await caches.delete(CACHE);
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.postMessage({ type: "update" }));
    }
  } catch (_) {
    // Offline — ignore
  }
}

// Listen for messages from the page
self.addEventListener("message", (e) => {
  if (e.data === "check-update") checkForUpdates();
});
