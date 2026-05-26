/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// js/core/settings.js

// Default settings for all modules
const DEFAULT_SETTINGS = {
    enabledModules: {
        gallery: true,
        bus: true,
        music: true,
        news: true,
        mastodon: true,
        calendar: {
            url: '',
            notificationMinutes: 30
        },
        radio: true,
        emergency: true,
        phone: true
    },
    gallery: { slideSpeed: 3000, autoStart: true },
    music: { volume: 70, shuffle: false },
    news: {
        rssUrl: 'https://www.thejournal.ie/feed/', // THE ACTUAL REAL NEWSPAPER SETTINGS
        refreshInterval: 15,
        maxArticles: 2          // only show 2 articles
    },
    mastodon: { instanceUrl: 'https://mastodon.ie', limit: 4 },
    bus: { routeIds: '30', stopIds: '330061,240161' },
    phone: { contacts: [], autoDialDelay: 10 },
    emergency: { contacts: [], checkInterval: 5 },
    chat: {
        rooms: [''],
        refreshInterval: 30,
        homeserver: 'https://matrix.org',
        accessToken: '',
        userId: ''
    }
};

export function loadSettings() {
    const saved = localStorage.getItem('pleie_settings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return mergeDeep(DEFAULT_SETTINGS, parsed);
        } catch(e) { console.error(e); }
    }
    return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings) {
    localStorage.setItem('pleie_settings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('settingsChanged', { detail: settings }));
}

function mergeDeep(target, source) {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key]) && key in target) {
                output[key] = mergeDeep(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        });
    }
    return output;
}

function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}