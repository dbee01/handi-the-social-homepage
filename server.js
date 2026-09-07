/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// index.js - Infomaniak Production Ready
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const https = require("https");

const gtfsrt = require("./proto/gtfs-rt.js");
const gtfsServer = require("./js/core/gtfs-server.js");

// Simple .env loader (avoids dotenv compatibility issues)
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 1) continue;
      let key = trimmed.substring(0, eqIdx).trim();
      let val = trimmed.substring(eqIdx + 1).trim();
      // Strip surrounding quotes
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
    console.log("   → Loaded .env file");
  }
} catch (e) {
  console.warn("   ⚠️ Could not load .env:", e.message);
}

// -----------------------------------------------------------------------------
// FEED RELAY FLAG – when ON (default), feeds that fail directly or are
// IP-blocked (e.g. rte.ie 403s) are retried through the proxy/relay list in
// fetchFeedWithRelay() below. Set to false, or FEED_RELAY_ENABLED=false in
// .env, to always fetch feeds directly from this server's IP.
// -----------------------------------------------------------------------------
const FEED_RELAY_ENABLED = process.env.FEED_RELAY_ENABLED !== "true";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Serve favicon
app.get("/favicon.ico", (req, res) =>
  res.sendFile(path.join(__dirname, "images", "favicon.ico")),
);

// GTFS-RT endpoint URLs (no format param = native protobuf binary)
const REALTIME_URL = "https://api.nationaltransport.ie/gtfsr/v2/TripUpdates";
const VEHICLES_URL = "https://api.nationaltransport.ie/gtfsr/v2/Vehicles";
const API_KEY = process.env.BUS_API_KEY || "";

// -----------------------------------------------------------------------------
// STOP INFO (name + direction)
// -----------------------------------------------------------------------------
const stopInfo = {
  // Route 223 stops (Cork)
  // 8380B246051 = eastbound (Haulbowline), 8380B2420801 = westbound (City Centre / South Mall)
  "8380B246051": { name: "Rochestown Rise", direction: "City Centre" },
  "8380B2420801": { name: "Rochestown Rise", direction: "City Centre" },
  "8370B2420501": { name: "South Mall", direction: "Rochestown" },
  // Route 19 / E1 stops (Dublin Bus)
  "8220DB000092": { name: "Ballymun Library", direction: "Northwood" },
  // Route 202 stops (Cork)
  "8370B248621": { name: "Merchants Quay", direction: "Knocknaheeny" },
  "8370B2365901": { name: "Knocknaheeny Ave", direction: "City" },
  // Map short-form IDs to long-form
  242081: {
    name: "Rochestown Rise",
    direction: "City Centre",
    longId: "8380B2420801",
  },
  242051: {
    name: "South Mall",
    direction: "Rochestown",
    longId: "8370B2420501",
  },
};

// -----------------------------------------------------------------------------
// GENERIC SCHEDULE (GTFS FALLBACK)
// -----------------------------------------------------------------------------
// Returns scheduled times from the GTFS Bus Éireann timetable
async function getGenericSchedule(routeId, stopId, direction) {
  return gtfsServer.getScheduledDepartures(routeId, stopId);
}

// -----------------------------------------------------------------------------
// CACHE
// -----------------------------------------------------------------------------
let cachedData = null;
let lastFetch = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

// -----------------------------------------------------------------------------
// Static frontend
const publicPath = path.join(__dirname, "public");
const staticPath = fs.existsSync(publicPath) ? publicPath : __dirname;
// Block sensitive files from static serving
app.use("/log.txt", (req, res) => res.status(404).send());
app.use("/.env", (req, res) => res.status(404).send());
app.use("/.env.example", (req, res) => res.status(404).send());

// Always revalidate the service worker so cache/version changes are picked up
// promptly (browsers may otherwise serve a stale service-worker.js for 24h).
app.get("/service-worker.js", (req, res) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(path.join(staticPath, "service-worker.js"));
});

// index:false — let the app.get("/") route below handle / so it can inject
// pack-specific social-graph tags; static middleware must not serve index.html.
app.use(express.static(staticPath, { index: false }));

// -----------------------------------------------------------------------------
// SOCIAL GRAPH (Open Graph / Twitter) for handi-pack links
// Share-preview crawlers don't execute the client-side pack import in
// index.html, so pack-specific meta tags must already be in the served HTML.
// The pack link query params map to:
//   handi-pack → og:title, description → og:description, logo → og:image.
// Without pack params the static defaults baked into index.html are kept.
// Values are HTML-escaped before injection (they are user-supplied).
// -----------------------------------------------------------------------------
function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Swap the content= of one meta tag. index.html keeps a fixed token layout:
//   <meta … attr="name" … content="…" … />  (whitespace/newlines flexible)
function setMetaContent(html, attr, name, value) {
  const re = new RegExp(
    '<meta\\s+' + attr + '="' + name + '"\\s+content="[^"]*"\\s*/?>',
  );
  if (!re.test(html)) return html;
  const escaped = escapeHtmlAttr(value);
  return html.replace(
    re,
    '<meta ' + attr + '="' + name + '" content="' + escaped + '" />',
  );
}

// Absolute URL of the current request (honours a TLS-terminating proxy).
function fullRequestUrl(req) {
  const proto =
    String(req.headers["x-forwarded-proto"] || "")
      .split(",")[0]
      .trim() || req.protocol || "https";
  const host = req.get("host") || "";
  return proto + "://" + host + req.originalUrl;
}

// Origin (scheme + host) of the current request.
function requestOrigin(req) {
  const proto =
    String(req.headers["x-forwarded-proto"] || "")
      .split(",")[0]
      .trim() || req.protocol || "https";
  const host = req.get("host") || "";
  return proto + "://" + host;
}

const OG_DEFAULT_DESC =
  "Your personal Handi homepage — your favourite news, radio, podcasts, weather and more.";

// Swap the href= of the canonical <link> tag (kept as a single line in
// index.html).
function setCanonicalHref(html, url) {
  const re = /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/;
  if (!re.test(html)) return html;
  return html.replace(
    re,
    '<link rel="canonical" href="' + escapeHtmlAttr(url) + '" />',
  );
}

// Rebuild the single application/ld+json block with the given fields.
function setJsonLd(html, data) {
  const re = /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/;
  if (!re.test(html)) return html;
  const obj = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.name,
    description: data.description,
    url: data.url,
  };
  const block =
    '<script type="application/ld+json">\n' +
    JSON.stringify(obj, null, 2) +
    "\n</script>";
  return html.replace(re, block);
}

// index.html is static for the life of the process — read it once and reuse.
let cachedIndexHtml = null;

