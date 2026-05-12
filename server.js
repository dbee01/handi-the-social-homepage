const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3001;

app.use(cors());

const API_KEY = '2410ec27541243aa967e1edc53275c95';
const REALTIME_URL = 'https://api.nationaltransport.ie/gtfsr/v2/gtfsr?format=json';

// Hardcoded schedule for Route 223 (typical weekday schedule)
// This is used as fallback when no real-time data is available
const FALLBACK_SCHEDULE = {
    'Rochestown Rise': {
        direction: 'City Centre',
        times: [6.15, 6.45, 7.15, 7.45, 8.15, 8.45, 9.15, 9.45, 10.15, 10.45, 11.15, 11.45, 12.15, 12.45, 13.15, 13.45, 14.15, 14.45, 15.15, 15.45, 16.15, 16.45, 17.15, 17.45, 18.15, 18.45, 19.15, 19.45, 20.15, 20.45, 21.15, 21.45, 22.15, 22.45]
    },
    'South Mall': {
        direction: 'Rochestown',
        times: [6.30, 7.00, 7.30, 8.00, 8.30, 9.00, 9.30, 10.00, 10.30, 11.00, 11.30, 12.00, 12.30, 13.00, 13.30, 14.00, 14.30, 15.00, 15.30, 16.00, 16.30, 17.00, 17.30, 18.00, 18.30, 19.00, 19.30, 20.00, 20.30, 21.00, 21.30, 22.00, 22.30]
    }
};

function getNextScheduledTimes(stopName) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour + currentMinute / 60;
    
    const schedule = FALLBACK_SCHEDULE[stopName];
    if (!schedule) return [];
    
    const nextTimes = [];
    for (const time of schedule.times) {
        if (time > currentTime && nextTimes.length < 3) {
            const hour = Math.floor(time);
            const minute = Math.round((time % 1) * 60);
            const busTime = new Date(now);
            busTime.setHours(hour, minute, 0);
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

app.get('/api/bus-realtime', async (req, res) => {
    console.log('🚌 Bus request received');
    
    try {
        const response = await axios.get(REALTIME_URL, {
            headers: { 'x-api-key': API_KEY },
            timeout: 10000
        });
        
        const stops = {
            'Rochestown Rise': { buses: [], direction: 'City Centre' },
            'South Mall': { buses: [], direction: 'Rochestown' }
        };
        
        // Process real-time data
        let hasRealTimeData = false;
        
        if (response.data && response.data.entity) {
            response.data.entity.forEach(entity => {
                if (entity.trip_update) {
                    const trip = entity.trip_update.trip;
                    const routeId = trip.route_id;
                    
                    if (routeId === '223') {
                        entity.trip_update.stop_time_update.forEach(update => {
                            let stopName = null;
                            if (update.stop_id === '242081') stopName = 'Rochestown Rise';
                            if (update.stop_id === '242051') stopName = 'South Mall';
                            
                            if (stopName && stops[stopName]) {
                                const arrival = update.arrival;
                                if (arrival && arrival.time) {
                                    hasRealTimeData = true;
                                    const arrivalTime = new Date(arrival.time * 1000);
                                    const nowTime = new Date();
                                    const minutesAway = Math.round((arrivalTime - nowTime) / 60000);
                                    
                                    if (minutesAway >= 0 && minutesAway <= 60) {
                                        stops[stopName].buses.push({
                                            route: routeId,
                                            minutes_away: minutesAway,
                                            arrival_text: minutesAway === 0 ? 'Due' : `${minutesAway} min${minutesAway !== 1 ? 's' : ''}`,
                                            delay: arrival.delay || 0,
                                            realtime: true
                                        });
                                    }
                                }
                            }
                        });
                    }
                }
            });
        }
        
        // If no real-time data, use fallback schedule
        const results = [];
        for (const [stopName, data] of Object.entries(stops)) {
            let buses = data.buses;
            let isRealtime = buses.length > 0;
            
            if (!isRealtime) {
                buses = getNextScheduledTimes(stopName);
            }
            
            buses.sort((a, b) => a.minutes_away - b.minutes_away);
            buses = buses.slice(0, 3);
            
            results.push({
                stop_name: stopName,
                direction: data.direction,
                buses: buses,
                realtime_data: isRealtime
            });
        }
        
        res.json({
            success: true,
            last_updated: new Date().toISOString(),
            route: '223',
            stops: results,
            note: hasRealTimeData ? 'Real-time data' : 'Showing scheduled times (no real-time data available)'
        });
        
    } catch (error) {
        console.error('API Error:', error.message);
        
        // Return fallback schedule on error
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
            note: 'Using scheduled times (API unavailable)'
        });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});