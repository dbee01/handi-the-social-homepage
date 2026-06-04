const fs = require("fs");
const path = require("path");
const https = require("https");
const AdmZip = require("adm-zip");

const GTFS_CACHE_DIR = path.join(__dirname, ".gtfs-cache");
const GTFS_CACHE_FILE = path.join(GTFS_CACHE_DIR, "gtfs-cache.json");
const GTFS_URLS = {
  busEireann:
    "https://www.transportforireland.ie/transitData/Data/GTFS_Bus_Eireann.zip",
  dublinBus:
    "https://www.transportforireland.ie/transitData/Data/GTFS_Dublin_Bus.zip",
  goAhead:
    "https://www.transportforireland.ie/transitData/Data/GTFS_GoAhead.zip",
};

// In-memory schedule data
let scheduleData = {
  // routeId -> { tripId -> [stopTime, ...] }
  routes: new Map(),
  // stopId -> { name, ... }
  stops: new Map(),
  // routeId -> { headsign, direction }
  trips: new Map(),
  // day of week (0=Sun, 6=Sat) -> Set of serviceIds active
  calendar: new Map(),
  // serviceId -> Set of exceptional dates (YYYYMMDD strings)
  calendarDates: new Map(),
};

function saveCache() {
  try {
    // Build a plain JSON-serializable structure
    const data = {
      stops: Array.from(scheduleData.stops.entries()),
      calendar: Array.from(scheduleData.calendar.entries()),
      calendarDates: Array.from(scheduleData.calendarDates.entries()).map(
        ([k, v]) => [k, Array.from(v.entries())],
      ),
      routes: Array.from(scheduleData.routes.entries()).map(([id, r]) => [
        id,
        {
          shortName: r.shortName,
          longName: r.longName,
          trips: r.trips.map((t) => ({
            tripId: t.tripId,
            serviceId: t.serviceId,
            headsign: t.headsign,
            directionId: t.directionId,
            stopTimes: (t.stopTimes || []).map((st) => ({
              stopId: st.stopId,
              arrivalTime: st.arrivalTime,
              departureTime: st.departureTime,
              stopSequence: st.stopSequence,
            })),
          })),
        },
      ]),
    };
    fs.mkdirSync(GTFS_CACHE_DIR, { recursive: true });
    fs.writeFileSync(GTFS_CACHE_FILE, JSON.stringify(data));
    const size = fs.statSync(GTFS_CACHE_FILE).size / 1024 / 1024;
    console.log(`   → Cache saved (${size.toFixed(1)} MB)`);
  } catch (err) {
    console.error(`   ⚠️ Failed to save cache: ${err.message}`);
  }
}

function loadCache() {
  try {
    if (!fs.existsSync(GTFS_CACHE_FILE)) return false;
    const raw = fs.readFileSync(GTFS_CACHE_FILE, "utf8");
    const data = JSON.parse(raw);
    scheduleData.stops = new Map(data.stops);
    scheduleData.calendar = new Map(data.calendar);
    scheduleData.calendarDates = new Map(
      data.calendarDates.map(([k, v]) => [k, new Map(v)]),
    );
    scheduleData.routes = new Map(data.routes);
    const mb = (fs.statSync(GTFS_CACHE_FILE).size / 1024 / 1024).toFixed(1);
    console.log(`   → Loaded from cache (${mb} MB)`);
    console.log(
      `   → ${scheduleData.stops.size} stops, ${scheduleData.routes.size} routes`,
    );
    return true;
  } catch (err) {
    console.error(`   ⚠️ Failed to load cache: ${err.message}`);
    return false;
  }
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { rejectUnauthorized: false }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    results.push(row);
  }
  return results;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function getServiceIdsForDay(dayOfWeek) {
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const col = dayNames[dayOfWeek];
  const active = new Set();
  for (const [serviceId, days] of scheduleData.calendar) {
    if (days[col] === "1") {
      active.add(serviceId);
    }
  }
  return active;
}

