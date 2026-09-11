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

const REALTIME_URL = "https://api.nationaltransport.ie/gtfsr/v2/TripUpdates";
const API_KEY = process.env.BUS_API_KEY || "";

let gtfsLib = null;
let db = null;
let importReady = false;
let importPromise = null;
let refreshPromise = null; // in-flight background refresh (stale-while-revalidate)
let gtfsMissingLogged = false;

// Load config
const configPath = path.join(__dirname, "..", "..", "config.json");
let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (e) {
  console.error("Failed to load config.json:", e.message);
  config = {};
}

// Persistent GTFS database location. Defaults to <repo>/data/gtfs.sqlite so the
// imported static timetable survives process restarts and rsync deploys (the
// deploy excludes only node_modules/.env/.gtfs-cache, leaving data/ intact).
// Override with GTFS_DB_PATH for custom/testing locations.
const GTFS_DB_PATH =
  process.env.GTFS_DB_PATH ||
  path.join(__dirname, "..", "..", "data", "gtfs.sqlite");
// Temporary path an import writes to BEFORE it is atomically swapped over the
// live DB. This ensures a background refresh never mutates the file that
// active requests are reading from.
const GTFS_TMP_PATH = GTFS_DB_PATH + ".tmp";
// How long (ms) an on-disk import is considered fresh before re-downloading.
// Default 24h. Set GTFS_TTL_MS=0 to force a refresh on every start.
const GTFS_TTL_MS = process.env.GTFS_TTL_MS
  ? parseInt(process.env.GTFS_TTL_MS, 10)
  : 24 * 60 * 60 * 1000;
// Sidecar marker recording the last successful import time (sqlite has no
// reliable mtime we control — the file may be touched by open/query).
const GTFS_MARKER = GTFS_DB_PATH + ".meta.json";

config.sqlitePath = GTFS_DB_PATH;

function markImportFresh() {
  try {
    fs.mkdirSync(path.dirname(GTFS_DB_PATH), { recursive: true });
    fs.writeFileSync(
      GTFS_MARKER,
      JSON.stringify({ importedAt: Date.now(), sqlitePath: GTFS_DB_PATH }),
    );
  } catch (e) {
    /* non-fatal */
  }
}

// Returns true if a previously-imported DB is present and still within TTL.
function isCachedFresh() {
  try {
    if (!fs.existsSync(GTFS_DB_PATH)) return false;
    if (!fs.existsSync(GTFS_MARKER)) return false;
    const meta = JSON.parse(fs.readFileSync(GTFS_MARKER, "utf8"));
    if (!meta.importedAt) return false;
    if (GTFS_TTL_MS === 0) return false;
    return Date.now() - meta.importedAt < GTFS_TTL_MS;
  } catch (e) {
    return false;
  }
}

// Import GTFS static data.
// The config now lists three static-zip URLs under `agencies[].url`, which
// node-gtfs's importGtfs() downloads and imports natively (one agency each for
// Bus Éireann, Dublin Bus, and Go-Ahead).
//
async function doImport() {
  // Prevent double import
  if (importPromise) return importPromise;

  importPromise = (async () => {
    try {
      const hostname = require("os").hostname();
      // Skip download/import only when explicitly disabled via env var, or on
      // a plain localhost dev loop. Previously this also matched developer
      // machine hostnames ("daz-*", "*pav*"), which silently disabled bus
      // routes on those hosts — removed so production/dev hosts that share
      // the machine name still load GTFS data.
      if (
        process.env.SKIP_GTFS_DOWNLOAD === "true" ||
        hostname === "localhost"
      ) {
        console.log("[GTFS] Dev mode — skipping GTFS download/import");
        importReady = true;
        return;
      }

      // Reuse a fresh on-disk import instead of re-downloading the zips on
      // every start (the static feed is updated only ~daily and the full
      // import takes minutes). If the cached DB is still within TTL AND still
      // contains routes, open it directly and skip the expensive download +
      // import.
      if (isCachedFresh()) {
        try {
          const lib = await ensureLib();
          db = lib.openDb(config);
          const routeCount = lib.getRoutes({}, [], [], { limit: 1 }).length;
          if (routeCount > 0) {
            console.log(
              `[GTFS] Using cached static data (${GTFS_DB_PATH}, imported within TTL)`,
            );
            importReady = true;
            return;
          }
          // Cached DB is empty/corrupt — fall through to a fresh import.
          console.warn("[GTFS] Cached DB has no routes; re-importing");
        } catch (e) {
          console.warn("[GTFS] Cached DB unusable; re-importing:", e.message);
          db = null;
        }
      }

      await doFreshImport();
      importReady = true;
    } catch (e) {
      console.error("[GTFS] Import error:", e.message);
      importReady = false;
    }
  })();
  return importPromise;
}