app.get("/", (req, res) => {
  const indexPath = path.join(staticPath, "index.html");
  if (!fs.existsSync(indexPath)) {
    return res.json({
      message: "API running",
      endpoints: ["/api/bus-realtime", "/api/news"],
    });
  }
  if (cachedIndexHtml === null) {
    cachedIndexHtml = fs.readFileSync(indexPath, "utf8");
  }

  let html = cachedIndexHtml;
  const packTitle = req.query["handi-pack"];
  const packDesc = req.query.description;
  const packLogo = req.query.logo;
  const hasPack =
    (packTitle && String(packTitle).trim()) ||
    (packDesc && String(packDesc).trim()) ||
    (packLogo && /^https?:\/\//i.test(String(packLogo)));

  if (hasPack) {
    if (packTitle && String(packTitle).trim()) {
      html = setMetaContent(html, "property", "og:title", String(packTitle).trim());
    }
    if (packDesc && String(packDesc).trim()) {
      html = setMetaContent(
        html,
        "property",
        "og:description",
        String(packDesc).trim(),
      );
    }
    if (packLogo && /^https?:\/\//i.test(String(packLogo))) {
      html = setMetaContent(html, "property", "og:image", String(packLogo).trim());
      html = setMetaContent(html, "name", "twitter:image", String(packLogo).trim());
    }
  }
  // og:url should point at the exact page being shared/crawled.
  const shareUrl = fullRequestUrl(req);
  const originUrl = requestOrigin(req);
  html = setMetaContent(html, "property", "og:url", shareUrl);

  // Canonical is always the host root — pack links share the same app, so
  // the search-engine identity stays on one URL regardless of query params.
  html = setCanonicalHref(html, originUrl);

  // og:image:alt — describe the pack when one is being shared.
  const packTitleStr = packTitle ? String(packTitle).trim() : "";
  html = setMetaContent(
    html,
    "property",
    "og:image:alt",
    packTitleStr ? packTitleStr : "Handi Homepage logo",
  );

  // Meta description (the snippet search engines show).
  const descStr =
    packDesc && String(packDesc).trim()
      ? String(packDesc).trim()
      : OG_DEFAULT_DESC;
  html = setMetaContent(html, "name", "description", descStr);
  html = setMetaContent(html, "property", "og:description", descStr);

  // Structured data for rich results.
  html = setJsonLd(html, {
    name: packTitleStr
      ? packTitleStr
      : "HandiHomepage – Senior Dashboard",
    description: descStr,
    url: originUrl,
  });

  // JS-rendering crawlers must not be bounced to /selector.html or to a
  // clean URL before they read the meta tags: flag them so the client-side
  // redirects can skip themselves.
  const ua = req.headers["user-agent"] || "";
  const isCrawler =
    /bot|crawl|spider|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|slackbot|discordbot|pinterest|embedly|quora|outbrain|vkshare|headless|python-requests|curl|wget/i.test(
      ua,
    );
  if (isCrawler) {
    html = html.replace(
      "</head>",
      "<script>window.HANDI_BOT=1;</script></head>",
    );
  }

  res.type("html").send(html);
});

// -----------------------------------------------------------------------------
// LOGGING
// -----------------------------------------------------------------------------
const LOG_FILE = path.join(__dirname, "log.txt");
const LOG_USER = process.env.LOG_USERNAME || "admin";
const LOG_PASS = process.env.LOG_PASSWORD || "handi";
// Sensible log-size cap: once the file exceeds LOG_MAX_BYTES it is trimmed to
// the most recent LOG_KEEP_BYTES (aligned to a line boundary). Override the
// cap per host via LOG_MAX_BYTES (bytes) in .env.
const LOG_MAX_BYTES = parseInt(process.env.LOG_MAX_BYTES, 10) || 5 * 1024 * 1024; // 5 MB
const LOG_KEEP_BYTES = parseInt(process.env.LOG_KEEP_BYTES, 10) || 256 * 1024; // keep last 256 KB when trimming
// Only events with level <= LOG_LEVEL are persisted. Level 2 is the current
// default (page loads, errors + all activity); level 1 keeps only important
// events and errors; level 0 disables client event logging entirely. Set
// LOG_LEVEL=1 (or 0) in the production .env for the lightest logging.
const LOG_LEVEL = (() => {
  const v = parseInt(process.env.LOG_LEVEL, 10);
  return Number.isNaN(v) ? 2 : v;
})();

// Ensure log file exists
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, "", "utf8");
}

// Trim the log to its most recent LOG_KEEP_BYTES, starting at a line
// boundary so no partial JSON lines are kept.
function trimLogFile() {
  let fd = null;
  try {
    fd = fs.openSync(LOG_FILE, "r+");
    const stat = fs.fstatSync(fd);
    if (stat.size <= LOG_KEEP_BYTES) return;
    const buf = Buffer.alloc(LOG_KEEP_BYTES);
    fs.readSync(fd, buf, 0, LOG_KEEP_BYTES, stat.size - LOG_KEEP_BYTES);
    let start = 0;
    while (start < buf.length && buf[start] !== 0x0a) start++;
    const keep = start < buf.length ? buf.subarray(start + 1) : buf;
    fs.writeSync(fd, keep, 0, keep.length, 0);
    fs.ftruncateSync(fd, keep.length);
  } catch (e) {
    // Never let log trimming break request handling.
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (e) {}
    }
  }
}

function logWrite(level, event, details, sid) {
  // Lightest logging: drop events more verbose than the configured level.
  if ((level || 1) > LOG_LEVEL) return;
  const ts = new Date().toISOString();
  const line = JSON.stringify({ ts, level, event, details, sid: sid || "-" }) + "\n";
  try {
    const stat = fs.statSync(LOG_FILE);
    if (stat.size + line.length > LOG_MAX_BYTES) trimLogFile();
  } catch (e) {}
  fs.appendFileSync(LOG_FILE, line, "utf8");
}

// Basic auth helper
function basicAuth(req, res, next) {
  // Allow CORS preflight without auth
  if (req.method === "OPTIONS") return next();
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Basic ")) {
    res.writeHead(401, { "WWW-Authenticate": 'Basic realm="Logs"' });
    res.end("Authentication required");
    return;
  }
  const creds = Buffer.from(auth.slice(6), "base64").toString("utf8");
  const [user, pass] = creds.split(":");
  if (user !== LOG_USER || pass !== LOG_PASS) {
    res.writeHead(403);
    res.end("Invalid credentials");
    return;
  }
  next();
}

// POST /api/log — write a log entry (no auth needed from dashboard)
app.post("/api/log", (req, res) => {
  const { level, event, details, sid } = req.body;
  if (!event) return res.status(400).json({ error: "Missing event" });
  logWrite(level || 1, event, details || {}, sid);
  res.json({ ok: true });
});

// GET /api/log — read the log file (requires auth)
app.get("/api/log", basicAuth, (req, res) => {
  try {
    const data = fs.readFileSync(LOG_FILE, "utf8");
    res.type("text/plain").send(data);
  } catch (e) {
    res.status(500).send("Could not read log");
  }
});

// GET /api/log/tail — last 50 lines (requires auth)
app.get("/api/log/tail", basicAuth, (req, res) => {
  try {
    const data = fs.readFileSync(LOG_FILE, "utf8");
    const lines = data.trim().split("\n");
    res.type("text/plain").send(lines.slice(-50).join("\n"));
  } catch (e) {
    res.status(500).send("Could not read log");
  }
});

// server.js
const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY || "YOUR_API_KEY";
const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL
  ? `https://${process.env.INFOBIP_BASE_URL.replace(/^https?:\/\//, "")}`
  : "https://api.infobip.com";

