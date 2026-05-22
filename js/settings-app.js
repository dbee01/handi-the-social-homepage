// js/settings-app.js
import { loadSettings, saveSettings } from './core/settings.js';
import { saveMusic, saveGallery } from './core/storage.js';

const saveBtn = document.getElementById('saveBtn');
const exitBtn = document.getElementById('exitBtn');
const moduleHeaders = document.querySelectorAll('.module-header');
const toggleSwitches = document.querySelectorAll('.toggle-switch');

let emergencyContacts = [];
let phoneContacts = [];

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));
}

// Render both contact lists
function renderContacts(type) {
    const container = document.getElementById(`${type}ContactsList`);
    if (!container) return;
    const contacts = type === 'emergency' ? emergencyContacts : phoneContacts;
    if (contacts.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">No contacts</div>';
        return;
    }
    container.innerHTML = contacts.map((c, i) => `
        <div class="contact-item">
            <div class="contact-photo">${c.photo ? `<img src="${c.photo}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">` : '<i class="fa-solid fa-user"></i>'}</div>
            <div class="contact-info">
                <strong>${escapeHtml(c.name)}</strong>
                <small>${escapeHtml(c.number)}</small>
                ${c.relation ? `<small style="color:#00ff41;">${escapeHtml(c.relation)}</small>` : ''}
            </div>
            <div class="contact-actions"><button data-type="${type}" data-index="${i}" class="delete-contact">✖</button></div>
        </div>
    `).join('');

    document.querySelectorAll('.delete-contact').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const type = btn.dataset.type;
            const idx = parseInt(btn.dataset.index);
            if (type === 'emergency') emergencyContacts.splice(idx, 1);
            else phoneContacts.splice(idx, 1);
            renderContacts(type);
        };
    });
}

// =========================================================
// WEATHER SETTINGS FUNCTIONS
// =========================================================
const weatherLocationInput = document.getElementById('weatherLocation');
const weatherCountrySelect = document.getElementById('weatherCountry');
const detectLocationBtn = document.getElementById('detectLocationBtn');
const weatherPreview = document.getElementById('weatherPreview');

function getWeatherDescription(code) {
    const codes = {
        0: "☀️ Clear sky",
        1: "🌤️ Mainly clear",
        2: "⛅ Partly cloudy",
        3: "☁️ Overcast",
        45: "🌫️ Fog",
        48: "🌫️ Fog",
        51: "🌧️ Light drizzle",
        53: "🌧️ Moderate drizzle",
        55: "🌧️ Dense drizzle",
        61: "🌧️ Light rain",
        63: "🌧️ Moderate rain",
        65: "🌧️ Heavy rain",
        71: "🌨️ Light snow",
        73: "🌨️ Moderate snow",
        75: "🌨️ Heavy snow",
        80: "🌧️ Rain showers",
        81: "🌧️ Moderate showers",
        82: "🌧️ Heavy showers",
        85: "🌨️ Snow showers",
        86: "🌨️ Heavy snow showers",
        95: "⛈️ Thunderstorm"
    };
    return codes[code] || "🌡️ Unknown";
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

async function showWeatherPreview() {
    if (!weatherPreview) return;
    const location = weatherLocationInput?.value?.trim();
    const country = weatherCountrySelect?.value;
    
    if (!location) {
        weatherPreview.style.display = 'none';
        return;
    }
    
    weatherPreview.style.display = 'block';
    weatherPreview.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fetching weather...';
    
    try {
        const coords = await getCoordinates(location, country);
        if (!coords) {
            weatherPreview.innerHTML = '<span class="error"><i class="fa-solid fa-exclamation-triangle"></i> Location not found. Try a different town/city.</span>';
            return;
        }
        
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();
        
        if (weatherData.current_weather) {
            const temp = Math.round(weatherData.current_weather.temperature);
            const weatherCode = weatherData.current_weather.weathercode;
            const weatherDesc = getWeatherDescription(weatherCode);
            
            weatherPreview.innerHTML = `
                <i class="fa-solid fa-location-dot"></i> <strong>${coords.displayName}</strong><br>
                <i class="fa-solid fa-temperature-low"></i> ${temp}°C – ${weatherDesc}<br>
                <small style="color: #64748b;">✓ This location will be used for your dashboard weather widget.</small>
            `;
        } else {
            weatherPreview.innerHTML = '<span class="error"><i class="fa-solid fa-exclamation-triangle"></i> Could not fetch weather data.</span>';
        }
    } catch (err) {
        console.error('Weather preview error:', err);
        weatherPreview.innerHTML = '<span class="error"><i class="fa-solid fa-exclamation-triangle"></i> Error fetching weather. Please try again.</span>';
    }
}

function detectMyLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }
    
    if (weatherPreview) {
        weatherPreview.style.display = 'block';
        weatherPreview.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Detecting your location...';
    }
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            const reverseUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
            try {
                const response = await fetch(reverseUrl, {
                    headers: { 'User-Agent': 'HandiHomepage/1.0 (https://handihomepage.com)' }
                });
                const data = await response.json();
                
                let city = '';
                let countryCode = '';
                if (data.address) {
                    city = data.address.city || data.address.town || data.address.village || data.address.county;
                    countryCode = data.address.country_code?.toUpperCase() || 'IE';
                }
                
                if (city && countryCode) {
                    if (weatherLocationInput) weatherLocationInput.value = city;
                    if (weatherCountrySelect) weatherCountrySelect.value = countryCode;
                    await showWeatherPreview();
                } else if (weatherPreview) {
                    weatherPreview.innerHTML = '<span class="error">Could not determine your city. Try typing it manually.</span>';
                }
            } catch (err) {
                console.error('Reverse geocoding error:', err);
                if (weatherPreview) {
                    weatherPreview.innerHTML = '<span class="error">Error detecting location. Try typing it manually.</span>';
                }
            }
        },
        (error) => {
            let errorMsg = '';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMsg = 'Location permission denied. Please allow location access or type your city manually.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMsg = 'Location information unavailable. Please type your city manually.';
                    break;
                case error.TIMEOUT:
                    errorMsg = 'Location request timed out. Please try again.';
                    break;
                default:
                    errorMsg = 'An unknown error occurred.';
            }
            if (weatherPreview) {
                weatherPreview.innerHTML = `<span class="error">${errorMsg}</span>`;
            }
        }
    );
}

