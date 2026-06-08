// index.js - Infomaniak Production Ready
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const https = require("https");

const gtfs = require("./gtfs-schedule.js");

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

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Serve favicon
app.get("/favicon.ico", (req, res) =>
  res.sendFile(path.join(__dirname, "images", "favicon.ico")),
);

const REALTIME_URL =
  "https://api.nationaltransport.ie/gtfsr/v2/TripUpdates?format=json";
const VEHICLES_URL =
  "https://api.nationaltransport.ie/gtfsr/v2/Vehicles?format=json";
const GTFSR_URL = "https://api.nationaltransport.ie/gtfsr/v2/gtfsr?format=json";
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
function getGenericSchedule(routeId, stopId, direction) {
  // The GTFS data uses the same long-form stop IDs as the NTA real-time API
  // If we have Bus Éireann GTFS data loaded, try to look up the route
  return gtfs.getScheduledTimes(routeId, stopId);
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
app.use(express.static(staticPath));

app.get("/", (req, res) => {
  const indexPath = path.join(staticPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      message: "API running",
      endpoints: ["/api/bus-realtime", "/api/news"],
    });
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
// BUS REALTIME API - TripUpdate-based prediction
// -----------------------------------------------------------------------------
// Each NTA TripUpdate entity represents ONE trip (a specific bus run).
// Each trip has stop_time_update entries for stops ahead.
// For a requested stop, we find the nearest upcoming update for each trip.
// Key: one trip = one bus = one prediction per stop.
app.get("/api/bus-realtime", async (req, res) => {
  const now = Date.now();
  const routeId = req.query.route || "19";
  const stopsParam = req.query.stops || "8220DB000092";
  const requestedStopIds = stopsParam.split(",").map((s) => s.trim());
  const forceRefresh = req.query.refresh === "true";

  const REALTIME_CACHE_TTL = 20000;
  const FALLBACK_CACHE_TTL = 60000;
  const cacheKey = `${routeId}|${stopsParam}`;

  // Check cache
  if (!forceRefresh && cachedData && cachedData._cacheKey === cacheKey) {
    const cacheAge = now - lastFetch;
    const isRealtime = cachedData.stops?.some((s) => s.realtime_data === true);
    const ttl = isRealtime ? REALTIME_CACHE_TTL : FALLBACK_CACHE_TTL;
    if (cacheAge < ttl) return res.json(cachedData);
  }

  // Resolve stop IDs to long form
  async function resolveStopIds(requestedIds) {
    const result = {};
    const suffixToLong = {};
    if (gtfs.scheduleData && gtfs.scheduleData.stops) {
      for (const longId of gtfs.scheduleData.stops.keys()) {
        const suffix = longId.replace(/^\D+/, "");
        if (suffix && suffix.length >= 4) suffixToLong[suffix] = longId;
      }
    }
    for (const stopId of requestedIds) {
      const info = stopInfo[stopId];
      let lookupId = info?.longId || stopId;
      if (!info?.longId) {
        const suffix = stopId.replace(/^\D+/, "");
        if (suffixToLong[suffix]) lookupId = suffixToLong[suffix];
      }
      let stopName = info?.name || null;
      if (!stopName && gtfs.scheduleData && gtfs.scheduleData.stops) {
        const gtfsStop =
          gtfs.scheduleData.stops.get(lookupId) ||
          gtfs.scheduleData.stops.get(stopId);
        if (gtfsStop) stopName = gtfsStop.name;
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

  try {
    const response = await axios.get(REALTIME_URL, {
      headers: { "x-api-key": API_KEY, "Cache-Control": "no-cache" },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 15000,
    });

    // Map: stopId -> predictions (one per unique trip)
    // Keyed by trip_id + start_time to uniquely identify a bus run
    const predictionsByStop = new Map();
    for (const sid of resolvedStopIds) predictionsByStop.set(sid, []);

    // Track which trips we've already seen per stop (trip_id + start_time)
    const seenTripsPerStop = new Map();
    for (const sid of resolvedStopIds) seenTripsPerStop.set(sid, new Set());

    let hasAnyRealTimeForRoute = false;

    if (response.data?.entity) {
      for (const entity of response.data.entity) {
        if (!entity.trip_update) continue;
        const tu = entity.trip_update;
        const trip = tu.trip;
        if (!trip) continue;

        // Match route by short name
        const apiRouteId = trip.route_id || "";
        const apiRouteParts = apiRouteId.split(" ");
        const apiShortName =
          apiRouteParts.length >= 3 ? apiRouteParts[1] : apiRouteId;
        if (apiShortName !== routeId) continue;

        hasAnyRealTimeForRoute = true;

        // Unique trip identifier: trip_id + start_time (covers duplicate trip_ids)
        const tripKey = `${trip.trip_id}_${trip.start_time}_${trip.start_date}`;

        // Find the update for our requested stop that is closest (upcoming)
        const updates = tu.stop_time_update || [];
        let bestUpdate = null;
        let bestMinutesAway = Infinity;

        for (const update of updates) {
          const sid = update.stop_id;
          if (!resolvedStopIds.includes(sid)) continue;

          // Skip if we already have a prediction for this trip at this stop
          const seenSet = seenTripsPerStop.get(sid);
          if (seenSet.has(tripKey)) continue;

          // Calculate minutes away from arrival.time or delay
          let minutesAway = null;
          const arrivalTime = update.arrival?.time;
          const departureTime = update.departure?.time;
          const delay = update.arrival?.delay ?? update.departure?.delay ?? 0;

          if (arrivalTime || departureTime) {
            const refTime = arrivalTime || departureTime;
            minutesAway = Math.round(
              (Number(refTime) * 1000 - Date.now()) / 60000,
            );
          } else if (delay && gtfs.scheduleData) {
            const scheduledArrivals = gtfs.getScheduledTimes(routeId, sid);
            if (scheduledArrivals?.length > 0) {
              const scheduledMin = scheduledArrivals[0].minutes_away;
              minutesAway = Math.max(0, scheduledMin + Math.round(delay / 60));
            } else {
              minutesAway = Math.max(1, Math.min(30, Math.round(delay / 60)));
            }
          }

          if (minutesAway === null) continue;
          if (minutesAway < -2 || minutesAway > 120) continue;

          // Keep the closest upcoming update for this trip
          if (minutesAway < bestMinutesAway) {
            bestMinutesAway = minutesAway;
            bestUpdate = {
              stopId: sid,
              minutes_away: Math.max(0, minutesAway),
              delay,
              tripKey,
            };
          }
        }

        // If we found a good update for this trip, add it
        if (bestUpdate) {
          const sid = bestUpdate.stopId;
          seenTripsPerStop.get(sid).add(tripKey);
          predictionsByStop.get(sid).push({
            route: routeId,
            minutes_away: bestUpdate.minutes_away,
            arrival_text:
              bestUpdate.minutes_away <= 1
                ? "Due"
                : `${bestUpdate.minutes_away} min${bestUpdate.minutes_away !== 1 ? "s" : ""}`,
            delay: bestUpdate.delay,
            realtime: true,
          });
          // Update direction if headsign available
          if (trip.trip_headsign && stops[sid]) {
            stops[sid].direction = trip.trip_headsign;
          }
        }
      }
    }

    // Build results — one per requested stop
    const results = [];
    for (const sid of resolvedStopIds) {
      const stopData = stops[sid];
      let buses = predictionsByStop.get(sid) || [];

      // Sort closest first
      buses.sort((a, b) => a.minutes_away - b.minutes_away);

      // If no real-time data, fall back to scheduled
      if (buses.length === 0) {
        if (hasAnyRealTimeForRoute) {
          // Route has live data but no active buses right now — show scheduled
          buses = getGenericSchedule(routeId, sid, stopData.direction);
        } else {
          buses = getGenericSchedule(routeId, sid, stopData.direction);
        }
      }

      results.push({
        stop_name: stopData.stop_name,
        direction: stopData.direction,
        stop_id: stopData.stop_id,
        buses: buses.slice(0, 4),
        realtime_data: buses.some((b) => b.realtime === true),
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
      const buses = getGenericSchedule(routeId, sid, stopData.direction);
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
// VEHICLE POSITIONS - Live GPS positions from NTA for accurate real-time ETA
// -----------------------------------------------------------------------------
// Fetches live vehicle positions and trip updates, then estimates arrival
// at requested stops by matching trip_id between both feeds.
app.get("/api/bus-vehicles", async (req, res) => {
  const routeId = req.query.route || "19";
  const stopsParam = req.query.stops || "8220DB000092";
  const requestedStopIds = stopsParam.split(",").map((s) => s.trim());

  try {
    const [vehicleRes, tripRes] = await Promise.all([
      axios.get(VEHICLES_URL, {
        params: { format: "json" },
        headers: { "x-api-key": API_KEY, "Cache-Control": "no-cache" },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        timeout: 15000,
      }),
      axios.get(REALTIME_URL, {
        params: { format: "json" },
        headers: { "x-api-key": API_KEY, "Cache-Control": "no-cache" },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        timeout: 15000,
      }),
    ]);

    const now = Date.now();
    const vehicles = vehicleRes.data.entity || [];
    const tripUpdates = tripRes.data.entity || [];

    // Build map: trip_id -> stop_time_updates
    const tripUpdateMap = new Map();
    for (const entity of tripUpdates) {
      if (!entity.trip_update) continue;
      const trip = entity.trip_update.trip;
      if (!trip) continue;
      tripUpdateMap.set(
        trip.trip_id,
        entity.trip_update.stop_time_update || [],
      );
    }

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

    const stopData = {};
    for (const stopId of requestedStopIds) {
      const info = gtfs.scheduleData.stops.get(stopId) || {};
      const nameInfo = stopInfo[stopId];
      stopData[stopId] = {
        name: nameInfo?.name || info.name || stopId,
        direction: nameInfo?.direction || "Unknown",
        lat: parseFloat(info.lat),
        lon: parseFloat(info.lon),
      };
    }

    const predictions = {};

    for (const entity of vehicles) {
      if (!entity.vehicle) continue;
      const v = entity.vehicle;
      const trip = v.trip;
      if (!trip) continue;

      const apiRouteId = trip.route_id || "";
      const apiRouteParts = apiRouteId.split(" ");
      const apiShortName =
        apiRouteParts.length >= 3 ? apiRouteParts[1] : apiRouteId;
      if (apiShortName !== routeId) continue;

      const position = v.position;
      if (!position || position.latitude == null) continue;

      const vehLat = position.latitude;
      const vehLon = position.longitude;
      const vehTimestamp = v.timestamp
        ? Number(v.timestamp) * 1000
        : entity.vehicle?.timestamp
          ? Number(entity.vehicle.timestamp) * 1000
          : now;
      const vehicleId = v.vehicle?.id || entity.id || "unknown";
      const tripId = trip.trip_id;

      const stopUpdates = tripUpdateMap.get(tripId) || [];

      for (const update of stopUpdates) {
        const stopId = update.stop_id;
        if (!stopData[stopId]) continue;

        const stopLat = stopData[stopId].lat;
        const stopLon = stopData[stopId].lon;
        if (!stopLat || !stopLon) continue;

        const distKm = haversineKm(vehLat, vehLon, stopLat, stopLon);
        const minutesAway = Math.max(1, Math.round(distKm / 0.5));
        if (distKm > 15) continue;

        if (!predictions[stopId]) predictions[stopId] = [];
        predictions[stopId].push({
          vehicle_id: vehicleId,
          minutes_away: minutesAway,
          arrival_text:
            minutesAway <= 1
              ? "Due"
              : `${minutesAway} min${minutesAway !== 1 ? "s" : ""}`,
          distance_km: Math.round(distKm * 10) / 10,
          position: {
            lat: vehLat,
            lon: vehLon,
            bearing: position.bearing || null,
            updated: new Date(vehTimestamp).toISOString(),
          },
          headsign: trip.trip_headsign || null,
          realtime: true,
        });
      }
    }

    const results = [];
    let anyRealtime = false;
    for (const stopId of requestedStopIds) {
      const buses = (predictions[stopId] || [])
        .sort((a, b) => a.minutes_away - b.minutes_away)
        .slice(0, 4);
      if (buses.some((b) => b.realtime)) anyRealtime = true;
      results.push({
        stop_name: stopData[stopId].name,
        direction: stopData[stopId].direction,
        stop_id: stopId,
        buses,
        realtime_data: buses.some((b) => b.realtime),
      });
    }

    res.json({
      success: true,
      last_updated: new Date().toISOString(),
      route: routeId,
      stops: results,
      source: anyRealtime ? "vehicle_realtime" : "no_vehicles",
    });
  } catch (error) {
    console.error("Vehicle API error:", error.message);
    res.json({ success: false, error: error.message });
  }
});

// Add a debug endpoint to check what stops have real-time data
app.get("/api/bus-debug", async (req, res) => {
  try {
    const response = await axios.get(REALTIME_URL, {
      params: {
        format: "json",
      },
      headers: { "x-api-key": API_KEY, "Cache-Control": "no-cache" },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 10000,
    });

    const routesWithData = new Set();
    const stopsWithData = new Set();

    if (response.data && response.data.entity) {
      for (const entity of response.data.entity) {
        if (entity.trip_update) {
          const routeId = entity.trip_update.trip?.route_id;
          if (routeId) routesWithData.add(routeId);

          const updates = entity.trip_update.stop_time_update || [];
          for (const update of updates) {
            if (update.stop_id) stopsWithData.add(update.stop_id);
          }
        }
      }
    }

    res.json({
      realtime_available: routesWithData.size > 0,
      routes_with_data: Array.from(routesWithData),
      stops_with_data: Array.from(stopsWithData),
      total_entities: response.data?.entity?.length || 0,
    });
  } catch (error) {
    res.json({
      realtime_available: false,
      error: error.message,
    });
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
// NEWS API – FIXED with proper User-Agent and error handling
// -----------------------------------------------------------------------------
app.get("/api/news", async (req, res) => {
  const rssUrl = req.query.url || "https://www.thejournal.ie/feed/";
  console.log(`📰 Fetching news from: ${rssUrl}`);
  try {
    const response = await axios.get(rssUrl, {
      responseType: "text",
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      // Uncomment if you have SSL certificate issues (temporary)
      // httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
    res.type("application/xml").send(response.data);
    console.log("✅ News feed fetched successfully");
  } catch (error) {
    console.error("❌ News API error:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
    }
    // Return a more useful fallback
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>News (Fallback)</title>
<description>Unable to fetch live news at this time</description>
<item>
<title>⚠️ Cannot reach RSS feed – check server internet</title>
<link>#</link>
<description>Error: ${error.message}</description>
<pubDate>${new Date().toUTCString()}</pubDate>
</item>
</channel>
</rss>`;
    res.type("application/xml").status(200).send(fallbackXml);
  }
});

// -----------------------------------------------------------------------------
// HEALTH CHECK
// -----------------------------------------------------------------------------
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// -----------------------------------------------------------------------------
// START SERVER
// -----------------------------------------------------------------------------
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 API base: http://page.handihomepage.com:${PORT}/`);
  console.log(`🚌 Bus API: /api/bus-realtime?route={routeId}&stops={stopIds}`);
  console.log(`📰 News API: /api/news?url=...`);
  console.log(`❤️ Health: /health`);

  // Load GTFS static timetable data for fallback scheduled times
  // Don't await — let the server start serving immediately
  gtfs
    .initGTFS()
    .then(() => {
      console.log(`
🚌 GTFS data loaded — scheduled fallback times now available`);
    })
    .catch((err) => {
      console.error(`
⚠️ GTFS failed to load: ${err.message}`);
    });
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing server...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
