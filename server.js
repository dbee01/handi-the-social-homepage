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
    // Cork long-form stop IDs (real-time capable)
    '8380B246051': { name: 'Rochestown Rise', direction: 'City Centre' },
    '8370B2420501': { name: 'South Mall', direction: 'Rochestown' },
    // Alternative formats
    '242081': { name: 'Rochestown Rise', direction: 'City Centre' },
    '242051': { name: 'South Mall', direction: 'Rochestown' }
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
// BUS REALTIME API - IMPROVED VERSION WITH PROPER LOGGING
// -----------------------------------------------------------------------------
app.get('/api/bus-realtime', async (req, res) => {
    const now = Date.now();
    const routeId = req.query.route || '223';
    const stopsParam = req.query.stops || '8380B246051,8370B2420501';
    const requestedStopIds = stopsParam.split(',').map(s => s.trim());
    const forceRefresh = req.query.refresh === 'true';

    // Shorter cache TTL for real-time data (20 seconds)
    const REALTIME_CACHE_TTL = 20000;
    const FALLBACK_CACHE_TTL = 60000;

    console.log('\n' + '='.repeat(60));
    console.log(`🚌 BUS API REQUEST`);
    console.log('='.repeat(60));
    console.log(`📋 Parameters:`);
    console.log(`   → Route ID: ${routeId}`);
    console.log(`   → Stop IDs: ${stopsParam}`);
    console.log(`   → Force refresh: ${forceRefresh}`);
    console.log(`   → Timestamp: ${new Date().toISOString()}`);

    const stops = {};
    for (const stopId of requestedStopIds) {
        const info = stopInfo[stopId];
        stops[stopId] = {
            buses: [],
            direction: info?.direction || 'Unknown',
            stop_name: info?.name || stopId,
            stop_id: stopId
        };
        console.log(`   📍 Stop: ${stopId} → ${info?.name || 'Unknown'} (${info?.direction || 'Unknown direction'})`);
    }

    const cacheKey = `${routeId}|${stopsParam}`;
    
    // Check cache - but skip if force refresh
    if (!forceRefresh && cachedData && cachedData._cacheKey === cacheKey) {
        const cacheAge = now - lastFetch;
        const isRealtime = cachedData.stops?.some(s => s.realtime_data === true);
        const ttl = isRealtime ? REALTIME_CACHE_TTL : FALLBACK_CACHE_TTL;
        
        if (cacheAge < ttl) {
            console.log(`\n💾 CACHE HIT (age: ${cacheAge}ms, realtime: ${isRealtime})`);
            console.log('='.repeat(60) + '\n');
            return res.json(cachedData);
        } else {
            console.log(`\n⏰ Cache expired (age: ${cacheAge}ms > TTL: ${ttl}ms)`);
        }
    } else {
        console.log(`\n🔄 Cache MISS - fetching fresh data`);
    }

    try {
        console.log(`\n🌐 MAKING API CALL TO NTA:`);
        console.log(`   → URL: ${REALTIME_URL}`);
        console.log(`   → API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}`);
        console.log(`   → Timeout: 15000ms`);
        
        const response = await axios.get(REALTIME_URL, {
            headers: { 'x-api-key': API_KEY },
            timeout: 15000
        });

        console.log(`\n✅ NTA API RESPONSE:`);
        console.log(`   → Status: ${response.status} ${response.statusText}`);
        console.log(`   → Response size: ${JSON.stringify(response.data).length} bytes`);
        
        let hasAnyRealTimeForRoute = false;
        const realtimePredictions = new Map();

        if (response.data && response.data.entity) {
            const totalEntities = response.data.entity.length;
            console.log(`   → Total entities received: ${totalEntities}`);
            
            let routeMatches = 0;
            let stopMatches = 0;
            
            for (const entity of response.data.entity) {
                if (!entity.trip_update) continue;
                
                const tripUpdate = entity.trip_update;
                const trip = tripUpdate.trip;
                
                if (!trip || trip.route_id !== routeId) continue;
                
                routeMatches++;
                hasAnyRealTimeForRoute = true;
                
                const updates = tripUpdate.stop_time_update || [];
                console.log(`\n   🚌 Route ${routeId} match #${routeMatches}:`);
                console.log(`      → Headsign: ${trip.trip_headsign || 'Unknown'}`);
                console.log(`      → Direction: ${trip.direction_id === '0' ? 'Inbound' : 'Outbound'}`);
                console.log(`      → Stop updates: ${updates.length}`);
                
                for (const update of updates) {
                    const stopId = update.stop_id;
                    if (!stops[stopId]) continue;
                    
                    stopMatches++;
                    const arrival = update.arrival;
                    if (arrival && arrival.time) {
                        const arrivalTime = arrival.time * 1000;
                        const minutesAway = Math.round((arrivalTime - Date.now()) / 60000);
                        
                        if (minutesAway >= -2 && minutesAway <= 60) {
                            if (!realtimePredictions.has(stopId)) {
                                realtimePredictions.set(stopId, []);
                            }
                            realtimePredictions.get(stopId).push({
                                route: routeId,
                                minutes_away: Math.max(0, minutesAway),
                                arrival_text: minutesAway <= 1 ? 'Due' : `${minutesAway} min${minutesAway !== 2 ? 's' : ''}`,
                                delay: arrival.delay || 0,
                                realtime: true
                            });
                            
                            console.log(`         ✓ Stop ${stopId}: Bus arriving in ${minutesAway} minutes (delay: ${arrival.delay || 0}s)`);
                            
                            if (trip.trip_headsign) {
                                stops[stopId].direction = trip.trip_headsign;
                            }
                        }
                    }
                }
            }
            
            console.log(`\n   📊 NTA DATA SUMMARY:`);
            console.log(`      → Route ${routeId} matches: ${routeMatches}`);
            console.log(`      → Stop matches: ${stopMatches}`);
            console.log(`      → Stops with predictions: ${realtimePredictions.size}`);
            
        } else {
            console.log(`   ⚠️ No entity data in response`);
        }

        // Build results
        const results = [];
        for (const [stopId, stopData] of Object.entries(stops)) {
            let buses = [];
            let isRealtime = false;
            
            if (realtimePredictions.has(stopId)) {
                buses = realtimePredictions.get(stopId);
                isRealtime = true;
                console.log(`\n✅ STOP ${stopId} (${stopData.stop_name}):`);
                console.log(`   → REAL-TIME predictions: ${buses.length}`);
                buses.forEach((bus, i) => {
                    console.log(`      ${i+1}. Route ${bus.route} - ${bus.arrival_text} (${bus.minutes_away} min)`);
                });
            } else if (hasAnyRealTimeForRoute) {
                isRealtime = true;
                console.log(`\n⚠️ STOP ${stopId} (${stopData.stop_name}):`);
                console.log(`   → Route has real-time capability but no active buses right now`);
                console.log(`   → Showing "No upcoming buses"`);
            } else {
                buses = getGenericSchedule(routeId, stopId, stopData.direction);
                isRealtime = false;
                console.log(`\n📅 STOP ${stopId} (${stopData.stop_name}):`);
                console.log(`   → Using SCHEDULED times (no real-time for route ${routeId})`);
                buses.forEach((bus, i) => {
                    console.log(`      ${i+1}. Route ${bus.route} - ${bus.arrival_text} (scheduled)`);
                });
            }
            
            buses.sort((a, b) => a.minutes_away - b.minutes_away);
            
            results.push({
                stop_name: stopData.stop_name,
                direction: stopData.direction,
                stop_id: stopId,
                buses: buses.slice(0, 4),
                realtime_data: isRealtime
            });
        }

        // Check if ANY bus across ANY stop is real-time
        const hasAnyRealtimeBuses = results.some(stop => 
            stop.buses.some(bus => bus.realtime === true)
        );

        const result = {
            success: true,
            last_updated: new Date().toISOString(),
            route: routeId,
            stops: results,
            source: hasAnyRealtimeBuses ? 'realtime' : 'scheduled',
            _cacheKey: cacheKey
        };

        const realtimeCount = results.filter(r => r.realtime_data).length;
        console.log(`\n📊 FINAL SUMMARY:`);
        console.log(`   → Data source: ${result.source.toUpperCase()}`);
        console.log(`   → Stops with real-time capability: ${realtimeCount}/${results.length}`);
        console.log(`   → Last updated: ${result.last_updated}`);
        console.log('='.repeat(60) + '\n');

        cachedData = result;
        lastFetch = now;
        res.json(result);

    } catch (error) {
        console.error(`\n❌ BUS API ERROR:`);
        console.error(`   → Message: ${error.message}`);
        if (error.response) {
            console.error(`   → Status: ${error.response.status}`);
            console.error(`   → Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
        if (error.code === 'ECONNABORTED') {
            console.error(`   → Timeout: Request took longer than 15 seconds`);
        }
        
        if (cachedData && cachedData._cacheKey === cacheKey) {
            console.log(`\n💾 Using cached data due to API error`);
            console.log('='.repeat(60) + '\n');
            return res.json(cachedData);
        }
        
        console.log(`\n📅 FALLBACK: Using scheduled times`);
        const results = [];
        for (const [stopId, stopData] of Object.entries(stops)) {
            const buses = getGenericSchedule(routeId, stopId, stopData.direction);
            results.push({
                stop_name: stopData.stop_name,
                direction: stopData.direction,
                stop_id: stopId,
                buses: buses.slice(0, 4),
                realtime_data: false
            });
        }
        console.log('='.repeat(60) + '\n');
        res.json({
            success: true,
            last_updated: new Date().toISOString(),
            route: routeId,
            stops: results,
            source: 'fallback',
            error: error.message
        });
    }
});

// Add a debug endpoint to check what stops have real-time data
app.get('/api/bus-debug', async (req, res) => {
    try {
        const response = await axios.get(REALTIME_URL, {
            headers: { 'x-api-key': API_KEY },
            timeout: 10000
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
            realtime_available: true,
            routes_with_data: Array.from(routesWithData),
            stops_with_data: Array.from(stopsWithData),
            total_entities: response.data?.entity?.length || 0
        });
    } catch (error) {
        res.json({
            realtime_available: false,
            error: error.message
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
    const rssUrl = req.query.url || 'https://www.thejournal.ie/feed/';
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
    console.log(`🚌 Bus API: /api/bus-realtime?route={routeId}&stops={stopIds}`);
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