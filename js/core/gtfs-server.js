/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// js/core/gtfs-server.js
// GTFS static + realtime server using node-gtfs library (ESM, loaded dynamically).
// =============================================================================

const path = require("path");
const fs = require("fs");
const https = require("https");
const AdmZip = require("adm-zip");

const REALTIME_URL = "https://api.nationaltransport.ie/gtfsr/v2/TripUpdates";
const API_KEY = process.env.BUS_API_KEY || "";

let gtfsLib = null;
let db = null;
let importReady = false;
let importPromise = null;

// Load config
const configPath = path.join(__dirname, "..", "..", "config.json");
let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (e) {
  console.error("Failed to load config.json:", e.message);
  config = { sqlitePath: "/tmp/gtfs.sqlite" };
}

// Download a file over HTTPS
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https
      .get(url, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          file.close();
          fs.unlinkSync(destPath);
          return downloadFile(res.headers.location, destPath)
            .then(resolve)
            .catch(reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destPath);
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (e) => {
        file.close();
        fs.unlinkSync(destPath);
        reject(e);
      });
  });
}

// Pre-download and unzip a remote GTFS zip to /tmp/gtfs_extracted
async function prepareGtfsSource() {
  const agency = config.agencies?.[0];
  if (!agency || !agency.path) return;
  const src = agency.path;

  // If it's a local directory, use directly
  if (!src.startsWith("http")) return;

  const extractDir = "/tmp/gtfs_extracted";
  const zipPath = "/tmp/gtfs_download.zip";

  // Check if already extracted recently (within 24h)
  if (fs.existsSync(extractDir)) {
    try {
      const stat = fs.statSync(extractDir);
      if (Date.now() - stat.mtimeMs < 86400000) {
        agency.path = extractDir;
        return;
      }
    } catch (e) {
      /* re-extract */
    }
  }

  console.log(`[GTFS] Downloading ${src}...`);
  try {
    await downloadFile(src, zipPath);
    console.log(`[GTFS] Unzipping...`);
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractDir, true);
    fs.unlinkSync(zipPath);
    // Point config to extracted dir
    agency.path = extractDir;
    console.log(`[GTFS] Extracted to ${extractDir}`);
  } catch (e) {
    console.error(`[GTFS] Download/unzip error: ${e.message}`);
    // Clean up
    try {
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    } catch (_) {}
  }
}

// Import GTFS static data
async function doImport() {
  // Prevent double import
  if (importPromise) return importPromise;

  importPromise = (async () => {
    try {
      const hostname = require("os").hostname();
      // Skip download/import on local dev or when explicitly disabled
      if (
        process.env.SKIP_GTFS_DOWNLOAD === "true" ||
        hostname === "localhost" ||
        hostname.startsWith("daz-") ||
        hostname.includes("pav")
      ) {
        console.log("[GTFS] Dev mode — skipping GTFS download/import");
        importReady = true;
        return;
      }
      await prepareGtfsSource();
      const lib = await ensureLib();
      await lib.importGtfs(config);
      if (db) {
        try {
          gtfsLib.closeDb(db);
        } catch (e) {
          /* ignore */
        }
        db = null;
      }
      console.log("[GTFS] Static data imported successfully");
      importReady = true;
    } catch (e) {
      console.error("[GTFS] Import error:", e.message);
      importReady = false;
    }
  })();
  return importPromise;
}

async function ensureLib() {
  if (!gtfsLib) {
    gtfsLib = await import("gtfs");
  }
  return gtfsLib;
}

async function waitForImport() {
  if (importReady) return;
  if (importPromise) await importPromise;
}

function getDb() {
  if (!db && gtfsLib) {
    db = gtfsLib.openDb(config);
  }
  return db;
}

// Get all route IDs
async function getAllRoutes() {
  await waitForImport();
  try {
    const lib = await ensureLib();
    const _db = getDb() || lib.openDb(config);
    if (!db) db = _db;
    const routes = lib.getRoutes({}, [], [["route_short_name", "ASC"]]);
    return routes.map((r) => ({
      route_id: r.route_id,
      short_name: r.route_short_name || r.route_id,
      long_name: r.route_long_name || "",
    }));
  } catch (e) {
    console.error("[GTFS] getRoutes error:", e.message);
    return [];
  }
}