// Sync module visibility with the selection popup
function syncModuleTogglesWithPopup() {
    const modulesSelected = localStorage.getItem('modulesSelected');
    const moduleOrder = localStorage.getItem('moduleOrder');
    
    if (modulesSelected === 'true' && moduleOrder) {
        const enabledModules = JSON.parse(moduleOrder);
        
        toggleSwitches.forEach(sw => {
            const moduleId = sw.closest('.module-header').dataset.module;
            const isEnabled = enabledModules.includes(moduleId);
            if (isEnabled) {
                sw.classList.add('active');
            } else {
                sw.classList.remove('active');
            }
        });
    }
}

// Load UI from localStorage
function loadUI() {
    const settings = loadSettings();
    
    // Toggles
    toggleSwitches.forEach(sw => {
        const moduleId = sw.closest('.module-header').dataset.module;
        if (settings.enabledModules?.[moduleId] !== false) sw.classList.add('active');
        else sw.classList.remove('active');
    });
    
    // Bus
    if (settings.bus) {
        if (document.getElementById('busRouteIds')) document.getElementById('busRouteIds').value = settings.bus.routeIds || '';
        if (document.getElementById('busStopIds')) document.getElementById('busStopIds').value = settings.bus.stopIds || '';
    }
    
    // Gallery
    if (settings.gallery) {
        if (document.getElementById('gallerySpeed')) document.getElementById('gallerySpeed').value = settings.gallery.speed || 3000;
        if (document.getElementById('galleryAutoStart')) document.getElementById('galleryAutoStart').value = settings.gallery.autoStart ? 'true' : 'false';
    }
    
    // Music
    if (settings.music) {
        if (document.getElementById('musicVolume')) document.getElementById('musicVolume').value = settings.music.volume || 70;
        if (document.getElementById('volumeValue')) document.getElementById('volumeValue').innerText = settings.music.volume + '%';
        if (document.getElementById('musicShuffle')) document.getElementById('musicShuffle').value = settings.music.shuffle ? 'true' : 'false';
    }
    
    // News
    if (settings.news) {
        if (document.getElementById('newsRssUrl')) document.getElementById('newsRssUrl').value = settings.news.rssUrl || '';
        if (document.getElementById('newsRefresh')) document.getElementById('newsRefresh').value = settings.news.refresh || 15;
        if (document.getElementById('newsMaxArticles')) document.getElementById('newsMaxArticles').value = settings.news.maxArticles || 4;
    }
    
    // Mastodon
    if (settings.mastodon) {
        if (document.getElementById('mastodonInstance')) document.getElementById('mastodonInstance').value = settings.mastodon.instance || 'https://mastodon.ie';
        if (document.getElementById('mastodonLimit')) document.getElementById('mastodonLimit').value = settings.mastodon.limit || 4;
    }
    
    // Weather
    if (settings.weather) {
        if (document.getElementById('weatherLocation')) document.getElementById('weatherLocation').value = settings.weather.location || 'Cork';
        if (document.getElementById('weatherCountry')) document.getElementById('weatherCountry').value = settings.weather.country || 'IE';
        setTimeout(() => showWeatherPreview(), 100);
    }
    
    // Calendar (Proton ICS)
    if (settings.calendar) {
        if (document.getElementById('calendarUrl')) document.getElementById('calendarUrl').value = settings.calendar.url || '';
        if (document.getElementById('calendarNotificationMinutes')) document.getElementById('calendarNotificationMinutes').value = settings.calendar.notificationMinutes || 30;
    }
    
    // Emergency
    if (settings.emergency) {
        emergencyContacts = settings.emergency.contacts || [];
        if (document.getElementById('emergencyInterval')) document.getElementById('emergencyInterval').value = settings.emergency.interval || 5;
        renderContacts('emergency');
    }
    
    // Phone
    if (settings.phone) {
        phoneContacts = settings.phone.contacts || [];
        if (document.getElementById('autoDialDelay')) document.getElementById('autoDialDelay').value = settings.phone.autoDialDelay || 10;
        renderContacts('phone');
    }
    
    // Chat
    if (settings.chat) {
        if (document.getElementById('chatHomeserver')) document.getElementById('chatHomeserver').value = settings.chat.homeserver || 'https://matrix.org';
        if (document.getElementById('chatAccessToken')) document.getElementById('chatAccessToken').value = settings.chat.accessToken || '';
        if (document.getElementById('chatUserId')) document.getElementById('chatUserId').value = settings.chat.userId || '';
        if (document.getElementById('chatRoom1')) document.getElementById('chatRoom1').value = settings.chat.rooms?.[0] || '';
        if (document.getElementById('chatRoom2')) document.getElementById('chatRoom2').value = settings.chat.rooms?.[1] || '';
        if (document.getElementById('chatRoom3')) document.getElementById('chatRoom3').value = settings.chat.rooms?.[2] || '';
        if (document.getElementById('chatRefreshInterval')) document.getElementById('chatRefreshInterval').value = settings.chat.refreshInterval || 30;
    }
    
    // Sync toggles with popup selection
    syncModuleTogglesWithPopup();
}

