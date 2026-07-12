// js/settings-app.js
import { loadSettings, saveSettings } from './core/settings.js';
import { saveMusic, saveGallery } from './core/storage.js';

const saveBtn = document.getElementById('saveBtn');
const exitBtn = document.getElementById('exitBtn');
const resetBtn = document.getElementById('resetBtn');

// Save all settings
function saveAllSettings() {
    const settings = loadSettings();
    
    // Collect toggle states safely
    const toggles = document.querySelectorAll('.toggle-switch');
    toggles.forEach(sw => {
        const moduleCard = sw.closest('.module-card');
        if (moduleCard && moduleCard.dataset.module) {
            const moduleId = moduleCard.dataset.module;
            if (!settings.enabledModules) settings.enabledModules = {};
            settings.enabledModules[moduleId] = sw.classList.contains('active');
        }
    });
    
    // Collect other form values
    if (document.getElementById('weatherLocation')) {
        if (!settings.weather) settings.weather = {};
        settings.weather.location = document.getElementById('weatherLocation')?.value || 'Cork';
        settings.weather.country = document.getElementById('weatherCountry')?.value || 'IE';
    }
    
    if (document.getElementById('busRouteIds')) {
        if (!settings.bus) settings.bus = {};
        settings.bus.routeIds = document.getElementById('busRouteIds')?.value || '';
        settings.bus.stopIds = document.getElementById('busStopIds')?.value || '';
    }
    
    if (document.getElementById('gallerySpeed')) {
        if (!settings.gallery) settings.gallery = {};
        settings.gallery.speed = parseInt(document.getElementById('gallerySpeed')?.value) || 3000;
        settings.gallery.autoStart = document.getElementById('galleryAutoStart')?.value === 'true';
    }
    
    if (document.getElementById('musicVolume')) {
        if (!settings.music) settings.music = {};
        settings.music.volume = parseInt(document.getElementById('musicVolume')?.value) || 70;
        settings.music.shuffle = document.getElementById('musicShuffle')?.value === 'true';
    }
    
    if (document.getElementById('newsRssUrl')) {
        if (!settings.news) settings.news = {};
        settings.news.rssUrl = document.getElementById('newsRssUrl')?.value || 'https://www.thejournal.ie/feed/';
        settings.news.refresh = parseInt(document.getElementById('newsRefresh')?.value) || 15;
        settings.news.maxArticles = parseInt(document.getElementById('newsMaxArticles')?.value) || 4;
    }
    
    if (document.getElementById('mastodonInstance')) {
        if (!settings.mastodon) settings.mastodon = {};
        settings.mastodon.instance = document.getElementById('mastodonInstance')?.value || 'https://mastodon.ie';
        settings.mastodon.limit = parseInt(document.getElementById('mastodonLimit')?.value) || 4;
    }
    
    if (document.getElementById('calendarUrl')) {
        if (!settings.calendar) settings.calendar = {};
        settings.calendar.url = document.getElementById('calendarUrl')?.value || '';
    }
    
    if (document.getElementById('autoDialDelay')) {
        if (!settings.phone) settings.phone = {};
        settings.phone.autoDialDelay = parseInt(document.getElementById('autoDialDelay')?.value) || 10;
    }
    
    if (document.getElementById('chatHomeserver')) {
        if (!settings.chat) settings.chat = {};
        settings.chat.homeserver = document.getElementById('chatHomeserver')?.value || 'https://matrix.org';
        settings.chat.accessToken = document.getElementById('chatAccessToken')?.value || '';
        settings.chat.userId = document.getElementById('chatUserId')?.value || '';
        settings.chat.rooms = [
            document.getElementById('chatRoom1')?.value || '',
            document.getElementById('chatRoom2')?.value || '',
            document.getElementById('chatRoom3')?.value || ''
        ].filter(r => r.trim() !== '');
        settings.chat.refreshInterval = parseInt(document.getElementById('chatRefreshInterval')?.value) || 30;
    }
    
    saveSettings(settings);
    alert('Settings saved!');
    location.reload();
}

// Reset all data
async function resetAllData() {
    const confirmed = confirm(
        '⚠️ WARNING: This will permanently delete ALL of your data:\n\n' +
        '• All uploaded images (gallery)\n' +
        '• All uploaded music files\n' +
        '• All phone & emergency contacts\n' +
        '• All module settings (toggles, speeds, volumes, etc.)\n\n' +
        'The page will reload and return to the dashboard.\n\n' +
        'Are you absolutely sure?'
    );
    if (!confirmed) return;

    localStorage.clear();
    sessionStorage.clear();

    if (window.indexedDB) {
        const databases = await indexedDB.databases();
        for (const db of databases) {
            if (db.name) {
                try {
                    await new Promise((resolve, reject) => {
                        const req = indexedDB.deleteDatabase(db.name);
                        req.onsuccess = () => resolve();
                        req.onerror = (e) => reject(e);
                    });
                } catch (e) {}
            }
        }
    }

    alert('All data has been reset. The application will now restart.');
    window.location.href = '/';
}