// Get all stops for a route
async function getRouteStops(routeId) {
  await waitForImport();
  try {
    const lib = await ensureLib();
    const _db = getDb() || lib.openDb(config);
    if (!db) db = _db;
    const stops = lib.getStops({ route_id: routeId });
    const seen = new Set();
    const seenNames = new Set();
    const unique = [];
    for (const s of stops) {
      const name = s.stop_name || s.stop_id;
      if (!seen.has(s.stop_id) && !seenNames.has(name)) {
        seen.add(s.stop_id);
        seenNames.add(name);
        unique.push({
          stop_id: s.stop_id,
          stop_name: name,
          stop_lat: s.stop_lat,
          stop_lon: s.stop_lon,
        });
      }
    }
    return unique;
  } catch (e) {
    console.error("[GTFS] getRouteStops error:", e.message);
    return [];
  }
}

function secsToTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

async function getUpcomingDepartures(routeId, stopId, limit = 3) {
  await waitForImport();
  try {
    const lib = await ensureLib();
    const _db = getDb() || lib.openDb(config);
    if (!db) db = _db;
    // GTFS data is in Irish local time — format the date in Europe/Dublin timezone
    const nowStr = new Date().toLocaleString("en-IE", {
      timeZone: "Europe/Dublin",
    });
    const now = new Date(nowStr);
    const nowSecs =
      now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const dateInt = parseInt(`${y}${m}${d}`, 10);

    // Get trip_ids for this route (optionally filtered by date via service_id)
    const tripIds = lib.getTrips({ route_id: routeId }).map((t) => t.trip_id);
    if (tripIds.length === 0) return [];

    // Query stop_times for those trips + stop
    const stoptimes = lib.getStoptimes(
      { stop_id: stopId, date: dateInt },
      [],
      [["arrival_timestamp", "ASC"]],
    );

    // Filter to only trips on this route and upcoming
    const upcoming = stoptimes
      .filter(
        (st) => tripIds.includes(st.trip_id) && st.arrival_timestamp >= nowSecs,
      )
      .slice(0, limit);

    // Enrich with headsign from trips, then overlay realtime if available
    const departures = upcoming.map((st) => {
      const trip = lib.getTrips({ trip_id: st.trip_id })[0];
      return {
        trip_id: st.trip_id,
        arrival_time: secsToTime(st.arrival_timestamp),
        departure_time: secsToTime(st.departure_timestamp),
        minutes_away: Math.max(
          0,
          Math.floor((st.arrival_timestamp - nowSecs) / 60),
        ),
        headsign: trip?.trip_headsign || "",
        live: false,
        delay_seconds: 0,
      };
    });

    // Overlay realtime delays using manual fetch (node-gtfs fetch doesn't support custom TLS)
    if (API_KEY && departures.length > 0) {
      try {
        // Fetch realtime TripUpdates directly with TLS disabled
        const result = await new Promise((resolve, reject) => {
          https
            .get(
              REALTIME_URL,
              {
                headers: { "x-api-key": API_KEY, "Cache-Control": "no-cache" },
                rejectUnauthorized: false,
              },
              (res) => {
                const chunks = [];
                res.on("data", (c) => chunks.push(c));
                res.on("end", () => resolve(Buffer.concat(chunks)));
                res.on("error", reject);
              },
            )
            .on("error", reject);
        });

        // Parse protobuf directly
        const gtfsrt = require("../../proto/gtfs-rt.js");
        await gtfsrt.initProto();
        const data = gtfsrt.decodeFeedMessage(result);

        if (data && data.entity) {
          const tripIdsSet = new Set(departures.map((d) => d.trip_id));
          for (const entity of data.entity) {
            if (!entity.tripUpdate) continue;
            const tu = entity.tripUpdate;
            const tripId = tu.trip?.tripId || tu.trip?.trip_id;
            if (!tripId || !tripIdsSet.has(tripId)) continue;
            const updates = tu.stopTimeUpdate || [];
            for (const update of updates) {
              const uStopId = update.stopId || update.stop_id;
              if (uStopId !== stopId) continue;
              const delay =
                (update.arrival?.delay || update.departure?.delay) ?? 0;
              if (!delay) continue;
              const dep = departures.find((d) => d.trip_id === tripId);
              if (!dep) continue;
              const scheduledSt = stoptimes.find(
                (st) => st.trip_id === dep.trip_id,
              );
              const scheduledSecs = scheduledSt?.arrival_timestamp || 0;
              const realtimeSecs = scheduledSecs + delay;
              dep.delay_seconds = delay;
              dep.live = true;
              dep.arrival_time = secsToTime(realtimeSecs);
              dep.minutes_away = Math.max(
                0,

                Math.floor((realtimeSecs - nowSecs) / 60),
              );
              break;
            }
          }
        }
      } catch (e) {
        console.warn(
          "[GTFS] Realtime overlay failed, using scheduled:",
          e.message,
        );
      }
    }

    return departures;
  } catch (e) {
    console.error("[GTFS] getUpcomingDepartures error:", e.message);
    return [];
  }
}

