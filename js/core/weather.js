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

export async function updateWeather() {
    const weatherEl = document.getElementById('weather');
    if (!weatherEl) return;

    const settings = loadSettings();
    let locationName = settings.weather?.location || 'Cork';
    let countryCode = settings.weather?.country || 'IE';
    
    // Show loading state
    weatherEl.innerHTML = `<div class="weather-loading"><i class="fa-solid fa-spinner fa-spin"></i> ${locationName}...</div>`;
    
    try {
        // Geocode the location using Nominatim
        const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)},${countryCode}&format=json&limit=1&addressdetails=1`;
        const geoResponse = await fetch(geoUrl, {
            headers: { 'User-Agent': 'HandiHomepage/1.0 (https://handihomepage.com)' }
        });
        const geoData = await geoResponse.json();
        
        let lat, lon;
        let displayLocation = locationName;
        
        if (geoData && geoData.length > 0) {
            lat = parseFloat(geoData[0].lat);
            lon = parseFloat(geoData[0].lon);
            const address = geoData[0].address;
            if (address) {
                displayLocation = address.city || address.town || address.village || address.suburb || locationName;
            }
        } else {
            // Fallback to Cork city center
            lat = 51.8985;
            lon = -8.4756;
            displayLocation = 'Cork';
        }
        
        // Fetch weather from Open-Meteo
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        if (weatherData.current_weather) {
            const temp = Math.round(weatherData.current_weather.temperature);
            const weatherCode = weatherData.current_weather.weathercode;
            const outlook = getWeatherDescription(weatherCode);

            weatherEl.innerHTML = `
                <div class="weather-location">📍 ${escapeHtml(displayLocation)}</div>
                <div class="weather-temp">🌡️ ${temp}°C</div>
                <div class="weather-outlook">${outlook}</div>
            `;
        } else {
            weatherEl.innerHTML = `<div class="weather-fallback">🌤️ --°C</div>`;
        }
    } catch (err) {
        console.warn("Weather fetch failed:", err);
        weatherEl.innerHTML = `<div class="weather-fallback">🌤️ --°C</div>`;
    }
}

export function startWeatherUpdates() {
    if (weatherInterval) clearInterval(weatherInterval);
    updateWeather();
    weatherInterval = setInterval(updateWeather, 1800000); // Update every 30 minutes
}

export function stopWeatherUpdates() {
    if (weatherInterval) {
        clearInterval(weatherInterval);
        weatherInterval = null;
    }
}