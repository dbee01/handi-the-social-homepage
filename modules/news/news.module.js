import { loadSettings } from '../../js/core/settings.js';

export default async function initNews(container) {
    const pinBtn = container.querySelector('.pin-btn');
    container.innerHTML = '';
    if (pinBtn) container.appendChild(pinBtn);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<i class="fa-solid fa-newspaper"></i> NEWS';
    container.appendChild(title);

    const content = document.createElement('div');
    content.style.cssText = 'padding: 10px; max-height: 400px; overflow-y: auto;';
    container.appendChild(content);

    content.innerHTML = '<div style="text-align:center; color:#888;">Loading news...</div>';

    try {
        // ✅ USE THE FULL URL TO YOUR NODE BACKEND
        const response = await fetch('http://localhost:3001/api/news');
        if (!response.ok) throw new Error('Failed to fetch');
        const xmlText = await response.text();

        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        const items = xml.querySelectorAll('item');
        const settings = loadSettings();
        const max = settings.news?.maxArticles || 10;

        if (items.length === 0) throw new Error('No items');

        let html = '';
        for (let i = 0; i < Math.min(items.length, max); i++) {
            const item = items[i];
            const itemTitle = item.querySelector('title')?.textContent || 'Untitled';
            const link = item.querySelector('link')?.textContent || '#';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            html += `
                <div style="border-bottom:1px solid #333; padding:12px 0;">
                    <a href="${link}" target="_blank" style="text-decoration:none; font-weight:bold;">${escapeHtml(itemTitle)}</a>
                    <div style="font-size:0.7rem; margin-top:4px;">${pubDate.substring(0,16)}</div>
                </div>
            `;
        }
        content.innerHTML = html;
    } catch (err) {
        console.error(err);
        content.innerHTML = '<div style="color:#f33; text-align:center;">Failed to load news. Make sure your Node server is running on port 3001 with /api/news endpoint.</div>';
    }

    function escapeHtml(str) {
        return str.replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));
    }
}