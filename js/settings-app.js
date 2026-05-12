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

function renderContacts() {
    const emergencyContainer = document.getElementById('emergencyContactsList');
    if (emergencyContainer) {
        if (emergencyContacts.length === 0) emergencyContainer.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">No contacts</div>';
        else {
            emergencyContainer.innerHTML = emergencyContacts.map((c, i) => `
                <div class="contact-item">
                    <span><strong>${escapeHtml(c.name)}</strong><br><small>${escapeHtml(c.number)}</small></span>
                    <button data-type="emergency" data-index="${i}" class="delete-contact">✖</button>
                </div>
            `).join('');
        }
    }
    const phoneContainer = document.getElementById('phoneContactsList');
    if (phoneContainer) {
        if (phoneContacts.length === 0) phoneContainer.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">No contacts</div>';
        else {
            phoneContainer.innerHTML = phoneContacts.map((c, i) => `
                <div class="contact-item">
                    <span><strong>${escapeHtml(c.name)}</strong><br><small>${escapeHtml(c.number)}</small></span>
                    <button data-type="phone" data-index="${i}" class="delete-contact">✖</button>
                </div>
            `).join('');
        }
    }
    document.querySelectorAll('.delete-contact').forEach(btn => {
        btn.onclick = (e) => {
            const type = btn.dataset.type;
            const idx = parseInt(btn.dataset.index);
            if (type === 'emergency') emergencyContacts.splice(idx, 1);
            else phoneContacts.splice(idx, 1);
            renderContacts();
        };
    });
}

function loadUI() {
    const settings = loadSettings();
    toggleSwitches.forEach(sw => {
        const moduleId = sw.closest('.module-header').dataset.module;
        if (settings.enabledModules?.[moduleId]) sw.classList.add('active');
        else sw.classList.remove('active');
    });
    if (settings.bus) {
        if (document.getElementById('busRouteIds')) document.getElementById('busRouteIds').value = settings.bus.routeIds || '';
        if (document.getElementById('busStopIds')) document.getElementById('busStopIds').value = settings.bus.stopIds || '';
    }
    if (settings.gallery) {
        if (document.getElementById('gallerySpeed')) document.getElementById('gallerySpeed').value = settings.gallery.speed || 3000;
        if (document.getElementById('galleryAutoStart')) document.getElementById('galleryAutoStart').value = settings.gallery.autoStart ? 'true' : 'false';
    }
    if (settings.music) {
        if (document.getElementById('musicVolume')) document.getElementById('musicVolume').value = settings.music.volume || 70;
        if (document.getElementById('volumeValue')) document.getElementById('volumeValue').innerText = settings.music.volume + '%';
        if (document.getElementById('musicShuffle')) document.getElementById('musicShuffle').value = settings.music.shuffle ? 'true' : 'false';
    }
    if (settings.news) {
        if (document.getElementById('newsRssUrl')) document.getElementById('newsRssUrl').value = settings.news.rssUrl || '';
        if (document.getElementById('newsRefresh')) document.getElementById('newsRefresh').value = settings.news.refresh || 15;
        if (document.getElementById('newsMaxArticles')) document.getElementById('newsMaxArticles').value = settings.news.maxArticles || 20;
    }
    if (settings.mastodon) {
        if (document.getElementById('mastodonInstance')) document.getElementById('mastodonInstance').value = settings.mastodon.instance || 'https://mastodon.ie';
        if (document.getElementById('mastodonLimit')) document.getElementById('mastodonLimit').value = settings.mastodon.limit || 5;
    }
    if (settings.emergency) {
        emergencyContacts = settings.emergency.contacts || [];
        if (document.getElementById('emergencyInterval')) document.getElementById('emergencyInterval').value = settings.emergency.interval || 5;
    }
    if (settings.phone) {
        phoneContacts = settings.phone.contacts || [];
        if (document.getElementById('autoDialDelay')) document.getElementById('autoDialDelay').value = settings.phone.autoDialDelay || 10;
    }
    renderContacts();
}

function collectSettings() {
    const enabledModules = {};
    toggleSwitches.forEach(sw => {
        const moduleId = sw.closest('.module-header').dataset.module;
        enabledModules[moduleId] = sw.classList.contains('active');
    });
    return {
        enabledModules,
        bus: { routeIds: document.getElementById('busRouteIds')?.value || '', stopIds: document.getElementById('busStopIds')?.value || '' },
        gallery: { speed: parseInt(document.getElementById('gallerySpeed')?.value) || 3000, autoStart: document.getElementById('galleryAutoStart')?.value === 'true' },
        music: { volume: parseInt(document.getElementById('musicVolume')?.value) || 70, shuffle: document.getElementById('musicShuffle')?.value === 'true' },
        news: { rssUrl: document.getElementById('newsRssUrl')?.value || '', refresh: parseInt(document.getElementById('newsRefresh')?.value) || 15, maxArticles: parseInt(document.getElementById('newsMaxArticles')?.value) || 20 },
        mastodon: { instance: document.getElementById('mastodonInstance')?.value || 'https://mastodon.ie', limit: parseInt(document.getElementById('mastodonLimit')?.value) || 5 },
        emergency: { contacts: emergencyContacts, interval: parseInt(document.getElementById('emergencyInterval')?.value) || 5 },
        phone: { contacts: phoneContacts, autoDialDelay: parseInt(document.getElementById('autoDialDelay')?.value) || 10 }
    };
}

function saveAllSettings() {
    saveSettings(collectSettings());
    alert('Settings saved!');
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

// Upload buttons
document.getElementById('uploadGalleryBtn')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        await saveGallery(files.map(f => ({ name: f.name, file: f })));
        alert(`Saved ${files.length} images`);
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
        await saveMusic(files.map(f => ({ name: f.name, file: f })));
        alert(`Saved ${files.length} music files`);
    };
    input.click();
});

// Inline add contacts
document.getElementById('addEmergencyInline')?.addEventListener('click', () => {
    const name = document.getElementById('emergencyName')?.value.trim();
    const phone = document.getElementById('emergencyPhone')?.value.trim();
    if (!name || !phone) return alert('Enter name and phone');
    emergencyContacts.push({ name, number: phone });
    renderContacts();
    document.getElementById('emergencyName').value = '';
    document.getElementById('emergencyPhone').value = '';
});
document.getElementById('addPhoneInline')?.addEventListener('click', () => {
    const name = document.getElementById('phoneName')?.value.trim();
    const phone = document.getElementById('phoneNumber')?.value.trim();
    if (!name || !phone) return alert('Enter name and phone');
    phoneContacts.push({ name, number: phone });
    renderContacts();
    document.getElementById('phoneName').value = '';
    document.getElementById('phoneNumber').value = '';
});

// Save & exit
saveBtn?.addEventListener('click', saveAllSettings);
exitBtn?.addEventListener('click', () => location.href = 'index.html');

loadUI();