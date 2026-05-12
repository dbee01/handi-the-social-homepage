// modules/mastodon/mastodon.module.js
import { loadSettings } from '../../js/core/settings.js';

export default async function initMastodon(container) {
    const pinBtn = container.querySelector('.pin-btn');
    container.innerHTML = '';
    if (pinBtn) container.appendChild(pinBtn);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-brands fa-mastodon"></i> MASTODON';
    container.appendChild(title);

    const content = document.createElement('div');
    content.style.cssText = 'padding: 10px; min-height: 380px; overflow-y: auto;';
    container.appendChild(content);

    // Ensure the parent dashboard item has enough height
    const parentItem = container.closest('.dashboard-item');
    if (parentItem) parentItem.style.minHeight = '450px';

    const settings = loadSettings();
    const instance = settings.mastodon?.instance || 'https://mastodon.ie';
    const limit = settings.mastodon?.limit || 5;

    content.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading trending...</div>';

    // Helper to force Packery to relayout after content changes
    function refreshPackery() {
        if (window.packeryInstance) {
            setTimeout(() => {
                window.packeryInstance.reloadItems();
                window.packeryInstance.layout();
            }, 50);
        }
    }

    try {
        const url = `${instance}/api/v1/trends/links?limit=${limit}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();

        if (!data.length) {
            content.innerHTML = '<div style="text-align:center; color:#888;">No trending links</div>';
            refreshPackery();
            return;
        }

        let html = '';
        for (const item of data) {
            const titleText = item.title || 'Untitled';
            const urlLink = item.url || '#';
            const description = item.description || '';
            const provider = item.provider_name || '';
            const image = item.image || '';
            html += `
                <div style="border-bottom:1px solid #333; padding:12px 0; display:flex; gap:12px;">
                    ${image ? `<img src="${image}" style="width:80px; height:60px; object-fit:cover; border-radius:6px;">` : ''}
                    <div style="flex:1;">
                        <a href="${urlLink}" target="_blank" style="color:#00ffff; text-decoration:none; font-weight:bold;">${escapeHtml(titleText)}</a>
                        <div style="font-size:0.75rem; color:#888;">${escapeHtml(provider)}</div>
                        <div style="font-size:0.8rem; margin-top:4px;">${escapeHtml(description.substring(0, 120))}...</div>
                    </div>
                </div>
            `;
        }
        content.innerHTML = html;

        // Ensure images trigger a layout when they load
        const images = content.querySelectorAll('img');
        images.forEach(img => {
            if (!img.complete) {
                img.addEventListener('load', refreshPackery);
            }
        });
        refreshPackery();
    } catch (err) {
        console.error(err);
        content.innerHTML = `<div style="color:#f33; text-align:center;">Failed to load Mastodon. Check instance URL in Settings.</div>`;
        refreshPackery();
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));
    }
}