// Collect all settings from form
function collectSettings() {
    const enabledModules = {};
    
    const modulesSelected = localStorage.getItem('modulesSelected');
    const moduleOrder = localStorage.getItem('moduleOrder');
    
    if (modulesSelected === 'true' && moduleOrder) {
        const enabledList = JSON.parse(moduleOrder);
        toggleSwitches.forEach(sw => {
            const moduleId = sw.closest('.module-header').dataset.module;
            enabledModules[moduleId] = enabledList.includes(moduleId);
        });
    } else {
        toggleSwitches.forEach(sw => {
            const moduleId = sw.closest('.module-header').dataset.module;
            enabledModules[moduleId] = sw.classList.contains('active');
        });
    }
    
    return {
        enabledModules,
        bus: {
            routeIds: document.getElementById('busRouteIds')?.value || '',
            stopIds: document.getElementById('busStopIds')?.value || ''
        },
        gallery: {
            speed: parseInt(document.getElementById('gallerySpeed')?.value) || 3000,
            autoStart: document.getElementById('galleryAutoStart')?.value === 'true'
        },
        music: {
            volume: parseInt(document.getElementById('musicVolume')?.value) || 70,
            shuffle: document.getElementById('musicShuffle')?.value === 'true'
        },
        news: {
            rssUrl: document.getElementById('newsRssUrl')?.value || '',
            refresh: parseInt(document.getElementById('newsRefresh')?.value) || 15,
            maxArticles: parseInt(document.getElementById('newsMaxArticles')?.value) || 4
        },
        mastodon: {
            instance: document.getElementById('mastodonInstance')?.value || 'https://mastodon.ie',
            limit: parseInt(document.getElementById('mastodonLimit')?.value) || 5
        },
        weather: {
            location: document.getElementById('weatherLocation')?.value || 'Cork',
            country: document.getElementById('weatherCountry')?.value || 'IE'
        },
        calendar: {
            url: document.getElementById('calendarUrl')?.value || '',
            notificationMinutes: parseInt(document.getElementById('calendarNotificationMinutes')?.value) || 30
        },
        emergency: {
            contacts: emergencyContacts,
            interval: parseInt(document.getElementById('emergencyInterval')?.value) || 5
        },
        phone: {
            contacts: phoneContacts,
            autoDialDelay: parseInt(document.getElementById('autoDialDelay')?.value) || 10
        },
        chat: {
            homeserver: document.getElementById('chatHomeserver')?.value || 'https://matrix.org',
            accessToken: document.getElementById('chatAccessToken')?.value || '',
            userId: document.getElementById('chatUserId')?.value || '',
            rooms: [
                document.getElementById('chatRoom1')?.value || '',
                document.getElementById('chatRoom2')?.value || '',
                document.getElementById('chatRoom3')?.value || ''
            ].filter(r => r.trim() !== ''),
            refreshInterval: parseInt(document.getElementById('chatRefreshInterval')?.value) || 30
        }
    };
}

