const fs = require("fs");
const path = require("path");
const https = require("https");
const AdmZip = require("adm-zip");

const GTFS_CACHE_DIR = path.join(__dirname, ".gtfs-cache");
const GTFS_CACHE_FILE = path.join(GTFS_CACHE_DIR, "gtfs-cache.json");
// Split cache into chunks to avoid massive JSON.stringify memory spikes
const GTFS_CACHE_STOPS = path.join(GTFS_CACHE_DIR, "gtfs-cache-stops.json");
const GTFS_CACHE_ROUTES = path.join(GTFS_CACHE_DIR, "gtfs-cache-routes.json");
const GTFS_CACHE_CALENDAR = path.join(
  GTFS_CACHE_DIR,
  "gtfs-cache-calendar.json",
);
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

// Streaming CSV parser that processes lines without loading entire file
function parseCSVStream(text, onRow, onComplete) {
  const lines = text.split("\n");
  if (lines.length < 2) {
    onComplete();
    return;
  }
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  let i = 1;
  function processChunk() {
    const chunkEnd = Math.min(i + 5000, lines.length);
    for (; i < chunkEnd; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = parseCSVLine(line);
      if (values.length === 0) continue;
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });
      onRow(row);
    }
    if (i < lines.length) {
      setImmediate(processChunk);
    } else {
      setImmediate(onComplete);
    }
  }
  setImmediate(processChunk);
}

// Read a CSV file from a zip entry and process with streaming parser
function processZipCSV(zip, filename, onRow, onComplete) {
  const entry = zip.getEntry(filename);
  if (!entry) {
    setImmediate(onComplete);
    return;
  }
  const text = entry.getData().toString("utf8");
  parseCSVStream(text, onRow, onComplete);
}

function saveCache() {
  try {
    fs.mkdirSync(GTFS_CACHE_DIR, { recursive: true });

    // Write stops
    fs.writeFileSync(
      GTFS_CACHE_STOPS,
      JSON.stringify(Array.from(scheduleData.stops.entries())),
    );

    // Write calendar
    fs.writeFileSync(
      GTFS_CACHE_CALENDAR,
      JSON.stringify({
        calendar: Array.from(scheduleData.calendar.entries()),
        calendarDates: Array.from(scheduleData.calendarDates.entries()).map(
          ([k, v]) => [k, Array.from(v.entries())],
        ),
      }),
    );

    // Write routes (this is the biggest — 1.3M stop times)
    const routeData = Array.from(scheduleData.routes.entries()).map(
      ([id, r]) => [
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
      ],
    );
    // Write routes in chunks to avoid one massive stringify
    const CHUNK_SIZE = 5;
    for (let i = 0; i < routeData.length; i += CHUNK_SIZE) {
      const chunk = routeData.slice(i, i + CHUNK_SIZE);
      const chunkPath = path.join(
        GTFS_CACHE_DIR,
        `gtfs-cache-routes-${Math.floor(i / CHUNK_SIZE)}.json`,
      );
      fs.writeFileSync(chunkPath, JSON.stringify(chunk));
    }
    // Write manifest
    const numChunks = Math.ceil(routeData.length / CHUNK_SIZE);
    fs.writeFileSync(GTFS_CACHE_ROUTES, JSON.stringify({ numChunks }));

    const totalSizeMB = (
      (fs.statSync(GTFS_CACHE_STOPS).size +
        fs.statSync(GTFS_CACHE_CALENDAR).size +
        fs.statSync(GTFS_CACHE_ROUTES).size +
        numChunks *
          fs.statSync(path.join(GTFS_CACHE_DIR, "gtfs-cache-routes-0.json"))
            .size) /
      (1024 * 1024)
    ).toFixed(1);
    console.log(`   → Cache saved (${totalSizeMB} MB approx)`);
  } catch (err) {
    console.error(`   ⚠️ Failed to save cache: ${err.message}`);
  }
}