function isServiceActiveOnDate(serviceId, dateStr) {
  // Check if this service has specific date additions/exceptions
  const exceptions = scheduleData.calendarDates.get(serviceId);
  if (!exceptions) {
    // No exceptions means it follows the regular calendar
    return true;
  }

  // If there's an exception for this date, it overrides normal calendar
  if (exceptions.has(dateStr)) {
    return exceptions.get(dateStr) === "1"; // 1 = added, 2 = removed
  }

  // No exception for this date means it follows calendar
  return true;
}

function parseTimeToMinutes(timeStr) {
  // GTFS times can go beyond 24:00 (e.g., 25:30:00 for late night)
  const parts = timeStr.split(":");
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0]) || 0;
  const m = parseInt(parts[1]) || 0;
  return h * 60 + m;
}

function minutesToTimeStr(minutes) {
  const hrs = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

async function loadGTFS(gtfsUrl) {
  console.log(`\n📦 Downloading GTFS static data...`);
  console.log(`   → URL: ${gtfsUrl}`);

  const buffer = await downloadFile(gtfsUrl);
  console.log(`   → Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);

  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  const files = {};
  for (const entry of entries) {
    if (!entry.isDirectory) {
      files[entry.entryName] = entry.getData().toString("utf8");
    }
  }

  // Parse stops
  if (files["stops.txt"]) {
    const stops = parseCSV(files["stops.txt"]);
    for (const s of stops) {
      if (s.stop_id) {
        scheduleData.stops.set(s.stop_id, {
          name: s.stop_name || s.stop_id,
          lat: s.stop_lat,
          lon: s.stop_lon,
        });
      }
    }
    console.log(`   → Loaded ${scheduleData.stops.size} stops`);
  }

  // Parse calendar
  if (files["calendar.txt"]) {
    const calendar = parseCSV(files["calendar.txt"]);
    const dayCols = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    for (const c of calendar) {
      const days = {};
      for (const col of dayCols) {
        days[col] = c[col] || "0";
      }
      scheduleData.calendar.set(c.service_id, days);
    }
    console.log(`   → Loaded ${scheduleData.calendar.size} calendar entries`);
  }

  // Parse calendar_dates (exceptions)
  if (files["calendar_dates.txt"]) {
    const dates = parseCSV(files["calendar_dates.txt"]);
    for (const d of dates) {
      if (!scheduleData.calendarDates.has(d.service_id)) {
        scheduleData.calendarDates.set(d.service_id, new Map());
      }
      scheduleData.calendarDates
        .get(d.service_id)
        .set(d.date, d.exception_type || "1");
    }
    console.log(`   → Loaded ${dates.length} calendar date exceptions`);
  }

  // Parse routes
  if (files["routes.txt"]) {
    const routes = parseCSV(files["routes.txt"]);
    for (const r of routes) {
      if (!scheduleData.routes.has(r.route_id)) {
        scheduleData.routes.set(r.route_id, {
          shortName: r.route_short_name || r.route_id,
          longName: r.route_long_name || "",
          trips: [],
        });
      }
    }
    console.log(`   → Loaded ${scheduleData.routes.size} routes`);
  }

  // Parse trips (map routes to trips)
  if (files["trips.txt"]) {
    const trips = parseCSV(files["trips.txt"]);
    for (const t of trips) {
      if (scheduleData.routes.has(t.route_id)) {
        scheduleData.routes.get(t.route_id).trips.push({
          tripId: t.trip_id,
          serviceId: t.service_id,
          headsign: t.trip_headsign || "",
          directionId: t.direction_id || "0",
          shapeId: t.shape_id || "",
          blockId: t.block_id || "",
        });
      }
    }
    console.log(`   → Loaded ${trips.length} trips`);
  }

  // Parse stop_times
  if (files["stop_times.txt"]) {
    // stop_times is usually the largest file, parse it streaming-style in chunks
    // But for in-memory, we'll parse it all at once (it's typically 50-200MB)
    const stopTimes = parseCSV(files["stop_times.txt"]);
    const stopTimesByTrip = new Map();
    for (const st of stopTimes) {
      if (!st.trip_id || !st.stop_id) continue;
      if (!stopTimesByTrip.has(st.trip_id)) {
        stopTimesByTrip.set(st.trip_id, []);
      }
      stopTimesByTrip.get(st.trip_id).push({
        stopId: st.stop_id,
        arrivalTime: parseTimeToMinutes(
          st.arrival_time || st.departure_time || "00:00:00",
        ),
        departureTime: parseTimeToMinutes(
          st.departure_time || st.arrival_time || "00:00:00",
        ),
        stopSequence: parseInt(st.stop_sequence) || 0,
      });
    }

    // Sort stop times by sequence
    for (const [tripId, times] of stopTimesByTrip) {
      times.sort((a, b) => a.stopSequence - b.stopSequence);
    }

    // Attach stop times to routes
    for (const [routeId, route] of scheduleData.routes) {
      for (const trip of route.trips) {
        if (stopTimesByTrip.has(trip.tripId)) {
          trip.stopTimes = stopTimesByTrip.get(trip.tripId);
        }
      }
    }
    console.log(
      `   → Loaded ${stopTimes.length} stop times across ${stopTimesByTrip.size} trips`,
    );
  }

  console.log(`   ✅ GTFS data loaded successfully`);
}

function getCurrentDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * Look up a route by its short name (e.g. "223" finds "2 223 c b")
 */
function findRouteByShortName(shortName) {
  for (const [id, route] of scheduleData.routes) {
    if (route.shortName === shortName) {
      return route;
    }
  }
  return null;
}

/**
 * Get scheduled arrivals for a given route at a given stop
 * Returns an array of { minutes_away, arrival_text, route, scheduled }
 */
function getScheduledTimes(routeId, stopId, requestedShortId) {
  // Try direct lookup first (full GTFS route ID), then fall back to short name lookup
  let route = scheduleData.routes.get(routeId);
  if (!route) {
    route = findRouteByShortName(routeId);
  }
  if (!route) return [];

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  const dateStr = getCurrentDateStr();

  // Get active service IDs for today
  const activeServices = getServiceIdsForDay(dayOfWeek);

  // Find trips on this route that serve this stop and are active today
  const arrivals = [];

  for (const trip of route.trips) {
    // Check if this trip's service is active today
    if (!activeServices.has(trip.serviceId)) continue;
    if (!isServiceActiveOnDate(trip.serviceId, dateStr)) continue;

    // Find the stop time for the requested stop
    if (!trip.stopTimes) continue;
    const stopTime = trip.stopTimes.find((st) => st.stopId === stopId);
    if (!stopTime) continue;

    const arrivalMinutes = stopTime.arrivalTime;
    // Only show future arrivals
    if (arrivalMinutes <= currentMinutes) continue;

    const minutesAway = arrivalMinutes - currentMinutes;

    // Deduplicate: skip if we already have this exact arrival time
    const existingMinutes = arrivals.map((a) => a.minutes_away);
    if (existingMinutes.includes(minutesAway)) continue;

    arrivals.push({
      route: route.shortName || routeId,
      minutes_away: minutesAway,
      arrival_text:
        minutesAway <= 1
          ? "Due"
          : `${minutesAway} min${minutesAway !== 1 ? "s" : ""}`,
      scheduled: true,
      headsign: trip.headsign,
      scheduled_time: minutesToTimeStr(arrivalMinutes),
    });
  }

  // Sort by minutes away and return top 4
  arrivals.sort((a, b) => a.minutes_away - b.minutes_away);
  return arrivals.slice(0, 4);
}

/**
 * Initialize GTFS data. Call on server startup.
 * Returns true if data loaded successfully.
 */
async function initGTFS() {
  // Try loading from disk cache first (takes ~1s)
  if (loadCache()) {
    return true;
  }

  // Download and parse from scratch (takes ~20s)
  try {
    await loadGTFS(GTFS_URLS.busEireann);
    saveCache();
    return true;
  } catch (err) {
    console.error(`\n❌ Failed to load GTFS data: ${err.message}`);
    console.log(`   → Scheduled times will not be available`);
    return false;
  }
}

module.exports = {
  initGTFS,
  getScheduledTimes,
  scheduleData, // exposed for debugging
};