// Wire up buttons
if (saveBtn) saveBtn.addEventListener('click', saveAllSettings);
if (exitBtn) exitBtn.addEventListener('click', () => window.location.href = 'index.html');
if (resetBtn) resetBtn.addEventListener('click', resetAllData);

// Gallery & Music uploads
document.getElementById('uploadGalleryBtn')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        const processed = files.map(f => ({ name: f.name, file: f }));
        await saveGallery(processed);
        alert(`Saved ${processed.length} images`);
    };
    input.click();
});

document.getElementById('uploadMusicBtn')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'audio/*';
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        const processed = files.map(f => ({ name: f.name, file: f }));
        await saveMusic(processed);
        alert(`Saved ${processed.length} music files`);
    };
    input.click();
});

// Volume slider
const volSlider = document.getElementById('musicVolume');
const volSpan = document.getElementById('volumeValue');
if (volSlider && volSpan) volSlider.addEventListener('input', () => volSpan.innerText = volSlider.value + '%');

// Weather preview
const weatherLocationInput = document.getElementById('weatherLocation');
const weatherCountrySelect = document.getElementById('weatherCountry');
const detectLocationBtn = document.getElementById('detectLocationBtn');
const weatherPreview = document.getElementById('weatherPreview');

function getWeatherDescription(code) {
    const codes = {
        0: "☀️ Clear sky", 1: "🌤️ Mainly clear", 2: "⛅ Partly cloudy", 3: "☁️ Overcast",
        45: "🌫️ Fog", 48: "🌫️ Fog", 51: "🌧️ Drizzle", 53: "🌧️ Drizzle", 55: "🌧️ Drizzle",
        61: "🌧️ Light rain", 63: "🌧️ Moderate rain", 65: "🌧️ Heavy rain",
        71: "🌨️ Light snow", 73: "🌨️ Moderate snow", 75: "🌨️ Heavy snow",
        80: "🌧️ Showers", 81: "🌧️ Showers", 82: "🌧️ Heavy showers",
        85: "🌨️ Snow showers", 86: "🌨️ Heavy snow showers", 95: "⛈️ Thunderstorm"
    };
    return codes[code] || "🌡️ Unknown";
}

async function getCoordinates(location, countryCode) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)},${countryCode}&format=json&limit=1`;
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'HandiHomepage/1.0' } });
        const data = await response.json();
        if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        return null;
    } catch { return null; }
}

async function showWeatherPreview() {
    if (!weatherPreview) return;
    const location = weatherLocationInput?.value?.trim();
    const country = weatherCountrySelect?.value;
    if (!location) { weatherPreview.style.display = 'none'; return; }
    weatherPreview.style.display = 'block';
    weatherPreview.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fetching weather...';
    try {
        const coords = await getCoordinates(location, country);
        if (!coords) { weatherPreview.innerHTML = '<span class="error">Location not found.</span>'; return; }
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`);
        const weatherData = await weatherRes.json();
        if (weatherData.current_weather) {
            const temp = Math.round(weatherData.current_weather.temperature);
            const desc = getWeatherDescription(weatherData.current_weather.weathercode);
            weatherPreview.innerHTML = `<strong>${location}</strong>: ${desc} ${temp}°C <small>✓</small>`;
        } else { weatherPreview.innerHTML = '<span class="error">No weather data.</span>'; }
    } catch { weatherPreview.innerHTML = '<span class="error">Error fetching weather.</span>'; }
}

function detectMyLocation() {
    if (!navigator.geolocation) { alert('Geolocation not supported.'); return; }
    if (weatherPreview) { weatherPreview.style.display = 'block'; weatherPreview.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Detecting...'; }
    navigator.geolocation.getCurrentPosition(async (position) => {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`;
        try {
            const response = await fetch(url, { headers: { 'User-Agent': 'HandiHomepage/1.0' } });
            const data = await response.json();
            let city = data.address?.city || data.address?.town || data.address?.village;
            let countryCode = data.address?.country_code?.toUpperCase() || 'IE';
            if (city && weatherLocationInput) weatherLocationInput.value = city;
            if (weatherCountrySelect) weatherCountrySelect.value = countryCode;
            await showWeatherPreview();
        } catch { weatherPreview.innerHTML = '<span class="error">Could not detect city.</span>'; }
    }, () => { weatherPreview.innerHTML = '<span class="error">Location permission denied.</span>'; });
}

if (detectLocationBtn) detectLocationBtn.addEventListener('click', detectMyLocation);
if (weatherLocationInput) weatherLocationInput.addEventListener('input', () => setTimeout(showWeatherPreview, 800));
if (weatherCountrySelect) weatherCountrySelect.addEventListener('change', showWeatherPreview);

console.log('settings-app.js loaded');