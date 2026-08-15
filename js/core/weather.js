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
    const svg = {
      0: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
      1: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
      2: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><circle cx="7" cy="8" r="2"/><path d="M7 3v2M7 11v2M2 8h2M10 8h2"/></svg>',
      3: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>',
      45: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h16M6 18h12M9 10h6"/></svg>',
      48: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h16M6 18h12M9 10h6"/></svg>',
      51: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M8 20v2M12 20v3M16 20v2"/></svg>',
      53: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M8 20v2M12 20v3M16 20v2"/></svg>',
      55: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M8 20v2M12 20v3M16 20v2"/></svg>',
      61: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M8 19l-1 2M12 19l-1 3M16 19l-1 2"/></svg>',
      63: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M8 19l-1 2M12 19l-1 3M16 19l-1 2"/></svg>',
      65: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M7 19l-2 2M11 19l-2 4M15 19l-2 2"/></svg>',
      71: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M8 20h.01M12 21h.01M16 20h.01"/></svg>',
      73: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M8 20h.01M12 21h.01M16 20h.01"/></svg>',
      75: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M8 20h.01M12 21h.01M16 20h.01"/></svg>',
      80: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M8 19l-1 2M12 19l-1 3M16 19l-1 2"/></svg>',
      81: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M8 19l-1 2M12 19l-1 3M16 19l-1 2"/></svg>',
      82: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M7 19l-2 2M11 19l-2 4M15 19l-2 2"/></svg>',
      85: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M8 20h.01M12 21h.01M16 20h.01"/></svg>',
      86: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M8 20h.01M12 21h.01M16 20h.01"/></svg>',
      95: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M13 15l-2 4h3l-1 3"/></svg>',
    };
    return svg[code] || svg[0];
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
                <div class="weather-location"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg> ${escapeHtml(displayLocation)}</div>
                <div class="weather-temp"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4a2 2 0 0 0-4 0v10.76a4 4 0 1 0 4 0z"/></svg> ${temp}°C</div>
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
