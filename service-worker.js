const CACHE = "ple-v21";

// Manual bump per deploy (you deploy from your working copy, not git). Always
// raise CACHE before deploying so browsers pick up a changed service worker.
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
let lastUpdateCheck = 0;

// NOTE: cache.addAll() is all-or-nothing — every path below MUST exist on the
// server or the whole precache silently fails (only a warning is logged).
const PRECACHE = [
  "/",
  "/index.html",
  "/settings.html",
  "/selector.html",
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
  "/images/favicon-32.png",
  "/images/noimage.svg",
  "/images/dashboard.jpg",
  "/manifest.json",
  // Gaeilge pack assets — cached so an installed Gaeilge app works offline.
  "/manifests/gaeilge.manifest.json",
  "/images/icons/gaeilge/gaeilge-32x32.png",
  "/images/icons/gaeilge/gaeilge-72x72.png",
  "/images/icons/gaeilge/gaeilge-96x96.png",
  "/images/icons/gaeilge/gaeilge-180x180.png",
  "/images/icons/gaeilge/gaeilge-192x192.png",
  "/images/icons/gaeilge/gaeilge-384x384.png",
  "/images/icons/gaeilge/gaeilge-512x512.png",
];

// Brand used for notifications until the page tells us which brand is active.
// Pages post {type:"set-brand", icon, badge} after load.
const DEFAULT_BRAND = {
  icon: "/images/favicon.png",
  badge: "/images/favicon.png",
};

async function readBrand() {
  try {
    const resp = await caches.match("/__handi-brand__");
    if (!resp) return DEFAULT_BRAND;
    const data = await resp.json();
    return {
      icon: data.icon || DEFAULT_BRAND.icon,
      badge: data.badge || DEFAULT_BRAND.badge,
    };
  } catch (_) {
    return DEFAULT_BRAND;
  }
}

function storeBrand(icon, badge) {
  const clean = (u) =>
    typeof u === "string" &&
    (u.indexOf("/") === 0 || /^https?:\/\//i.test(u))
      ? u
      : DEFAULT_BRAND.icon;
  return caches.open(CACHE).then((cache) =>
    cache.put(
      "/__handi-brand__",
      new Response(
        JSON.stringify({ icon: clean(icon), badge: clean(badge) }),
        { headers: { "Content-Type": "application/json" } },
      ),
    ),
  );
}

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

// Activate — clean old caches, take control. When this activation replaced a
// previous version (i.e. a real deploy), tell every open tab to reload so they
// stop running the old code. A first install has no previous caches, so it
// does not reload anything.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => {
        const hadPrevious = keys.some((key) => key !== CACHE);
        return Promise.all(
          keys
            .filter((key) => key !== CACHE)
            .map((key) => caches.delete(key)),
        ).then(() => ({ hadPrevious }));
      })
      .then(({ hadPrevious }) => self.clients.claim().then(() => hadPrevious))
      .then((hadPrevious) => {
        if (!hadPrevious) return;
        return self.clients
          .matchAll({ type: "window" })
          .then((clients) =>
            clients.forEach((c) => c.postMessage({ type: "update" })),
          );
      }),
  );
});

// Fetch — HTML pages and code are network-first so fresh deploys reach
// online clients immediately; the cache only serves as an offline fallback.
// Everything else (images, fonts, manifest) is cache-first, then network.
//
// Pages are cached under their full request URL, so each handi-pack (which is
// a distinct ?handi-pack=...&id=... URL) is cached separately: an offline
// Gaeilge pack user still gets their Gaeilge page, not another pack's.
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
    // Look for a newer service worker at most once per UPDATE_INTERVAL.
    scheduleUpdateCheck();
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
          offlinePage(e.request).then((cached) => {
            if (cached) return cached;
            // Truly first-ever visit with no network — minimal notice.
            return new Response(
              "<html><body style='display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;font-size:1.25rem;color:#64748b;text-align:center;padding:0 16px;'>You're offline. Please reconnect and try again.</body></html>",
              { headers: { "Content-Type": "text/html; charset=utf-8" } },
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

// Offline page strategy: exact URL first (keeps per-pack pages correct), then
// the last cached copy of the app itself (default "/" or "/index.html").
async function offlinePage(request) {
  const exact = await caches.match(request);
  if (exact) return exact;
  const home = (await caches.match("/")) || (await caches.match("/index.html"));
  return home || null;
}

// Throttled check for a newer service worker (manual CACHE bumps = deploy).
function scheduleUpdateCheck() {
  const now = Date.now();
  if (now - lastUpdateCheck < UPDATE_INTERVAL) return;
  lastUpdateCheck = now;
  self.registration.update().catch(() => {});
}

// Push notifications — wake up and show alert (uses the active brand icon)
self.addEventListener("push", (e) => {
  let data = { title: "Handi Homepage", body: "New notification" };
  try {
    if (e.data) data = e.data.json();
  } catch (_) {}

  e.waitUntil(
    readBrand().then((brand) =>
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: brand.icon,
        badge: brand.badge,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: { url: "/" },
      }),
    ),
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

// Listen for messages from the page
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "set-brand") {
    storeBrand(e.data.icon, e.data.badge);
    return;
  }
  if (e.data === "check-update") scheduleUpdateCheck();
});
