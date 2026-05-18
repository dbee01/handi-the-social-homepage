/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */
// modules/news/news.module.js – shows cleaned channel name (e.g., "RTE NEWS")
export default async function initNews(container) {
    const pinBtn = container.querySelector('.pin-btn');
    container.innerHTML = '';
    if (pinBtn) container.prepend(pinBtn);

    const titleDiv = document.createElement('div');
    titleDiv.className = 'panel-title';
    titleDiv.innerHTML = '<i class="fa-solid fa-newspaper"></i> NEWS';
    container.appendChild(titleDiv);

    const content = document.createElement('div');
    content.className = 'news-content';
    container.appendChild(content);

    const rssUrl = 'https://www.rte.ie/feeds/rss/?index=/news/';
    const refreshMinutes = 15;
    let refreshIntervalId = null;

    // Helper: convert channel URL to a clean source name
    function formatSourceName(url) {
        try {
            const hostname = new URL(url).hostname;
            // Remove 'www.' prefix, then extract the main part before the first dot
            let name = hostname.replace(/^www\./, '').split('.')[0];
            // Uppercase and add " NEWS"
            return name.toUpperCase() + ' NEWS';
        } catch (e) {
            return 'NEWS';
        }
    }

    async function fetchNews() {
        try {
            content.innerHTML = '<div class="news-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading news...</div>';
            const response = await fetch(`/api/news?url=${encodeURIComponent(rssUrl)}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) throw new Error('Invalid XML');

            const channel = xmlDoc.querySelector('channel');
            const channelLink = channel?.querySelector('link')?.textContent?.trim() || '#';

            const items = xmlDoc.querySelectorAll('item');
            const articles = [];
            for (let i = 0; i < Math.min(items.length, 2); i++) {
                const item = items[i];
                const articleTitle = item.querySelector('title')?.textContent?.trim() || 'No title';
                const articleLink = item.querySelector('link')?.textContent?.trim() || '#';
                const pubDateRaw = item.querySelector('pubDate')?.textContent || '';
                const description = item.querySelector('description')?.textContent || '';

                let formattedDate = '';
                if (pubDateRaw) {
                    const dateObj = new Date(pubDateRaw);
                    formattedDate = dateObj.toLocaleString('en-IE', {
                        timeZone: 'Europe/Dublin',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } else {
                    formattedDate = 'Date unknown';
                }

                let imageUrl = '';
                const mediaContent = item.querySelector('media\\:content, content');
                if (mediaContent && mediaContent.getAttribute('url')) {
                    imageUrl = mediaContent.getAttribute('url');
                }
                if (!imageUrl && description) {
                    const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
                    if (imgMatch) imageUrl = imgMatch[1];
                }

                const fullExcerpt = description.replace(/<[^>]*>/g, '').trim();

                articles.push({
                    title: articleTitle,
                    link: articleLink,
                    pubDate: formattedDate,
                    excerpt: fullExcerpt,
                    imageUrl,
                    channelLink
                });
            }
            renderNews(articles, channelLink);
        } catch (err) {
            console.error('News fetch error:', err);
            content.innerHTML = '<div class="module-error">Failed to load news.</div>';
        }
    }

    function renderNews(articles, channelLink) {
        if (!articles.length) {
            content.innerHTML = '<div class="module-empty">No news available.</div>';
            return;
        }

        content.innerHTML = `
            <div class="news-scroll-wrapper">
                <button id="newsScrollUp" class="news-scroll-btn">▲</button>
                <div id="newsList" class="news-list"></div>
                <button id="newsScrollDown" class="news-scroll-btn">▼</button>
            </div>
        `;
        const list = document.getElementById('newsList');
        const up = document.getElementById('newsScrollUp');
        const down = document.getElementById('newsScrollDown');

        // Use the same formatted source name for all articles (same channel)
        const sourceDisplay = formatSourceName(channelLink);

        for (const article of articles) {
            const articleDiv = document.createElement('div');
            articleDiv.className = 'news-article';
            articleDiv.innerHTML = `
                <div class="news-header">
                    ${article.imageUrl ? `<img class="news-image" src="${article.imageUrl}" alt="" onerror="this.style.display='none'">` : '<div class="news-image-placeholder"></div>'}
                    <div class="news-meta">
                        <span class="news-source"><a href="${escapeHtml(channelLink)}" target="_blank" rel="noopener">${escapeHtml(sourceDisplay)}</a></span>
                        <span class="news-date">${escapeHtml(article.pubDate)}</span>
                    </div>
                </div>
                <h3 class="news-title"><a href="${article.link}" target="_blank" rel="noopener">${escapeHtml(article.title)}</a></h3>
                <p class="news-excerpt">${escapeHtml(article.excerpt)}</p>
            `;
            list.appendChild(articleDiv);
        }

        up.addEventListener('click', () => list.scrollBy({ top: -280, behavior: 'smooth' }));
        down.addEventListener('click', () => list.scrollBy({ top: 280, behavior: 'smooth' }));
        if (window.refreshDashboardLayout) window.refreshDashboardLayout();
    }

    function startRefresh() {
        if (refreshIntervalId) clearInterval(refreshIntervalId);
        fetchNews();
        refreshIntervalId = setInterval(fetchNews, refreshMinutes * 60 * 1000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
    }

    startRefresh();
    return () => {
        if (refreshIntervalId) clearInterval(refreshIntervalId);
    };
}