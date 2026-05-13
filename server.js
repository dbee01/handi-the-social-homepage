// index.js - Infomaniak Production Ready
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080; // Infomaniak provides PORT env var

app.use(cors());

const API_KEY = '2410ec27541243aa967e1edc53275c95';
const REALTIME_URL = 'https://api.nationaltransport.ie/gtfsr/v2/gtfsr?format=json';

// -----------------------------------------------------------------------------
// FALLBACK SCHEDULE
// -----------------------------------------------------------------------------
const FALLBACK_SCHEDULE = {
    'Rochestown Rise': {
        direction: 'City Centre',
        times: [
            6.15, 6.45, 7.15, 7.45, 8.15, 8.45, 9.15, 9.45,
            10.15, 10.45, 11.15, 11.45, 12.15, 12.45,
            13.15, 13.45, 14.15, 14.45, 15.15, 15.45,
            16.15, 16.45, 17.15, 17.45, 18.15, 18.45,
            19.15, 19.45, 20.15, 20.45, 21.15, 21.45,
            22.15, 22.45
        ]
    },
    'South Mall': {
        direction: 'Rochestown',
        times: [
            6.30, 7.00, 7.30, 8.00, 8.30, 9.00, 9.30,
            10.00, 10.30, 11.00, 11.30, 12.00, 12.30,
            13.00, 13.30, 14.00, 14.30, 15.00, 15.30,
            16.00, 16.30, 17.00, 17.30, 18.00, 18.30,
            19.00, 19.30, 20.00, 20.30, 21.00, 21.30,
            22.00, 22.30
        ]
    }
};

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------
function getNextScheduledTimes(stopName) {
    const now = new Date();
    const currentTime = now.getHours() + now.getMinutes() / 60;
    const schedule = FALLBACK_SCHEDULE[stopName];

    if (!schedule) return [];

    const nextTimes = [];

    for (const time of schedule.times) {
        if (time > currentTime && nextTimes.length < 3) {
            const hour = Math.floor(time);
            const minute = Math.round((time % 1) * 60);

            const busTime = new Date(now);
            busTime.setHours(hour, minute, 0, 0);

            const minutesAway = Math.round((busTime - now) / 60000);

            nextTimes.push({
                route: '223',
                minutes_away: minutesAway,
                arrival_text: minutesAway <= 0 ? 'Due' : `${minutesAway} min${minutesAway !== 1 ? 's' : ''}`,
                scheduled: true
            });
        }
    }

    return nextTimes;
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
// Try both possible locations for index.html
const publicPath = path.join(__dirname, 'public');
const staticPath = fs.existsSync(publicPath) ? publicPath : __dirname;
app.use(express.static(staticPath));

// Homepage
app.get('/', (req, res) => {
    const indexPath = path.join(staticPath, 'index.html');
    if (require('fs').existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.json({
            message: 'PLE Bus API is running',
            endpoints: ['/api/bus-realtime', '/api/news']
        });
    }
});

// -----------------------------------------------------------------------------
// BUS REALTIME API
// -----------------------------------------------------------------------------
app.get('/api/bus-realtime', async (req, res) => {
    const now = Date.now();

    if (cachedData && now - lastFetch < CACHE_TTL) {
        console.log('📦 Returning cached bus data');
        return res.json(cachedData);
    }

    try {
        const response = await axios.get(REALTIME_URL, {
            headers: { 'x-api-key': API_KEY },
            timeout: 10000
        });

        const stops = {
            'Rochestown Rise': { buses: [], direction: 'City Centre' },
            'South Mall': { buses: [], direction: 'Rochestown' }
        };

        let hasRealTimeData = false;

        if (response.data && response.data.entity) {
            for (const entity of response.data.entity) {
                if (!entity.trip_update) continue;

                const trip = entity.trip_update.trip;
                if (!trip || trip.route_id !== '223') continue;

                const updates = entity.trip_update.stop_time_update || [];

                for (const update of updates) {
                    let stopName = null;
                    if (update.stop_id === '242081') stopName = 'Rochestown Rise';
                    if (update.stop_id === '242051') stopName = 'South Mall';
                    if (!stopName || !stops[stopName]) continue;

                    const arrival = update.arrival;
                    if (arrival && arrival.time) {
                        hasRealTimeData = true;
                        const arrivalTime = new Date(arrival.time * 1000);
                        const minutesAway = Math.round((arrivalTime.getTime() - Date.now()) / 60000);

                        if (minutesAway >= 0 && minutesAway <= 60) {
                            stops[stopName].buses.push({
                                route: '223',
                                minutes_away: minutesAway,
                                arrival_text: minutesAway <= 0 ? 'Due' : `${minutesAway} min${minutesAway !== 1 ? 's' : ''}`,
                                delay: arrival.delay || 0,
                                realtime: true
                            });
                        }
                    }
                }
            }
        }

        const results = [];
        for (const [stopName, data] of Object.entries(stops)) {
            let buses = data.buses;
            const isRealtime = buses.length > 0;

            if (!isRealtime) {
                buses = getNextScheduledTimes(stopName);
            }

            buses.sort((a, b) => a.minutes_away - b.minutes_away);

            results.push({
                stop_name: stopName,
                direction: data.direction,
                buses: buses.slice(0, 3),
                realtime_data: isRealtime
            });
        }

        const result = {
            success: true,
            last_updated: new Date().toISOString(),
            route: '223',
            stops: results,
            note: hasRealTimeData ? 'Real-time data' : 'Scheduled times'
        };

        cachedData = result;
        lastFetch = now;
        res.json(result);

    } catch (error) {
        console.error('API error:', error.message);

        if (cachedData) {
            return res.json(cachedData);
        }

        const results = [];
        for (const [stopName, data] of Object.entries(FALLBACK_SCHEDULE)) {
            results.push({
                stop_name: stopName,
                direction: data.direction,
                buses: getNextScheduledTimes(stopName),
                realtime_data: false
            });
        }

        res.json({
            success: true,
            last_updated: new Date().toISOString(),
            route: '223',
            stops: results,
            note: 'Fallback scheduled times'
        });
    }
});

// -----------------------------------------------------------------------------
// NEWS API
// -----------------------------------------------------------------------------
app.get('/api/news', async (req, res) => {
    try {
        const rssUrl = 'https://www.rte.ie/feeds/rss/?index=/news';
        const response = await axios.get(rssUrl, {
            responseType: 'text',
            timeout: 10000
        });
        res.type('application/xml').send(response.data);
    } catch (error) {
        console.error('News API error:', error.message);
        res.status(500).send('Error fetching news');
    }
});

// -----------------------------------------------------------------------------
// HEALTH CHECK (useful for Infomaniak monitoring)
// -----------------------------------------------------------------------------
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// -----------------------------------------------------------------------------
// START SERVER
// -----------------------------------------------------------------------------
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 API base: http://localhost:${PORT}/`);
    console.log(`🚌 Bus API: /api/bus-realtime`);
    console.log(`📰 News API: /api/news`);
    console.log(`❤️ Health: /health`);
});

// Graceful shutdown for Infomaniak
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
