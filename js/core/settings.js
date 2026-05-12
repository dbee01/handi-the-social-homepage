// js/core/settings.js
export function loadSettings() {
    const saved = localStorage.getItem('pleie_settings');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch(e) { console.error(e); }
    }
    return { enabledModules: {} };
}

export function saveSettings(settings) {
    localStorage.setItem('pleie_settings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('settingsChanged', { detail: settings }));
}