// Get all stop IDs from GTFS for suffix mapping
async function getAllStopIds() {
  await waitForImport();
  try {
    const lib = await ensureLib();
    const _db = getDb() || lib.openDb(config);
    if (!db) db = _db;
    const stops = lib.getStops();
    return stops.map((s) => s.stop_id);
  } catch (e) {
    console.error("[GTFS] getAllStopIds error:", e.message);
    return [];
  }
}

// Get stop info (name, lat, lon) from GTFS static data
async function getStopInfo(stopId) {
  await waitForImport();
  try {
    const lib = await ensureLib();
    const _db = getDb() || lib.openDb(config);
    if (!db) db = _db;
    const stops = lib.getStops({ stop_id: stopId });
    if (stops.length === 0) return null;
    const s = stops[0];
    return {
      name: s.stop_name || s.stop_id,
      lat: s.stop_lat || null,
      lon: s.stop_lon || null,
    };
  } catch (e) {
    console.error("[GTFS] getStopInfo error:", e.message);
    return null;
  }
}

// Get the direction_id that serves this stop for this route
async function getStopDirection(routeId, stopId) {
  await waitForImport();
  try {
    const lib = await ensureLib();
    const _db = getDb() || lib.openDb(config);
    if (!db) db = _db;
    const stoptimes = lib.getStoptimes(
      { stop_id: stopId },
      [],
      [["arrival_timestamp", "ASC"]],
      { limit: 1 },
    );
    if (stoptimes.length === 0) return null;
    const trip = lib.getTrips({ trip_id: stoptimes[0].trip_id })[0];
    return trip?.direction_id ?? null;
  } catch (e) {
    return null;
  }
}

// Get scheduled departures in realtime-compatible format
async function getScheduledDepartures(routeId, stopId, limit = 4) {
  console.log(`[SCHED-CALL] route=${routeId} stop=${stopId}`);
  await waitForImport();
  try {
    const lib = await ensureLib();
    const _db = getDb() || lib.openDb(config);
    if (!db) db = _db;

    // Get current time in seconds since midnight, Europe/Dublin timezone
    const nowParts = new Intl.DateTimeFormat("en-IE", {
      timeZone: "Europe/Dublin",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const part = (t) => nowParts.find((p) => p.type === t)?.value || "0";
    const nowH = parseInt(part("hour"));
    const nowM = parseInt(part("minute"));
    const nowS = parseInt(part("second"));
    const nowSecs = nowH * 3600 + nowM * 60 + nowS;
    const dateInt = parseInt(
      `${part("year")}${part("month")}${part("day")}`,
      10,
    );

    // Get trips for this route (match by short_name inside long route_id like "2 220 c b")
    let tripIds = lib.getTrips({ route_id: routeId }).map((t) => t.trip_id);
    if (tripIds.length === 0) {
      const allTrips = lib.getTrips();
      tripIds = allTrips
        .filter((t) => {
          const parts = (t.route_id || "").split(" ");
          return parts.length >= 3 && parts[1] === routeId;
        })
        .map((t) => t.trip_id);
    }
    if (tripIds.length === 0) return [];

    const stoptimes = lib.getStoptimes(
      { stop_id: stopId, date: dateInt },
      [],
      [["arrival_timestamp", "ASC"]],
    );

    console.log(
      `[SCHED] stop=${stopId} date=${dateInt} trips=${tripIds.length} stoptimes=${stoptimes.length} nowSecs=${nowSecs}`,
    );

    return stoptimes
      .filter(
        (st) => tripIds.includes(st.trip_id) && st.arrival_timestamp >= nowSecs,
      )
      .slice(0, limit)
      .map((st) => {
        const trip = lib.getTrips({ trip_id: st.trip_id })[0];
        const mins = Math.max(
          0,
          Math.floor((st.arrival_timestamp - nowSecs) / 60),
        );
        return {
          route: routeId,
          minutes_away: mins,
          arrival_text:
            mins <= 1 ? "Due" : `${mins} min${mins !== 1 ? "s" : ""}`,
          delay: null,
          source: "schedule",
          realtime: false,
          headsign: trip?.trip_headsign || "",
          vehicle_id: null,
          trip_id: st.trip_id,
          start_time: null,
          start_date: null,
          arrival_time: null,
        };
      });
  } catch (e) {
    console.error("[GTFS] getScheduledDepartures error:", e.message);
    return [];
  }
}

module.exports = {
  doImport,
  getAllRoutes,
  getRouteStops,
  getUpcomingDepartures,
  getAllStopIds,
  getStopInfo,
  getScheduledDepartures,
  getStopDirection,
};
