// js/core/weather.js - Standalone weather widget
import { loadSettings } from './settings.js';

let weatherInterval = null;

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
}

function getWeatherDescription(code) {
    const codes = {
        0: "☀️ Clear",
        1: "🌤️ Mainly clear",
        2: "⛅ Partly cloudy",
        3: "☁️ Overcast",
        45: "🌫️ Fog",
        48: "🌫️ Fog",
        51: "🌧️ Drizzle",
        53: "🌧️ Drizzle",
        55: "🌧️ Drizzle",
        61: "🌧️ Light rain",
        63: "🌧️ Moderate rain",
        65: "🌧️ Heavy rain",
        71: "🌨️ Light snow",
        73: "🌨️ Moderate snow",
        75: "🌨️ Heavy snow",
        80: "🌧️ Showers",
        81: "🌧️ Showers",
        82: "🌧️ Heavy showers",
        85: "🌨️ Snow showers",
        86: "🌨️ Heavy snow showers",
        95: "⛈️ Thunderstorm"
    };
    return codes[code] || "🌡️ Unknown";
}

// Helper to fetch with retries
async function fetchWithRetry(url, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) return await response.json();
            console.warn(`Weather API attempt ${i+1} failed with status ${response.status}`);
        } catch (err) {
            console.warn(`Weather API attempt ${i+1} error:`, err);
        }
        if (i < retries - 1) await new Promise(r => setTimeout(r, delay * (i+1)));
    }
    throw new Error(`Failed to fetch weather after ${retries} attempts`);
}

async function getCoordinates(location, countryCode) {
    const query = `${location}, ${countryCode}`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'HandiHomepage/1.0 (https://handihomepage.com)' }
        });
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
                displayName: data[0].display_name
            };
        }
        return null;
    } catch (err) {
        console.error('Geocoding error:', err);
        return null;
    }
}

// Fallback using wttr.in (no CORS, simple text format)
async function fetchWeatherFallback(lat, lon) {
    const url = `https://wttr.in/${lat},${lon}?format=%c+%t`;
    const response = await fetch(url);
    const text = await response.text();
    // text looks like "☀️ +17°C"
    const match = text.match(/([☀️⛅🌧️🌨️⛈️🌤️🌥️🌦️🌩️❄️]+)\s+([+-]?\d+°C)/);
    if (match) {
        const outlook = match[1];
        const temp = match[2];
        return { outlook, temp: temp.replace('°C', '') };
    }
    return null;
}

export async function updateWeather() {
    const weatherEl = document.getElementById('weather');
    if (!weatherEl) return;

    const settings = loadSettings();
    let locationName = settings.weather?.location || 'Cork';
    let countryCode = settings.weather?.country || 'IE';
    
    // Show loading state
    weatherEl.innerHTML = `<div class="weather-loading"><i class="fa-solid fa-spinner fa-spin"></i> ${escapeHtml(locationName)}...</div>`;
    
    try {
        const coords = await getCoordinates(locationName, countryCode);
        let lat, lon, displayLocation = locationName;
        
        if (coords) {
            lat = coords.lat;
            lon = coords.lon;
            const parts = coords.displayName?.split(',') || [];
            displayLocation = parts[0] || locationName;
        } else {
            // Fallback to Cork
            lat = 51.8985;
            lon = -8.4756;
            displayLocation = locationName;
        }
        
        let temp = null;
        let outlook = null;
        
        // Try Open-Meteo first
        try {
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
            const weatherData = await fetchWithRetry(weatherUrl, 2);
            if (weatherData.current_weather) {
                temp = Math.round(weatherData.current_weather.temperature);
                const weatherCode = weatherData.current_weather.weathercode;
                outlook = getWeatherDescription(weatherCode);
            } else {
                throw new Error('No current_weather data');
            }
        } catch (openMeteoError) {
            console.warn('Open-Meteo failed, trying wttr.in fallback:', openMeteoError);
            const fallbackData = await fetchWeatherFallback(lat, lon);
            if (fallbackData) {
                temp = parseInt(fallbackData.temp);
                outlook = fallbackData.outlook;
            } else {
                throw new Error('Both weather APIs failed');
            }
        }
        
        if (temp !== null && outlook !== null) {
            weatherEl.innerHTML = `
                <div class="weather-location">📍 ${escapeHtml(displayLocation)}</div>
                <div class="weather-temp">🌡️ ${temp}°C</div>
                <div class="weather-outlook">${outlook}</div>
            `;
        } else {
            weatherEl.innerHTML = `<div class="weather-fallback">🌤️ --°C</div>`;
        }
    } catch (err) {
        console.error('Weather fetch ultimately failed:', err);
        weatherEl.innerHTML = `<div class="weather-fallback">🌤️ --°C</div>`;
    }
}

export function startWeatherUpdates() {
    if (weatherInterval) clearInterval(weatherInterval);
    updateWeather();
    weatherInterval = setInterval(updateWeather, 1800000); // 30 minutes
}

export function stopWeatherUpdates() {
    if (weatherInterval) {
        clearInterval(weatherInterval);
        weatherInterval = null;
    }
}