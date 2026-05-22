// index.js - Infomaniak Production Ready
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

const API_KEY = '2410ec27541243aa967e1edc53275c95';
const REALTIME_URL = 'https://api.nationaltransport.ie/gtfsr/v2/gtfsr?format=json';

// -----------------------------------------------------------------------------
// STOP INFO (name + direction)
// -----------------------------------------------------------------------------
const stopInfo = {
    // Dublin – Cork route (Expressway)
    '330061': { name: 'Dublin Busáras', direction: 'Cork City' },
    '240161': { name: 'Cork Parnell Place', direction: 'Dublin City' },
    // Cork local (fallback)
    '242081': { name: 'Rochestown Rise', direction: 'City Centre' },
    '242051': { name: 'South Mall', direction: 'Rochestown' },
    '8220B1352401': { name: 'South Mall', direction: 'Rochestown' },
    '8300B1311001': { name: 'Rochestown Rise', direction: 'City Centre' }
};

// -----------------------------------------------------------------------------
// GENERIC SCHEDULE
// -----------------------------------------------------------------------------
// Generic schedule with different offsets for different directions
function getGenericSchedule(routeId, stopId, direction) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const schedule = [];
    
    // Different base offsets for different directions
    let baseOffset = 0;
    let interval = 30;
    
    if (direction && direction.toLowerCase().includes('dublin')) {
        // Direction towards Dublin
        baseOffset = 5;
        interval = 32;
    } else if (direction && direction.toLowerCase().includes('cork')) {
        // Direction towards Cork
        baseOffset = 10;
        interval = 28;
    } else {
        // Default
        baseOffset = 0;
        interval = 30;
    }
    
    for (let hour = 6; hour <= 23; hour++) {
        for (let minute = 0; minute < 60; minute += interval) {
            const totalMinutes = hour * 60 + minute + baseOffset;
            if (totalMinutes > currentMinutes) {
                const minutesAway = totalMinutes - currentMinutes;
                schedule.push({
                    route: routeId,
                    minutes_away: minutesAway,
                    arrival_text: minutesAway <= 0 ? 'Due' : `${minutesAway} min${minutesAway !== 1 ? 's' : ''}`,
                    scheduled: true
                });
                if (schedule.length >= 3) break;
            }
        }
        if (schedule.length >= 3) break;
    }
    return schedule;
}

// -----------------------------------------------------------------------------
// CACHE
// -----------------------------------------------------------------------------
let cachedData = null;
let lastFetch = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

// -----------------------------------------------------------------------------
// STATIC FRONTEND
// -----------------------------------------------------------------------------
const publicPath = path.join(__dirname, 'public');
const staticPath = fs.existsSync(publicPath) ? publicPath : __dirname;
app.use(express.static(staticPath));

app.get('/', (req, res) => {
    const indexPath = path.join(staticPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.json({ message: 'API running', endpoints: ['/api/bus-realtime', '/api/news'] });
    }
});