// Close any connection handle we're holding. node-gtfs keeps its own cache of
// open connections keyed by sqlite path, so we also drop that handle before we
// rewrite/replace the underlying file.
function closeHeldDb() {
  try {
    if (gtfsLib && db) gtfsLib.closeDb(db);
  } catch (e) {
    /* ignore */
  }
  db = null;
}

// Download + import the static zips into a TEMP sqlite file, then atomically
// rename it over the live path. This keeps active readers (an already-open db
// handle on the live file) consistent while the refresh is in progress, then
// swaps in the complete new dataset in a single operation.
async function doFreshImport() {
  const lib = await ensureLib();
  fs.mkdirSync(path.dirname(GTFS_TMP_PATH), { recursive: true });

  // Write to the temporary path so the live DB is never mutated mid-read.
  const tmpConfig = Object.assign({}, config, { sqlitePath: GTFS_TMP_PATH });
  await lib.importGtfs(tmpConfig);

  // Drop any handle to the tmp file, then swap it into place.
  try {
    const tmpDb = lib.openDb(tmpConfig);
    lib.closeDb(tmpDb);
  } catch (e) {
    /* ignore */
  }
  if (fs.existsSync(GTFS_DB_PATH)) fs.rmSync(GTFS_DB_PATH, { force: true });
  fs.renameSync(GTFS_TMP_PATH, GTFS_DB_PATH);
  // Reset our live handle so the next query re-opens the freshly-swapped file.
  closeHeldDb();
  markImportFresh();
  console.log("[GTFS] Static data imported successfully");
}

// Stale-while-revalidate: if the on-disk data is serving fine but its freshness
// marker has lapsed, kick off a background refresh WITHOUT blocking the caller.
// Returns true if a refresh was started.
function maybeStartBackgroundRefresh() {
  if (refreshPromise) return false; // already refreshing
  if (process.env.SKIP_GTFS_DOWNLOAD === "true") return false;
  if (isCachedFresh()) return false; // still fresh

  refreshPromise = (async () => {
    try {
      console.log(
        "[GTFS] Background refresh started (cache expired, serving stale data meanwhile)",
      );
      await doFreshImport();
      console.log("[GTFS] Background refresh complete");
    } catch (e) {
      console.error("[GTFS] Background refresh failed:", e.message);
    } finally {
      refreshPromise = null;
    }
  })();
  return true;
}

async function ensureLib() {
  if (!gtfsLib) {
    try {
      gtfsLib = await import("gtfs");
    } catch (e) {
      // gtfs is an optional dependency (its native better-sqlite3 module
      // can't build on hosts without Python/build tools). The bus endpoints
      // already handle a missing library gracefully — log it once only.
      if (!gtfsMissingLogged) {
        gtfsMissingLogged = true;
        console.warn(
          "[GTFS] 'gtfs' library unavailable (native better-sqlite3 not built on this host) — static bus data disabled",
        );
      }
      throw e;
    }
  }
  return gtfsLib;
}

async function waitForImport() {
  if (importReady) {
    // Serve from cache immediately; opportunistically refresh in the
    // background if the data has gone stale.
    maybeStartBackgroundRefresh();
    return;
  }
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
