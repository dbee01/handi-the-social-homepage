/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// js/core/weather.js - Standalone weather widget
import { loadSettings } from './settings.js';

let weatherInterval = null;

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
}

function getWeatherIcon(code) {
    const icon = {
      0: 'fa-sun',
      1: 'fa-sun',
      2: 'fa-cloud-sun',
      3: 'fa-cloud',
      45: 'fa-smog',
      48: 'fa-smog',
      51: 'fa-cloud-rain',
      53: 'fa-cloud-rain',
      55: 'fa-cloud-rain',
      61: 'fa-cloud-rain',
      63: 'fa-cloud-showers-heavy',
      65: 'fa-cloud-showers-heavy',
      71: 'fa-snowflake',
      73: 'fa-snowflake',
      75: 'fa-snowflake',
      80: 'fa-cloud-showers-heavy',
      81: 'fa-cloud-showers-heavy',
      82: 'fa-cloud-showers-heavy',
      85: 'fa-snowflake',
      86: 'fa-snowflake',
      95: 'fa-cloud-bolt',
    };
    return '<i class="fa-solid ' + (icon[code] || icon[0]) + '"></i>';
}

function getWeatherDescription(code) {
    const codes = {
      0: "Clear",
      1: "Clear",
      2: "Cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Fog",
      51: "Drizzle",
      53: "Drizzle",
      55: "Drizzle",
      61: "Light rain",
      63: "Rain",
      65: "Heavy rain",
      71: "Light snow",
      73: "Snow",
      75: "Heavy snow",
      80: "Showers",
      81: "Showers",
      82: "Heavy showers",
      85: "Snow showers",
      86: "Heavy Snow",
      95: "Thunderstorm"
    };
    return codes[code] || "Unknown";
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
        const temp = match[2];
        return { temp: temp.replace('°C', '') };
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
        let weatherCode = null;

        // Try Open-Meteo first
        try {
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
            const weatherData = await fetchWithRetry(weatherUrl, 2);
            if (weatherData.current_weather) {
                temp = Math.round(weatherData.current_weather.temperature);
                weatherCode = weatherData.current_weather.weathercode;
                outlook = getWeatherDescription(weatherCode);
            } else {
                throw new Error('No current_weather data');
            }
        } catch (openMeteoError) {
            console.warn('Open-Meteo failed, trying wttr.in fallback:', openMeteoError);
            const fallbackData = await fetchWeatherFallback(lat, lon);
            if (fallbackData) {
                temp = parseInt(fallbackData.temp);
                outlook = "Current";
                weatherCode = 0;
            } else {
                throw new Error('Both weather APIs failed');
            }
        }

        if (temp !== null && outlook !== null) {
            const weatherIcon = getWeatherIcon(weatherCode);
            weatherEl.innerHTML = `
                <div class="weather-location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(displayLocation)}</div>
                <div class="weather-temp"><i class="fa-solid fa-temperature-half"></i> ${temp}°C</div>
                <div class="weather-outlook">${weatherIcon} ${escapeHtml(outlook)}</div>
            `;
        } else {
            weatherEl.innerHTML = `<div class="weather-fallback">${getWeatherIcon(0)} --°C</div>`;
        }
    } catch (err) {
        console.error('Weather fetch ultimately failed:', err);
        weatherEl.innerHTML = `<div class="weather-fallback">${getWeatherIcon(0)} --°C</div>`;
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
