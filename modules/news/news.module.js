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
    content.className = 'news-content';
    container.appendChild(content);

    content.innerHTML = `
        <div class="news-scroll-wrapper">
            <button id="news-up" class="news-scroll-btn">▲</button>
            <div id="news-list" class="news-list">
                <div class="news-loading">Loading news...</div>
            </div>
            <button id="news-down" class="news-scroll-btn">▼</button>
        </div>
    `;

    const list = content.querySelector('#news-list');
    const up = content.querySelector('#news-up');
    const down = content.querySelector('#news-down');

    up.addEventListener('click', () => list.scrollBy({ top: -280, behavior: 'smooth' }));
    down.addEventListener('click', () => list.scrollBy({ top: 280, behavior: 'smooth' }));

    try {
        // Get RSS URL from settings
        const settings = loadSettings();
        const rssUrl = settings.news?.rssUrl || 'https://www.rte.ie/feeds/rss/?index=/news';

        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();

        if (!data.items || data.items.length === 0) throw new Error('No items');

        const maxArticles = Number.isFinite(parseInt(settings.news?.maxArticles, 10)) && parseInt(settings.news?.maxArticles, 10) > 0 ? parseInt(settings.news?.maxArticles, 10) : 4;

        let html = '';
        for (let i = 0; i < Math.min(data.items.length, maxArticles); i++) {
            const item = data.items[i];
            const itemTitle = item.title || 'Untitled';
            const link = item.link || '#';
            const pubDate = item.pubDate || '';
            html += `
                <div class="news-article">
                    <a href="${link}" target="_blank">${escapeHtml(itemTitle)}</a>
                    <div class="news-date">${pubDate.substring(0, 16)}</div>
                </div>
            `;
        }
        list.innerHTML = html;
        if (window.refreshDashboardLayout) window.refreshDashboardLayout();
    } catch (err) {
        console.error(err);
        list.innerHTML = '<div class="news-error">Failed to load news. Check RSS URL in Settings.</div>';
        if (window.refreshDashboardLayout) window.refreshDashboardLayout();
    }

    function escapeHtml(str) {
        return str.replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));
    }
}