// Endpoint for WebRTC token generation (audio + video)
app.post("/api/webrtc/token", async (req, res) => {
  const { identity, enableVideo = true } = req.body;

  try {
    const response = await axios({
      method: "POST",
      url: `${INFOBIP_BASE_URL}/webrtc/1/token`,
      headers: {
        Authorization: `App ${INFOBIP_API_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        identity: identity,
        expiresIn: 3600,
        // Request video capabilities in the token
        capabilities: {
          audio: true,
          video: enableVideo,
        },
      },
    });

    res.json({
      token: response.data.token,
      capabilities: { audio: true, video: enableVideo },
    });
  } catch (error) {
    console.error(
      "Token generation error:",
      error.response?.data || error.message,
    );
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// Endpoint for creating a video conference room (group calls)
app.post("/api/webrtc/room", async (req, res) => {
  const { roomName, identity } = req.body;

  try {
    // First get a token for the room creator
    const tokenResponse = await axios({
      method: "POST",
      url: `${INFOBIP_BASE_URL}/webrtc/1/token`,
      headers: {
        Authorization: `App ${INFOBIP_API_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        identity: identity,
        expiresIn: 3600,
        capabilities: { audio: true, video: true },
      },
    });

    res.json({
      token: tokenResponse.data.token,
      roomName: roomName || `handi-room-${Date.now()}`,
    });
  } catch (error) {
    console.error(
      "Room creation error:",
      error.response?.data || error.message,
    );
    res.status(500).json({ error: "Failed to create video room" });
  }
});

// Endpoint to initiate a Click-to-Call with video fallback
app.post("/api/click-to-call", async (req, res) => {
  const { from, to, videoUrl, text } = req.body;

  try {
    const response = await axios({
      method: "POST",
      url: `${INFOBIP_BASE_URL}/voice/1/advanced`,
      headers: {
        Authorization: `App ${INFOBIP_API_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        messages: [
          {
            from: from,
            destinations: [{ to: to }],
            text: text || `Please join video call: ${videoUrl}`,
            language: {
              language: "en",
              voice: "female",
            },
          },
        ],
      },
    });

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error(
      "Click-to-call error:",
      error.response?.data || error.message,
    );
    res.status(500).json({ error: "Failed to initiate call" });
  }
});

// -----------------------------------------------------------------------------
// BUS REALTIME API - GTFS-R TripUpdates + Vehicles + ServiceAlerts
// -----------------------------------------------------------------------------
// The NTA GTFS-R feeds provide:
//   1. TripUpdates — delay predictions per stop per trip
//   2. Vehicles — GPS positions of buses
//   3. ServiceAlerts — planned/unplanned disruptions
//
// A trip is uniquely identified by: trip_id + start_time + start_date
// A StopTimeUpdate has a delay that propagates to subsequent stops
// until the next explicit StopTimeUpdate.
//
// We combine all three feeds to produce accurate ETAs for requested stops.
app.get("/api/bus-realtime", async (req, res) => {
  const now = Date.now();
  const routeId = req.query.route || "19";
  const stopsParam = req.query.stops || "8220DB000092";
  const requestedStopIds = stopsParam.split(",").map((s) => s.trim());
  const forceRefresh = req.query.refresh === "true";

  const REALTIME_CACHE_TTL = 20000;
  const FALLBACK_CACHE_TTL = 60000;
  const cacheKey = `${routeId}|${stopsParam}`;

  // Initialize proto decoder on first request (async, safe to call repeatedly)
  try {
    await gtfsrt.initProto();
  } catch (e) {
    console.error("GTFS-RT proto init failed:", e.message);
  }

  // Check cache
  if (!forceRefresh && cachedData && cachedData._cacheKey === cacheKey) {
    const cacheAge = now - lastFetch;
    const isRealtime = cachedData.stops?.some((s) => s.realtime_data === true);
    const ttl = isRealtime ? REALTIME_CACHE_TTL : FALLBACK_CACHE_TTL;
    if (cacheAge < ttl) return res.json(cachedData);
  }

  // Resolve stop IDs to long form using GTFS + manual mapping
  async function resolveStopIds(requestedIds) {
    const result = {};
    const suffixToLong = {};
    // Build suffix-to-longId map from all GTFS stops
    try {
      const allStops = await gtfsServer.getAllStopIds();
      for (const longId of allStops) {
        const suffix = longId.replace(/^\D+/, "");
        if (suffix && suffix.length >= 4) suffixToLong[suffix] = longId;
      }
    } catch (_) {
      /* GTFS not available, skip suffix map */
    }
    for (const stopId of requestedIds) {
      const info = stopInfo[stopId];
      let lookupId = info?.longId || stopId;
      if (!info?.longId) {
        const suffix = stopId.replace(/^\D+/, "");
        if (suffixToLong[suffix]) lookupId = suffixToLong[suffix];
      }
      let stopName = info?.name || null;
      if (!stopName) {
        try {
          const gtfsStop =
            (await gtfsServer.getStopInfo(lookupId)) ||
            (await gtfsServer.getStopInfo(stopId));
          if (gtfsStop) stopName = gtfsStop.name;
        } catch (_) {
          /* ignore */
        }
      }
      result[lookupId] = {
        stop_name: stopName || lookupId,
        direction: info?.direction || "Unknown",
        stop_id: stopId,
      };
    }
    return result;
  }

  const stops = await resolveStopIds(requestedStopIds);
  const resolvedStopIds = Object.keys(stops);

  // Determine correct directionId from GTFS static data or query param
  const requestedDir =
    req.query.direction != null ? parseInt(req.query.direction) : null;
  for (const sid of resolvedStopIds) {
    const dir = requestedDir ?? (await gtfsServer.getStopDirection(sid));
    if (dir != null) {
      stops[sid].directionId = dir;
    }
  }

  console.log(`[BUS] route=${routeId} stops=${resolvedStopIds.join(",")}`);

  // Helper: parse a trip_id value, stripping leading zeros etc.
  function normalizeTripId(id) {
    return (id || "").trim();
  }

  // Helper: build a unique trip key from trip_id + start_time + start_date
  function tripKey(trip) {
    if (!trip) return null;
    return `${normalizeTripId(trip.tripId || trip.trip_id)}_${trip.startTime || trip.start_time || ""}_${trip.startDate || trip.start_date || ""}`;
  }

  // Helper: extract short route name from "2 223 c b" format
  function shortRouteName(apiRouteId) {
    const parts = (apiRouteId || "").split(" ");
    return parts.length >= 3 ? parts[1] : apiRouteId;
  }

  // Helper: compute minutes away from a StopTimeUpdate for a given stop.
  // The delay value (seconds) IS the best-guess arrival time at the stop,
  // as computed by the NTA system. Positive = late, negative = early.
  function computeMinutesAway(update) {
    const arrivalTime = update.arrival?.time;
    const departureTime = update.departure?.time;
    const refTime = arrivalTime || departureTime;

    if (refTime != null) {
      const minutesAway = Math.round(
        (Number(refTime) * 1000 - Date.now()) / 60000,
      );
      if (minutesAway >= -2 && minutesAway <= 120) {
        return { minutes: Math.max(0, minutesAway), method: "absolute" };
      }
    }

    // delay is the primary ETA indicator from the NTA feed
    const delay = update.arrival?.delay ?? update.departure?.delay;
    if (delay != null) {
      const mins = Math.max(1, Math.min(120, Math.round(Math.abs(delay) / 60)));
      return { minutes: mins, method: "delay" };
    }

    return null;
  }

  // Helper: haversine distance between two lat/lon points
  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Helper: check if a trip is on the requested route
  function tripMatchesRoute(trip, routeId) {
    if (!trip) return false;
    return shortRouteName(trip.routeId || trip.route_id) === routeId;
  }

  try {
    // Create a shared axios instance with headers for the GTFS-RT API
    const gtfsAxios = axios.create({
      headers: {
        "x-api-key": API_KEY,
        "Cache-Control": "no-cache",
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 15000,
    });

    // Fetch both feeds in parallel using protobuf binary
    const [tripRes, vehicleRes] = await Promise.allSettled([
      gtfsrt.fetchGTFSRT(REALTIME_URL, gtfsAxios),
      gtfsrt.fetchGTFSRT(VEHICLES_URL, gtfsAxios),
    ]);

    // --- STEP 1: Build vehicle position lookup by unique trip key ---
    // Map: tripKey -> { vehicleId, lat, lon, bearing, timestamp, headsign }
    const vehicleByTrip = new Map();

    if (vehicleRes.status === "fulfilled" && vehicleRes.value?.entity) {
      for (const entity of vehicleRes.value.entity) {
        if (!entity.vehicle) continue;
        const v = entity.vehicle;
        const trip = v.trip;
        if (!trip || !tripMatchesRoute(trip, routeId)) continue;
        if (!v.position || v.position.latitude == null) continue;

        const key = tripKey(trip);
        if (!key) continue;

        vehicleByTrip.set(key, {
          vehicleId: v.vehicle?.id || entity.id || "unknown",
          lat: v.position.latitude,
          lon: v.position.longitude,
          bearing: v.position.bearing || null,
          timestamp: v.timestamp ? Number(v.timestamp) * 1000 : Date.now(),
          headsign: trip.tripHeadsign || trip.trip_headsign || null,
        });
      }
    }

    // --- STEP 2: Process TripUpdates into predictions per stop ---
    // Map: stopId -> predictions[] (one per unique tripKey)
    const predictionsByStop = new Map();
    for (const sid of resolvedStopIds) predictionsByStop.set(sid, []);

    // Track: stopId -> Set of tripKeys already seen
    const seenTripsPerStop = new Map();
    for (const sid of resolvedStopIds) seenTripsPerStop.set(sid, new Set());

    let hasAnyRealTimeForRoute = false;

    if (tripRes.status === "fulfilled") {
      if (!tripRes.value || !tripRes.value.entity) {
        process.stderr.write("BUS: no entity array in feed\n");
      }
      for (const entity of tripRes.value.entity) {
        if (!entity.tripUpdate) {
          continue;
        }
        const tu = entity.tripUpdate;
        const trip = tu.trip;
        if (!trip) {
          process.stderr.write("BUS: entity has trip_update but no trip\n");
          continue;
        }
        const apiRouteId = trip.routeId || trip.route_id || "";
        const apiShortName = shortRouteName(apiRouteId);
        if (apiShortName !== routeId) continue;

        hasAnyRealTimeForRoute = true;
        const key = tripKey(trip);
        if (!key) continue;

        const updates = tu.stopTimeUpdate || tu.stop_time_update || [];
        process.stderr.write(
          "BUS: trip=" +
            (trip.tripId || trip.trip_id || "") +
            " time=" +
            (trip.startTime || trip.start_time || "") +
            " date=" +
            (trip.startDate || trip.start_date || "") +
            " dir=" +
            (trip.directionId ?? trip.direction_id ?? "") +
            " updates=" +
            updates.length +
            " stopIds=" +
            updates.map((u) => u.stopId || u.stop_id || "?").join(",") +
            "\n",
        );

        // Process stop_time_updates: for each requested stop, find the
        // closest upcoming update from this trip.
        for (const sid of resolvedStopIds) {
          if (!stops[sid]) continue;

          // Filter by stop's direction from GTFS data
          const tripDir = trip.directionId ?? trip.direction_id;
          const stopDir = stops[sid].directionId;
          if (stopDir != null && tripDir !== stopDir) continue;

          const seenSet = seenTripsPerStop.get(sid);
          if (seenSet.has(key)) continue;

          // Find the closest upcoming update for this stop
          let bestMinutesAway = Infinity;
          let bestData = null;

          for (const update of updates) {
            if ((update.stopId || update.stop_id) !== sid) continue;
            const result = computeMinutesAway(update);
            if (!result || result.minutes >= bestMinutesAway) continue;
            bestMinutesAway = result.minutes;
            bestData = {
              minutes_away: result.minutes,
              delay: update.arrival?.delay ?? update.departure?.delay,
              source: result.method,
            };
            process.stderr.write(
              "BUS: stop=" +
                (stops[sid]?.stop_name || sid) +
                " delay=" +
                bestData.delay +
                " result=" +
                result.minutes +
                " method=" +
                result.method +
                "\n",
            );
          }

          // No GPS fallback — scheduled departures are accurate enough

          if (bestData) {
            // Check if already have a prediction within 3 min for same stop (different trip)
            const existing = predictionsByStop.get(sid);
            const tooClose = existing.some(
              (p) => Math.abs(p.minutes_away - bestData.minutes_away) < 20,
            );
            if (tooClose) {
              console.log(
                `[TOOCLOSE] Skipping stop=${sid} tripKey=${key} min=${bestData.minutes_away} — within 3min of existing`,
              );
            }
            if (!tooClose) {
              seenSet.add(key);
              const pred = {
                route: routeId,
                minutes_away: bestData.minutes_away,
                arrival_text:
                  bestData.minutes_away <= 1
                    ? "Due"
                    : `${bestData.minutes_away} min${bestData.minutes_away !== 1 ? "s" : ""}`,
                delay: bestData.delay,
                source: bestData.source,
                realtime: true,
                headsign: trip.tripHeadsign || trip.trip_headsign || null,
                vehicle_id: null,
                trip_id: trip.tripId || trip.trip_id || null,
                start_time: trip.startTime || trip.start_time || null,
                start_date: trip.startDate || trip.start_date || null,
                arrival_time: null, // will be set below if available
              };
              // Find the raw arrival.time from the update for debugging
              for (const update of updates) {
                if (
                  (update.stopId || update.stop_id) === sid &&
                  (update.arrival?.time || update.departure?.time)
                ) {
                  pred.arrival_time =
                    update.arrival?.time || update.departure?.time;
                  break;
                }
              }
              predictionsByStop.get(sid).push(pred);

              if ((trip.tripHeadsign || trip.trip_headsign) && stops[sid]) {
                stops[sid].direction = trip.tripHeadsign || trip.trip_headsign;
              }
            }
          }
        }
      }
    }

    // --- STEP 3: Build results ---
    const results = [];
    for (const sid of resolvedStopIds) {
      const stopData = stops[sid];
      let live = predictionsByStop.get(sid) || [];
      let scheduled = await getGenericSchedule(
        routeId,
        sid,
        stopData.direction,
      );

      // Merge: live wins over scheduled for same trip_id
      const seen = new Set(live.map((b) => b.trip_id));
      for (const s of scheduled) {
        if (s.trip_id && !seen.has(s.trip_id)) {
          seen.add(s.trip_id);
          live.push(s);
        }
      }

      live.sort((a, b) => a.minutes_away - b.minutes_away);

      console.log(
        `[RESULT] stop=${sid} live=${predictionsByStop.get(sid)?.length || 0} scheduled=${scheduled.length} final=${live.length}`,
      );

      results.push({
        stop_name: stopData.stop_name,
        direction: stopData.direction,
        stop_id: stopData.stop_id,
        buses: live.slice(0, 4),
        realtime_data: live.some((b) => b.realtime === true),
      });
    }

    const hasAnyRealtimeBuses = results.some((s) =>
      s.buses.some((b) => b.realtime === true),
    );

    const result = {
      success: true,
      last_updated: new Date().toISOString(),
      route: routeId,
      stops: results,
      source: hasAnyRealtimeBuses ? "realtime" : "scheduled",
      _cacheKey: cacheKey,
    };

    cachedData = result;
    lastFetch = now;
    res.json(result);
  } catch (error) {
    console.error("Bus API error:", error.message);
    if (cachedData && cachedData._cacheKey === cacheKey) {
      return res.json(cachedData);
    }
    const results = [];
    for (const [sid, stopData] of Object.entries(stops)) {
      const buses = await getGenericSchedule(routeId, sid, stopData.direction);
      results.push({
        stop_name: stopData.stop_name,
        direction: stopData.direction,
        stop_id: stopData.stop_id,
        buses: buses.slice(0, 4),
        realtime_data: false,
      });
    }
    res.json({
      success: true,
      last_updated: new Date().toISOString(),
      route: routeId,
      stops: results,
      source: "fallback",
      error: error.message,
    });
  }
});

// -----------------------------------------------------------------------------
// BUS VEHICLES - Live GPS positions (used by /api/bus-realtime internally)
// -----------------------------------------------------------------------------
// This endpoint is kept for backward compatibility but is now superseded
// by /api/bus-realtime which combines TripUpdates + Vehicles + ServiceAlerts.
app.get("/api/bus-vehicles", async (req, res) => {
  try {
    const response = await axios.get(VEHICLES_URL, {
      headers: { "x-api-key": API_KEY, "Cache-Control": "no-cache" },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    res.json({ error: error.message });
  }
});

// -----------------------------------------------------------------------------
// Proxy for Proton Calendar ICS
// -----------------------------------------------------------------------------
// Proxy for Proton Calendar ICS
app.get("/api/calendar-proxy", async (req, res) => {
  let icsUrl = req.query.url;
  if (!icsUrl) {
    return res.status(400).send("Missing calendar URL");
  }

  // Decode the URL if it was encoded
  try {
    icsUrl = decodeURIComponent(icsUrl);
  } catch (e) {
    // If decoding fails, use as is
    console.log("URL decoding not needed");
  }

  console.log("Fetching calendar from:", icsUrl.substring(0, 100) + "...");

  try {
    const response = await fetch(icsUrl, {
      headers: {
        "User-Agent": "HandiHomepage/1.0",
        Accept: "text/calendar, */*",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const icsText = await response.text();
    res.setHeader("Content-Type", "text/calendar");
    res.send(icsText);
  } catch (err) {
    console.error("Calendar proxy error:", err.message);
    res.status(500).send(`Failed to fetch calendar: ${err.message}`);
  }
});

// -----------------------------------------------------------------------------
// FEED RELAY HELPERS – some feed hosts (e.g. rte.ie) WAF-block this server's
// cloud IP and return 403. We retry through public read-only relay proxies,
// which fetch from their own servers and therefore bypass the IP block.
// The relays are free third-party services; swap or remove them as needed.
// -----------------------------------------------------------------------------
const BLOCKED_DIRECT_HOSTS = ["rte.ie", "streaming.broadcast.radio"];

function blockedHost(feedUrl) {
  try {
    const host = new URL(feedUrl).hostname.toLowerCase();
    return BLOCKED_DIRECT_HOSTS.some(
      (h) => host === h || host.endsWith("." + h),
    )
      ? host
      : null;
  } catch (e) {
    return null;
  }
}

async function attemptFeedFetch(url, headers, timeout, proxy) {
  let response;
  try {
    // Stream mode so we can inspect the upstream content-type before
    // buffering: a live audio/video stream must never be buffered as a feed.
    response = await axios.get(url, {
      responseType: "stream",
      timeout: timeout || 15000,
      headers,
      ...(proxy ? { proxy } : {}),
    });
  } catch (error) {
    const status = error.response ? error.response.status : 502;
    return { ok: false, status, message: error.message };
  }
  if (response.status !== 200) {
    try {
      response.data.destroy();
    } catch (e) {}
    return {
      ok: false,
      status: response.status,
      message: "HTTP " + response.status,
    };
  }
  // Bail out immediately when the upstream is a media stream rather than a
  // feed document — buffering an infinite stream would hang the request.
  const ctype = String(response.headers["content-type"] || "").toLowerCase();
  if (
    ctype &&
    (ctype.startsWith("audio/") ||
      ctype.startsWith("video/") ||
      ctype.indexOf("mpegurl") !== -1 ||
      ctype === "application/octet-stream")
  ) {
    try {
      response.data.destroy();
    } catch (e) {}
    return { ok: false, status: 415, message: "Not a feed (media stream)" };
  }
  try {
    let data = "";
    for await (const chunk of response.data) {
      data += chunk;
    }
    return { ok: true, data };
  } catch (error) {
    const status = error.response ? error.response.status : 502;
    return { ok: false, status, message: error.message };
  }
}

// Relay list: ip : port : username : password
// Credentials come from the host's .env file:
//   PROXY_USERNAME_1 / PROXY_PASSWORD_1  – IPRoyal residential proxy
//   PROXY_USERNAME_2 / PROXY_PASSWORD_2  – backup proxy
function buildRelays(targetUrl) {
  return [
    // Preferred: previous proxy server (fastest in testing).
    {
      name: "proxy 91.193.255.216:12323",
      url: targetUrl,
      proxy: {
        host: "91.193.255.216",
        port: 12323,
        auth: {
          username: process.env.PROXY_USERNAME_2,
          password: process.env.PROXY_PASSWORD_2,
        },
      },
    },
    // Backup: IPRoyal residential proxy (uses its IP, bypassing rte.ie's
    // block on this server's IP).
    {
      name: "IPRoyal residential proxy (geo.iproyal.com:12321)",
      url: targetUrl,
      proxy: {
        host: "geo.iproyal.com",
        port: 12321,
        auth: {
          username: process.env.PROXY_USERNAME_1,
          password: process.env.PROXY_PASSWORD_1,
        },
      },
    },
  ];
}

async function fetchFeedWithRelay(feedUrl, headers) {
  // Relays switched off: try the upstream directly only.
  if (!FEED_RELAY_ENABLED) {
    return attemptFeedFetch(feedUrl, headers);
  }

  // Hosts known to block this server's IP are never fetched directly — go
  // straight to a relay so we don't reach e.g. rte.ie from this IP at all.
  const blocked = blockedHost(feedUrl);
  if (blocked) {
    console.log(`🔄 ${blocked} is IP-blocked for this server; using relay only.`);
  } else {
    const direct = await attemptFeedFetch(feedUrl, headers);
    if (direct.ok) return direct;
    // Definitively not a feed document (e.g. a live audio stream) — don't
    // waste time trying relays; report the same to the caller.
    if (direct.status === 415) return direct;
    console.warn(`⚠️ Direct fetch failed (${direct.message}); trying relays...`);
  }
  for (const relay of buildRelays(feedUrl)) {
    const viaRelay = await attemptFeedFetch(relay.url, headers, 15000, relay.proxy);
    if (viaRelay.ok) {
      console.log("✅ Feed fetched via relay: " + relay.name);
      return viaRelay;
    }
    if (viaRelay.status === 415) {
      console.log("↩️ Upstream is a media stream (not a feed); skipping further relays.");
      return viaRelay;
    }
    console.warn(`⚠️ Relay ${relay.name} failed (${viaRelay.message})`);
  }
  return {
    ok: false,
    status: 502,
    message: "Direct and relay fetches all failed",
  };
}

// Streaming variants of the helpers above — the response body is piped
// through instead of buffered, so live radio streams keep flowing.
async function attemptStreamFetch(url, headers, proxy) {
  try {
    const response = await axios.get(url, {
      responseType: "stream",
      timeout: 20000,
      headers,
      ...(proxy ? { proxy } : {}),
    });
    return { ok: true, data: response };
  } catch (error) {
    const status = error.response ? error.response.status : 502;
    return { ok: false, status, message: error.message };
  }
}

async function fetchStreamWithRelay(streamUrl, headers) {
  if (!FEED_RELAY_ENABLED) {
    return attemptStreamFetch(streamUrl, headers);
  }
  const blocked = blockedHost(streamUrl);
  if (blocked) {
    console.log(`🔊 ${blocked} is IP-blocked for this server; relaying stream.`);
  } else {
    const direct = await attemptStreamFetch(streamUrl, headers);
    if (direct.ok) return direct;
    console.warn(`⚠️ Direct stream fetch failed (${direct.message}); trying relays...`);
  }
  for (const relay of buildRelays(streamUrl)) {
    const viaRelay = await attemptStreamFetch(relay.url, headers, relay.proxy);
    if (viaRelay.ok) {
      console.log("✅ Stream fetched via relay: " + relay.name);
      return viaRelay;
    }
    console.warn(`⚠️ Relay ${relay.name} failed (${viaRelay.message})`);
  }
  return {
    ok: false,
    status: 502,
    message: "Direct and relay stream fetches all failed",
  };
}

// -----------------------------------------------------------------------------
// NEWS API – FIXED with proper User-Agent and error handling
// -----------------------------------------------------------------------------
app.get("/api/news", async (req, res) => {
  const rssUrl = req.query.url || "https://www.thejournal.ie/feed/";
  console.log(`📰 Fetching news from: ${rssUrl}`);
  try {
    const result = await fetchFeedWithRelay(rssUrl, {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    });
    if (!result.ok) throw new Error(result.message);
    res.type("application/xml").send(result.data);
    console.log("✅ News feed fetched successfully");
  } catch (error) {
    // Log all available error details for debugging
    console.error("❌ News API error:", error.message);
    if (error.code) {
      console.error("   Code:", error.code); // e.g. ENOTFOUND, ECONNREFUSED, ETIMEDOUT
    }
    if (error.response) {
      console.error("   HTTP Status:", error.response.status);
      console.error("   Headers:", JSON.stringify(error.response.headers));
    } else if (error.request) {
      console.error("   No response received (network/DNS/timeout)");
    }
    if (error.config) {
      console.error("   URL:", error.config.url);
    }

    // Escape user-facing error message to avoid broken XML
    const escapedMessage = String(error.message)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>News (Fallback)</title>
<description>Unable to fetch live news at this time</description>
<item>
<title>⚠️ Cannot reach RSS feed</title>
<link>#</link>
<description>Error: ${escapedMessage}</description>
<pubDate>${new Date().toUTCString()}</pubDate>
</item>
</channel>
</rss>`;

    // Guard against double-send if headers already sent
    if (res.headersSent) {
      console.error("   ⚠️ Headers already sent, cannot send fallback");
      return;
    }
    try {
      res.type("application/xml").status(200).send(fallbackXml);
    } catch (sendError) {
      console.error("   ⚠️ Failed to send fallback XML:", sendError.message);
    }
  }
});

// -----------------------------------------------------------------------------
// FEED PROXY – fetches an external Atom/RSS feed and returns its raw body with
// the upstream status so clients can fall back when it isn't a 200.
// -----------------------------------------------------------------------------
app.get("/api/feed", async (req, res) => {
  let feedUrl = req.query.url;
  if (!feedUrl) return res.status(400).send("Missing feed URL");
  try {
    feedUrl = decodeURIComponent(feedUrl);
  } catch (e) {}

  console.log(`🖼️ Fetching feed from: ${feedUrl.substring(0, 100)}...`);
  const result = await fetchFeedWithRelay(feedUrl, {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/atom+xml, application/rss+xml, application/xml, text/xml, */*",
  });
  if (result.ok) {
    res.status(200).type("application/xml").send(result.data);
    console.log("✅ Feed fetched successfully");
    return;
  }
  if (result.status === 415) {
    // Expected: the URL is a live audio/video stream, not a feed document.
    // The radio module uses this to fall back to stream playback, so it
    // isn't an error worth alarming in the logs.
    console.log(`↩️ Not a feed (media stream): ${result.message}`);
  } else {
    console.error("❌ Feed proxy error:", result.message, "status:", result.status);
  }
  res.status(result.status || 502).send("Failed to fetch feed: " + result.message);
});

// -----------------------------------------------------------------------------
// NEWS ARTICLE FEATURED-IMAGE – WordPress feeds often carry no per-item image.
// Fetch the article page server-side (CORS blocks the browser from doing it)
// and pull out the featured image: og:image meta first, then the core
// wp-post-image <img>. Results are cached in-memory so refreshes don't
// re-fetch every article page.
// -----------------------------------------------------------------------------
const newsImageCache = new Map(); // pageUrl -> { url, expiresAt }
const NEWS_IMAGE_TTL = 24 * 60 * 60 * 1000;
const NEWS_IMAGE_TTL_NEGATIVE = 6 * 60 * 60 * 1000;

function extractFeaturedImage(html, pageUrl) {
  function abs(u) {
    if (!u) return "";
    try {
      return new URL(u, pageUrl).href;
    } catch (e) {
      return "";
    }
  }
  // 1. og:image meta tag (property can appear in any attribute order).
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  for (const meta of metas) {
    if (!/\bproperty=["']og:image(?:["']|:)/i.test(meta)) continue;
    const m = meta.match(/\bcontent=["']([^"']*)["']/i);
    if (m && m[1]) return abs(m[1].trim());
  }
  // 2. WordPress core featured image: <img class="...wp-post-image...">.
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  for (const img of imgs) {
    if (!/class=["'][^"']*wp-post-image/i.test(img)) continue;
    const src = img.match(/\bsrc=["']([^"']*)["']/i);
    if (src && src[1]) return abs(src[1].trim());
    const srcset = img.match(/\bsrcset=["']([^"']*)["']/i);
    if (srcset && srcset[1]) {
      return abs(srcset[1].split(",")[0].trim().split(/\s+/)[0]);
    }
  }
  return "";
}

app.get("/api/news-image", async (req, res) => {
  const raw = req.query.url;
  if (!raw) return res.status(400).json({ url: "" });
  let pageUrl = raw;
  try {
    pageUrl = decodeURIComponent(raw);
  } catch (e) {}
  // Only http(s) targets — refuse everything else.
  if (!/^https?:\/\//i.test(pageUrl)) return res.status(400).json({ url: "" });

  const cached = newsImageCache.get(pageUrl);
  if (cached && Date.now() < cached.expiresAt) {
    return res.json({ url: cached.url });
  }

  const result = await fetchFeedWithRelay(pageUrl, {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  });

  let url = "";
  if (result.ok && result.data) {
    url = extractFeaturedImage(result.data, pageUrl);
  }
  // Positive results live 24h; negative ones 6h so refreshes don't re-fetch
  // article pages that simply have no featured image.
  newsImageCache.set(pageUrl, {
    url,
    expiresAt: Date.now() + (url ? NEWS_IMAGE_TTL : NEWS_IMAGE_TTL_NEGATIVE),
  });
  if (newsImageCache.size > 5000) newsImageCache.clear();
  res.json({ url });
});

// -----------------------------------------------------------------------------
// TODAY'S FOOTBALL FIXTURES – proxies the API-Football "fixtures?date=…"
// endpoint (Europe/Dublin timezone) and trims each fixture to the fields the
// sports module needs: kickoff time, venue, teams, score and key events.
// The API key stays server-side (never shipped to the browser). Responses are
// cached in-memory so a dashboard polling every minute doesn't burn the API
// quota — tune SPORTS_CACHE_SECONDS in .env (default 300s; the free tier only
// allows ~100 requests/day).
//
// League filtering happens server-side after the fetch: the free API-Sports
// plan rejects league-filtered queries ("Free plans do not have access to
// this season"), so we always fetch the full day and filter by league id here.
// -----------------------------------------------------------------------------
const APISPORTS_BASE = "https://v3.football.api-sports.io";
let sportsCache = { key: "all", at: 0, data: null };

// Pre-match odds are cached per fixture for longer than the fixtures list
// (odds move slowly and each odds request costs one API call per fixture —
// tune SPORTS_ODDS_CACHE_SECONDS in .env, default 1h).
const ODDS_TTL =
  (parseInt(process.env.SPORTS_ODDS_CACHE_SECONDS, 10) || 3600) * 1000;
let oddsCache = {}; // fixtureId -> { at, data }

// Statuses where the match has kicked off / finished — no pre-match odds.
const STARTED_STATUS = new Set([
  "1H", "2H", "HT", "ET", "P", "LIVE", "FT", "AET", "PEN",
  "SUSP", "INT", "ABD", "AWD", "WO",
]);

function isStartedStatus(s) {
  return STARTED_STATUS.has(String(s || "").toUpperCase());
}

// Best odds across all bookmakers for the three match-winner outcomes.
// Returns { home: {odd,bookmaker}, draw: {...}, away: {...} } or null.
async function fetchBestOdds(fixtureId, apiKey) {
  const res = await axios.get(APISPORTS_BASE + "/odds", {
    params: { fixture: fixtureId },
    headers: { "x-apisports-key": apiKey },
    timeout: 12000,
  });
  const body = res.data || {};
  if (!Array.isArray(body.response) || !body.response.length) return null;
  const entry = body.response[0];
  const best = {};
  for (const bm of entry.bookmakers || []) {
    for (const bet of bm.bets || []) {
      // Match Winner (bet id 1) — don't match "Second Half Winner" etc.
      if (bet.id !== 1 && bet.name !== "Match Winner") continue;
      for (const v of bet.values || []) {
        const label = String(v.value || "").toLowerCase();
        const key =
          label === "home" || label === "1"
            ? "home"
            : label === "draw" || label === "x"
              ? "draw"
              : label === "away" || label === "2"
                ? "away"
                : null;
        if (!key) continue;
        const odd = parseFloat(v.odd);
        if (!Number.isFinite(odd) || odd <= 1) continue;
        if (!best[key] || odd > best[key].odd) {
          best[key] = { odd, bookmaker: bm.name || "" };
        }
      }
    }
  }
  return Object.keys(best).length ? best : null;
}

app.get("/api/sports/live", async (req, res) => {
  const apiKey = process.env.APISPORTS_KEY;
  if (!apiKey) {
    return res
      .status(503)
      .json({ error: "not_configured", message: "APISPORTS_KEY not set in .env" });
  }
  const ttlMs =
    (parseInt(process.env.SPORTS_CACHE_SECONDS, 10) || 900) * 1000;
  // Optional league filter (comma-separated API-Football league ids).
  const leaguesParam = String(req.query.leagues || "").trim();
  const cacheKey = leaguesParam || "all";
  let matches;
  if (
    sportsCache.data &&
    sportsCache.key === cacheKey &&
    Date.now() - sportsCache.at < ttlMs
  ) {
    matches = sportsCache.data.matches;
  } else {
    try {
      // "Today" in Irish local time so kickoff times are the local ones.
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Europe/Dublin",
      });
      const upstream = await axios.get(APISPORTS_BASE + "/fixtures", {
        params: { date: today, timezone: "Europe/Dublin" },
        headers: { "x-apisports-key": apiKey },
        timeout: 15000,
      });
      const body = upstream.data || {};
      if (!Array.isArray(body.response)) {
        return res
          .status(502)
          .json({ error: "upstream", message: "Bad upstream response" });
      }
      const wanted = leaguesParam
        ? new Set(
            leaguesParam
              .split(",")
              .map((s) => parseInt(s, 10))
              .filter((n) => Number.isFinite(n)),
          )
        : null;
      matches = body.response.map((f) => ({
        id: f.fixture && f.fixture.id,
        leagueId: f.league && f.league.id,
        league:
          (f.league &&
            (f.league.name +
              (f.league.country ? " · " + f.league.country : ""))) ||
          "",
        leagueLogo: f.league && f.league.logo,
        status: f.fixture && f.fixture.status ? f.fixture.status.short : "",
        minute:
          f.fixture &&
          f.fixture.status &&
          typeof f.fixture.status.elapsed === "number"
            ? f.fixture.status.elapsed
            : null,
        // Kickoff time (HH:MM, Europe/Dublin) — the API echoes local time
        // back because we pass timezone=Europe/Dublin.
        time: f.fixture && f.fixture.date ? f.fixture.date.slice(11, 16) : null,
        venue: (f.fixture && f.fixture.venue && f.fixture.venue.name) || "",
        home: f.teams && f.teams.home ? f.teams.home.name : "",
        homeLogo: f.teams && f.teams.home ? f.teams.home.logo : "",
        away: f.teams && f.teams.away ? f.teams.away.name : "",
        awayLogo: f.teams && f.teams.away ? f.teams.away.logo : "",
        scoreHome: f.goals && typeof f.goals.home === "number" ? f.goals.home : 0,
        scoreAway: f.goals && typeof f.goals.away === "number" ? f.goals.away : 0,
        events: Array.isArray(f.events)
          ? f.events
              .filter(
                (e) =>
                  e &&
                  (e.type === "Goal" || e.type === "Card" || e.type === "Var"),
              )
              .map((e) => ({
                type: e.type,
                detail: e.detail || "",
                time:
                  e.time && typeof e.time.elapsed === "number"
                    ? e.time.elapsed
                    : null,
                team: e.team ? e.team.name : "",
                player: e.player ? e.player.name : "",
              }))
          : [],
      }));
      if (wanted && wanted.size) {
        matches = matches.filter((m) => wanted.has(m.leagueId));
      }
      sportsCache = {
        key: cacheKey,
        at: Date.now(),
        data: { updatedAt: Date.now(), date: today, matches },
      };
    } catch (error) {
      console.error("❌ Sports API error:", error.message);
      return res
        .status(502)
        .json({ error: "upstream", message: error.message });
    }
  }

  // Pre-match odds for the selected leagues only (never for the unfiltered
  // "all games" view — that could be 100+ fixtures and would burn the quota).
  if (leaguesParam) {
    const now = Date.now();
    const stale = matches.filter(
      (m) =>
        m.id &&
        !isStartedStatus(m.status) &&
        (!oddsCache[m.id] || now - oddsCache[m.id].at >= ODDS_TTL),
    );
    // Cap the number of odds fetches per refresh.
    await Promise.allSettled(
      stale.slice(0, 20).map(async (m) => {
        try {
          const odds = await fetchBestOdds(m.id, apiKey);
          if (odds) oddsCache[m.id] = { at: Date.now(), data: odds };
        } catch (e) {
          /* keep whatever we had */
        }
      }),
    );
    matches = matches.map((m) => ({
      ...m,
      odds: oddsCache[m.id] ? oddsCache[m.id].data : null,
    }));
  }

  res.json({ ...sportsCache.data, matches });
});
// AUDIO STREAM PROXY – lets the Radio module play IP/geo-blocked streams
// (e.g. rte.ie) by piping them through the same relay logic as feeds. The
// upstream content-type (and icy metadata) headers are forwarded so the
// browser <audio> element can play the stream.
// -----------------------------------------------------------------------------
app.get("/api/stream", async (req, res) => {
  let streamUrl = req.query.url;
  if (!streamUrl) return res.status(400).send("Missing stream URL");
  try {
    streamUrl = decodeURIComponent(streamUrl);
  } catch (e) {}

  console.log(`🔊 Proxying stream from: ${streamUrl.substring(0, 100)}...`);
  const result = await fetchStreamWithRelay(streamUrl, {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "audio/mpeg, audio/aac, audio/x-mpegurl, audio/*;q=0.9, */*;q=0.8",
    "Icy-MetaData": "1",
  });
  if (!result.ok) {
    console.error("❌ Stream proxy error:", result.message, "status:", result.status);
    res.status(result.status || 502).send("Failed to proxy stream: " + result.message);
    return;
  }
  const upstream = result.data;
  res.status(200).set({
    "Content-Type": upstream.headers["content-type"] || "audio/mpeg",
    "Cache-Control": "no-cache, no-store",
    "Access-Control-Allow-Origin": "*",
  });
  // Forward icy-metadata (song titles) when the upstream provides it.
  if (upstream.headers["icy-metaint"]) {
    res.set("Icy-MetaInt", upstream.headers["icy-metaint"]);
  }
  upstream.data.on("error", function () {
    try {
      res.end();
    } catch (e) {}
  });
  upstream.data.pipe(res);
  // Stop pulling from the upstream when the client disconnects.
  res.on("close", function () {
    if (!res.writableEnded) {
      try {
        upstream.data.destroy();
      } catch (e) {}
    }
  });
});

// -----------------------------------------------------------------------------
// HEALTH CHECK
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// BUS API v2 (node-gtfs library)
// -----------------------------------------------------------------------------

// Get all available routes
app.get("/api/bus/v2/routes", async (req, res) => {
  try {
    const routes = await gtfsServer.getAllRoutes();
    res.json({ routes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all stops for a specific route
app.get("/api/bus/v2/stops", async (req, res) => {
  const routeId = req.query.route_id;
  if (!routeId) return res.status(400).json({ error: "route_id required" });
  try {
    const stops = await gtfsServer.getRouteStops(routeId);
    res.json({ stops });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get upcoming departures for a stop on a route
app.get("/api/bus/v2/departures", async (req, res) => {
  const { route_id, stop_id, limit } = req.query;
  if (!route_id || !stop_id) {
    return res.status(400).json({ error: "route_id and stop_id required" });
  }
  try {
    const departures = await gtfsServer.getUpcomingDepartures(
      route_id,
      stop_id,
      parseInt(limit) || 3,
    );
    res.json({ departures });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// -----------------------------------------------------------------------------
// SUBSCRIPTION STATUS (Stripe)
// -----------------------------------------------------------------------------
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

const stripe = STRIPE_SECRET_KEY ? require("stripe")(STRIPE_SECRET_KEY) : null;

// Stripe success — lookup session and return subscription ID
app.get("/api/stripe/session", async (req, res) => {
  if (!stripe) return res.status(500).json({ error: "Stripe not configured" });

  const sessionId = req.query.session_id;
  if (!sessionId) return res.status(400).json({ error: "Missing session_id" });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json({
      subscription_id: session.subscription,
      customer: session.customer,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/subscription/status", async (req, res) => {
  // Dev mode — always premium
  const host = req.get("host") || "";
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return res.json({ premium: true, expiry: null, dev: true });
  }

  const subId = req.query.subscription_id;
  if (!subId) return res.json({ premium: false });

  if (!STRIPE_SECRET_KEY) {
    console.warn("Stripe not configured — returning premium=false");
    return res.json({ premium: false });
  }

  try {
    // Use raw REST API — Stripe SDK has a date-parsing bug on some subscriptions
    const resp = await axios.get(
      `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subId)}`,
      {
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        },
      },
    );
    const sub = resp.data;
    const status = sub.status;
    const endTimestamp = sub.current_period_end || sub.trial_end || null;
    res.json({
      premium: status === "active" || status === "trialing",
      expiry: endTimestamp ? new Date(endTimestamp * 1000).toISOString() : null,
      status: status,
    });
  } catch (e) {
    console.error(
      "Stripe subscription check failed:",
      e.response?.data || e.message,
    );
    res.json({ premium: false });
  }
});

// -----------------------------------------------------------------------------
// START SERVER
// -----------------------------------------------------------------------------
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🚌 Bus API v2: /api/bus/v2/*`);
  console.log(`📰 News API: /api/news?url=...`);
  console.log(`❤️ Health: /health`);

  // Import GTFS static data (node-gtfs)
  console.log(`📦 Importing GTFS static data...`);
  gtfsServer
    .doImport()
    .then(() => {
      console.log(`🚌 GTFS static data ready`);
    })
    .catch((err) => {
      console.error(`⚠️ GTFS import failed: ${err.message}`);
    });

  // Load GTFS static timetable data for fallback scheduled times (legacy - disabled in favour of gtfs-server)
  // gtfs.initGTFS().then(...).catch(...)
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing server...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

// Global handlers to prevent uncaught errors from crashing the process
process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION:", err.message);
  console.error(err.stack);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 UNHANDLED REJECTION:", reason);
});

// Express error-handling middleware (must be registered last, with 4 params)
app.use((err, req, res, _next) => {
  console.error("💥 Express error:", err.message);
  console.error(err.stack);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});