function saveAllSettings() {
    const settings = collectSettings();
    saveSettings(settings);
    
    // Clear popup selection so dashboard uses settings
    localStorage.removeItem('modulesSelected');
    localStorage.removeItem('moduleOrder');
    
    alert('Settings saved!');
    location.reload();
}

// Expand/collapse
moduleHeaders.forEach(header => {
    header.addEventListener('click', (e) => {
        if (e.target.closest('.toggle-switch')) return;
        header.nextElementSibling.classList.toggle('active');
    });
});

// Toggle switches
toggleSwitches.forEach(sw => {
    sw.addEventListener('click', (e) => {
        e.stopPropagation();
        sw.classList.toggle('active');
    });
});

// Volume slider
const volSlider = document.getElementById('musicVolume');
const volSpan = document.getElementById('volumeValue');
if (volSlider && volSpan) volSlider.addEventListener('input', () => volSpan.innerText = volSlider.value + '%');

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

// Helper: add contact with photo
function addContact(type, nameField, phoneField, photoField) {
    const name = document.getElementById(nameField)?.value.trim();
    const phone = document.getElementById(phoneField)?.value.trim();
    const photoFile = document.getElementById(photoField)?.files[0];
    if (!name || !phone) {
        alert('Please enter name and phone number');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const contact = { name, number: phone, photo: e.target.result };
        if (type === 'emergency') emergencyContacts.push(contact);
        else phoneContacts.push(contact);
        renderContacts(type);
        document.getElementById(nameField).value = '';
        document.getElementById(phoneField).value = '';
        if (document.getElementById(photoField)) document.getElementById(photoField).value = '';
    };
    if (photoFile) {
        reader.readAsDataURL(photoFile);
    } else {
        reader.onload({ target: { result: null } });
    }
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
                    console.log(`Deleted database: ${db.name}`);
                } catch (e) {
                    console.warn(`Could not delete ${db.name}:`, e);
                }
            }
        }
    }

    alert('All data has been reset. The application will now restart.');
    window.location.href = '/';
}

// Wire the Reset button
document.addEventListener('DOMContentLoaded', () => {
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetAllData);
});

// Inline add handlers
document.getElementById('addEmergencyInline')?.addEventListener('click', () => {
    addContact('emergency', 'emergencyName', 'emergencyPhone', 'emergencyPhoto');
});
document.getElementById('addPhoneInline')?.addEventListener('click', () => {
    addContact('phone', 'phoneName', 'phoneNumber', 'phonePhoto');
});

// Weather settings event listeners
if (detectLocationBtn) {
    detectLocationBtn.addEventListener('click', detectMyLocation);
}
if (weatherLocationInput) {
    let previewTimeout;
    weatherLocationInput.addEventListener('input', () => {
        clearTimeout(previewTimeout);
        previewTimeout = setTimeout(showWeatherPreview, 800);
    });
}
if (weatherCountrySelect) {
    weatherCountrySelect.addEventListener('change', showWeatherPreview);
}

// Save & exit buttons
if (saveBtn) saveBtn.addEventListener('click', saveAllSettings);
if (exitBtn) exitBtn.addEventListener('click', () => window.location.href = 'index.html');

// Initialize
loadUI();

// URL Parameter Handler
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const paramValue = urlParams.get('args');
    
    if (!paramValue) return;
    
    const validModules = ['gallery', 'music', 'news', 'mastodon', 'phone', 'bus', 'emergency', 'weather', 'calendar', 'chat'];
    const targetModule = paramValue.toLowerCase();
    
    if (!validModules.includes(targetModule)) return;
    
    const moduleCard = document.querySelector(`.module-card[data-module="${targetModule}"]`);
    if (!moduleCard) return;
    
    const configDiv = moduleCard.querySelector('.module-config');
    if (configDiv) configDiv.classList.add('active');
    
    moduleCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    moduleCard.style.transition = 'background-color 0.3s';
    moduleCard.style.backgroundColor = '#eaf2ff';
    setTimeout(() => {
        moduleCard.style.backgroundColor = '';
    }, 1500);
})();