function loadCache() {
  try {
    if (!fs.existsSync(GTFS_CACHE_ROUTES)) return false;

    // Load stops
    if (fs.existsSync(GTFS_CACHE_STOPS)) {
      scheduleData.stops = new Map(
        JSON.parse(fs.readFileSync(GTFS_CACHE_STOPS, "utf8")),
      );
    }

    // Load calendar
    if (fs.existsSync(GTFS_CACHE_CALENDAR)) {
      const calData = JSON.parse(fs.readFileSync(GTFS_CACHE_CALENDAR, "utf8"));
      scheduleData.calendar = new Map(calData.calendar);
      scheduleData.calendarDates = new Map(
        calData.calendarDates.map(([k, v]) => [k, new Map(v)]),
      );
    }

    // Load routes from chunks
    const manifest = JSON.parse(fs.readFileSync(GTFS_CACHE_ROUTES, "utf8"));
    const routes = [];
    for (let i = 0; i < manifest.numChunks; i++) {
      const chunkPath = path.join(
        GTFS_CACHE_DIR,
        `gtfs-cache-routes-${i}.json`,
      );
      if (fs.existsSync(chunkPath)) {
        const chunk = JSON.parse(fs.readFileSync(chunkPath, "utf8"));
        routes.push(...chunk);
      }
    }
    scheduleData.routes = new Map(routes);

    const stats = fs.statSync(GTFS_CACHE_CALENDAR);
    const totalMB = (
      (stats.size + fs.statSync(GTFS_CACHE_STOPS).size) /
      (1024 * 1024)
    ).toFixed(1);
    console.log(`   → Loaded from cache (${totalMB} MB + routes)`);
    console.log(
      `   → ${scheduleData.stops.size} stops, ${scheduleData.routes.size} routes, ${manifest.numChunks} route chunks`,
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
  return new Promise((resolve, reject) => {
    console.log(`\n📦 Downloading GTFS static data...`);
    console.log(`   → URL: ${gtfsUrl}`);

    downloadFile(gtfsUrl)
      .then((buffer) => {
        console.log(
          `   → Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB`,
        );

        const zip = new AdmZip(buffer);
        // Free the buffer immediately after creating the zip
        buffer = null;

        let pending = 0;
        let hasError = false;

        function complete() {
          if (--pending === 0) {
            resolve();
          }
        }

        // Parse stops
        pending++;
        processZipCSV(
          zip,
          "stops.txt",
          (row) => {
            if (row.stop_id) {
              scheduleData.stops.set(row.stop_id, {
                name: row.stop_name || row.stop_id,
                lat: row.stop_lat,
                lon: row.stop_lon,
              });
            }
          },
          () => {
            console.log(`   → Loaded ${scheduleData.stops.size} stops`);
            complete();
          },
        );

        // Parse calendar
        pending++;
        const dayCols = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];
        let calCount = 0;
        processZipCSV(
          zip,
          "calendar.txt",
          (row) => {
            const days = {};
            for (const col of dayCols) {
              days[col] = row[col] || "0";
            }
            scheduleData.calendar.set(row.service_id, days);
            calCount++;
          },
          () => {
            console.log(`   → Loaded ${calCount} calendar entries`);
            complete();
          },
        );

        // Parse calendar_dates
        pending++;
        let cdCount = 0;
        processZipCSV(
          zip,
          "calendar_dates.txt",
          (row) => {
            if (!scheduleData.calendarDates.has(row.service_id)) {
              scheduleData.calendarDates.set(row.service_id, new Map());
            }
            scheduleData.calendarDates
              .get(row.service_id)
              .set(row.date, row.exception_type || "1");
            cdCount++;
          },
          () => {
            console.log(`   → Loaded ${cdCount} calendar date exceptions`);
            complete();
          },
        );

        // Parse routes
        pending++;
        processZipCSV(
          zip,
          "routes.txt",
          (row) => {
            if (!scheduleData.routes.has(row.route_id)) {
              scheduleData.routes.set(row.route_id, {
                shortName: row.route_short_name || row.route_id,
                longName: row.route_long_name || "",
                trips: [],
              });
            }
          },
          () => {
            console.log(`   → Loaded ${scheduleData.routes.size} routes`);
            complete();
          },
        );

        // Parse trips (batch into routes)
        pending++;
        let tripCount = 0;
        processZipCSV(
          zip,
          "trips.txt",
          (row) => {
            if (scheduleData.routes.has(row.route_id)) {
              scheduleData.routes.get(row.route_id).trips.push({
                tripId: row.trip_id,
                serviceId: row.service_id,
                headsign: row.trip_headsign || "",
                directionId: row.direction_id || "0",
                shapeId: row.shape_id || "",
                blockId: row.block_id || "",
              });
              tripCount++;
            }
          },
          () => {
            console.log(`   → Loaded ${tripCount} trips`);
            complete();
          },
        );

        // Parse stop_times — this is the big one, process in chunks
        pending++;
        let stCount = 0;
        const stopTimesByTrip = new Map();
        processZipCSV(
          zip,
          "stop_times.txt",
          (row) => {
            if (!row.trip_id || !row.stop_id) return;
            if (!stopTimesByTrip.has(row.trip_id)) {
              stopTimesByTrip.set(row.trip_id, []);
            }
            stopTimesByTrip.get(row.trip_id).push({
              stopId: row.stop_id,
              arrivalTime: parseTimeToMinutes(
                row.arrival_time || row.departure_time || "00:00:00",
              ),
              departureTime: parseTimeToMinutes(
                row.departure_time || row.arrival_time || "00:00:00",
              ),
              stopSequence: parseInt(row.stop_sequence) || 0,
            });
            stCount++;

            // Yield every 50000 rows to keep event loop responsive
            if (stCount % 50000 === 0) {
              console.log(`   → Processing stop times: ${stCount}`);
            }
          },
          () => {
            console.log(
              `   → Loaded ${stCount} stop times across ${stopTimesByTrip.size} trips`,
            );

            // Sort and attach stop times to trips
            let attached = 0;
            for (const [tripId, times] of stopTimesByTrip) {
              times.sort((a, b) => a.stopSequence - b.stopSequence);
            }

            for (const [, route] of scheduleData.routes) {
              for (const trip of route.trips) {
                if (stopTimesByTrip.has(trip.tripId)) {
                  trip.stopTimes = stopTimesByTrip.get(trip.tripId);
                  attached++;
                }
              }
            }

            // Clear the map to free memory
            stopTimesByTrip.clear();

            console.log(`   ✅ GTFS data loaded successfully`);
            complete();
          },
        );
      })
      .catch(reject);
  });
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
    console.log(`   → Bus Éireann loaded`);
    await loadGTFS(GTFS_URLS.dublinBus);
    console.log(`   → Dublin Bus loaded`);
    await loadGTFS(GTFS_URLS.goAhead);
    console.log(`   → Go-Ahead loaded`);
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
  findRouteByShortName,
  scheduleData, // exposed for debugging
};
