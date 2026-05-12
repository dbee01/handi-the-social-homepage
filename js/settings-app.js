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

    // Attach delete handlers
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

// Load UI from localStorage
function loadUI() {
    const settings = loadSettings();
    // Toggles
    toggleSwitches.forEach(sw => {
        const moduleId = sw.closest('.module-header').dataset.module;
        if (settings.enabledModules?.[moduleId]) sw.classList.add('active');
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
        if (document.getElementById('newsMaxArticles')) document.getElementById('newsMaxArticles').value = settings.news.maxArticles || 20;
    }
    // Mastodon
    if (settings.mastodon) {
        if (document.getElementById('mastodonInstance')) document.getElementById('mastodonInstance').value = settings.mastodon.instance || 'https://mastodon.ie';
        if (document.getElementById('mastodonLimit')) document.getElementById('mastodonLimit').value = settings.mastodon.limit || 5;
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
}

// Collect all settings from form
function collectSettings() {
    const enabledModules = {};
    toggleSwitches.forEach(sw => {
        const moduleId = sw.closest('.module-header').dataset.module;
        enabledModules[moduleId] = sw.classList.contains('active');
    });
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
            maxArticles: parseInt(document.getElementById('newsMaxArticles')?.value) || 20
        },
        mastodon: {
            instance: document.getElementById('mastodonInstance')?.value || 'https://mastodon.ie',
            limit: parseInt(document.getElementById('mastodonLimit')?.value) || 5
        },
        emergency: {
            contacts: emergencyContacts,
            interval: parseInt(document.getElementById('emergencyInterval')?.value) || 5
        },
        phone: {
            contacts: phoneContacts,
            autoDialDelay: parseInt(document.getElementById('autoDialDelay')?.value) || 10
        }
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

// ----- Helper: add contact with photo (safe) -----
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
        // Clear fields
        document.getElementById(nameField).value = '';
        document.getElementById(phoneField).value = '';
        if (document.getElementById(photoField)) document.getElementById(photoField).value = '';
    };
    if (photoFile) {
        reader.readAsDataURL(photoFile);
    } else {
        // No photo – still add contact
        reader.onload({ target: { result: null } });
    }
}

// Inline add handlers
document.getElementById('addEmergencyInline')?.addEventListener('click', () => {
    addContact('emergency', 'emergencyName', 'emergencyPhone', 'emergencyPhoto');
});
document.getElementById('addPhoneInline')?.addEventListener('click', () => {
    addContact('phone', 'phoneName', 'phoneNumber', 'phonePhoto');
});

// Save & exit buttons
if (saveBtn) saveBtn.addEventListener('click', saveAllSettings);
if (exitBtn) exitBtn.addEventListener('click', () => window.location.href = 'index.html');

// Initialize
loadUI();