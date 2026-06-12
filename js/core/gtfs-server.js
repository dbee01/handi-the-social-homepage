// js/core/gtfs-server.js
// GTFS static + realtime server using node-gtfs library (ESM, loaded dynamically).
// =============================================================================

const path = require("path");
const fs = require("fs");
const https = require("https");
const AdmZip = require("adm-zip");

let gtfsLib = null;
let db = null;

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
  try {
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
  } catch (e) {
    console.error("[GTFS] Import error:", e.message);
  }
}

async function ensureLib() {
  if (!gtfsLib) {
    gtfsLib = await import("gtfs");
  }
  return gtfsLib;
}

function getDb() {
  if (!db && gtfsLib) {
    db = gtfsLib.openDb(config);
  }
  return db;
}

// Get all route IDs
async function getAllRoutes() {
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
  try {
    const lib = await ensureLib();
    const _db = getDb() || lib.openDb(config);
    if (!db) db = _db;
    const stops = lib.getStops({ route_id: routeId });
    const seen = new Set();
    const unique = [];
    for (const s of stops) {
      if (!seen.has(s.stop_id)) {
        seen.add(s.stop_id);
        unique.push({
          stop_id: s.stop_id,
          stop_name: s.stop_name || s.stop_id,
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

    // Enrich with headsign from trips
    return upcoming.map((st) => {
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
      };
    });
  } catch (e) {
    console.error("[GTFS] getUpcomingDepartures error:", e.message);
    return [];
  }
}

module.exports = {
  doImport,
  getAllRoutes,
  getRouteStops,
  getUpcomingDepartures,
};