// -----------------------------------------------------------------------------
// BUS REALTIME API
// -----------------------------------------------------------------------------
app.get('/api/bus-realtime', async (req, res) => {
    const now = Date.now();

    const routeId = req.query.route || '30';
    const stopsParam = req.query.stops || '330061,240161';
    const requestedStopIds = stopsParam.split(',').map(s => s.trim());

    const stops = {};
    for (const stopId of requestedStopIds) {
        const info = stopInfo[stopId];
        if (info) {
            stops[stopId] = {
                buses: [],
                direction: info.direction,
                stop_name: info.name
            };
        } else {
            stops[stopId] = {
                buses: [],
                direction: 'Unknown',
                stop_name: stopId
            };
        }
    }

    const cacheKey = `${routeId}|${stopsParam}`;
    if (cachedData && cachedData._cacheKey === cacheKey && now - lastFetch < CACHE_TTL) {
        console.log('📦 Returning cached bus data');
        return res.json(cachedData);
    }

    try {
        const response = await axios.get(REALTIME_URL, {
            headers: { 'x-api-key': API_KEY },
            timeout: 10000
        });

        let hasRealTimeData = false;

        if (response.data && response.data.entity) {
            for (const entity of response.data.entity) {
                if (!entity.trip_update) continue;
                const trip = entity.trip_update.trip;
                if (!trip || trip.route_id !== routeId) continue;

                const updates = entity.trip_update.stop_time_update || [];
                for (const update of updates) {
                    const stopId = update.stop_id;
                    if (!stops[stopId]) continue;

                    const arrival = update.arrival;
                    if (arrival && arrival.time) {
                        hasRealTimeData = true;
                        const arrivalTime = new Date(arrival.time * 1000);
                        const minutesAway = Math.round((arrivalTime.getTime() - Date.now()) / 60000);

                        if (minutesAway >= 0 && minutesAway <= 60) {
                            stops[stopId].buses.push({
                                route: routeId,
                                minutes_away: minutesAway,
                                arrival_text: minutesAway <= 0 ? 'Due' : `${minutesAway} min${minutesAway !== 1 ? 's' : ''}`,
                                delay: arrival.delay || 0,
                                realtime: true
                            });
                            if (trip.trip_headsign) {
                                stops[stopId].direction = trip.trip_headsign;
                            }
                        }
                    }
                }
            }
        }

        const results = [];
        for (const [stopId, data] of Object.entries(stops)) {
            let buses = data.buses;
            const isRealtime = buses.length > 0;
            if (!isRealtime) {
                buses = getGenericSchedule(routeId, stopId, data.direction);
            }
            buses.sort((a, b) => a.minutes_away - b.minutes_away);
            results.push({
                stop_name: data.stop_name,
                direction: data.direction,
                buses: buses.slice(0, 3),
                realtime_data: isRealtime
            });
        }

        const result = {
            success: true,
            last_updated: new Date().toISOString(),
            route: routeId,
            stops: results,
            note: hasRealTimeData ? 'Real-time data' : 'Scheduled times',
            _cacheKey: cacheKey
        };

        cachedData = result;
        lastFetch = now;
        res.json(result);

    } catch (error) {
        console.error('Bus API error:', error.message);
        if (cachedData && cachedData._cacheKey === cacheKey) {
            return res.json(cachedData);
        }
        const results = [];
        for (const [stopId, data] of Object.entries(stops)) {
            const buses = getGenericSchedule(routeId, stopId, data.direction);
            results.push({
                stop_name: data.stop_name,
                direction: data.direction,
                buses: buses.slice(0, 3),
                realtime_data: false
            });
        }
        res.json({
            success: true,
            last_updated: new Date().toISOString(),
            route: routeId,
            stops: results,
            note: 'Fallback scheduled times'
        });
    }
});

// -----------------------------------------------------------------------------
// Proxy for Proton Calendar ICS
// -----------------------------------------------------------------------------
// Proxy for Proton Calendar ICS
app.get('/api/calendar-proxy', async (req, res) => {
    let icsUrl = req.query.url;
    if (!icsUrl) {
        return res.status(400).send('Missing calendar URL');
    }
    
    // Decode the URL if it was encoded
    try {
        icsUrl = decodeURIComponent(icsUrl);
    } catch(e) {
        // If decoding fails, use as is
        console.log('URL decoding not needed');
    }
    
    console.log('Fetching calendar from:', icsUrl.substring(0, 100) + '...');
    
    try {
        const response = await fetch(icsUrl, {
            headers: {
                'User-Agent': 'HandiHomepage/1.0',
                'Accept': 'text/calendar, */*'
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const icsText = await response.text();
        res.setHeader('Content-Type', 'text/calendar');
        res.send(icsText);
    } catch (err) {
        console.error('Calendar proxy error:', err.message);
        res.status(500).send(`Failed to fetch calendar: ${err.message}`);
    }
});

// -----------------------------------------------------------------------------
// NEWS API – FIXED with proper User-Agent and error handling
// -----------------------------------------------------------------------------
app.get('/api/news', async (req, res) => {
    const rssUrl = req.query.url || 'https://www.rte.ie/feeds/rss/?index=/news/';
    console.log(`📰 Fetching news from: ${rssUrl}`);
    try {
        const response = await axios.get(rssUrl, {
            responseType: 'text',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*'
            },
            // Uncomment if you have SSL certificate issues (temporary)
            // httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });
        if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
        res.type('application/xml').send(response.data);
        console.log('✅ News feed fetched successfully');
    } catch (error) {
        console.error('❌ News API error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
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
        res.type('application/xml').status(200).send(fallbackXml);
    }
});

// -----------------------------------------------------------------------------
// HEALTH CHECK
// -----------------------------------------------------------------------------
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// -----------------------------------------------------------------------------
// START SERVER
// -----------------------------------------------------------------------------
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 API base: http://page.handihomepage.com:${PORT}/`);
    console.log(`🚌 Bus API: /api/bus-realtime?route=30&stops=330061,240161`);
    console.log(`📰 News API: /api/news?url=...`);
    console.log(`❤️ Health: /health`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});