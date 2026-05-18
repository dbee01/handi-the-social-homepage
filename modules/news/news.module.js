// modules/news/news.module.js – supports RSS and Atom feeds
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

    // Default to Irish Examiner (Atom) – works out of the box
    const rssUrl = 'https://www.irishexaminer.com/feed/35-top_news.xml';
    const refreshMinutes = 15;
    let refreshIntervalId = null;

    function formatSourceName(url) {
        try {
            const hostname = new URL(url).hostname;
            let name = hostname.replace(/^www\./, '').split('.')[0];
            return name.toUpperCase() + ' NEWS';
        } catch (e) {
            return 'NEWS';
        }
    }

    // Extract image from various possible tags
    function extractImageFromEntry(entry, description = '') {
        // Check for <link rel="enclosure" type="image/jpeg">
        const enclosureLink = entry.querySelector('link[rel="enclosure"][type^="image"]');
        if (enclosureLink && enclosureLink.getAttribute('href')) {
            return enclosureLink.getAttribute('href');
        }
        // Check for <media:content>
        const mediaContent = entry.querySelector('media\\:content, content');
        if (mediaContent && mediaContent.getAttribute('url')) {
            return mediaContent.getAttribute('url');
        }
        // Try to find an <img> inside description/summary
        if (description) {
            const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) return imgMatch[1];
        }
        return '';
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

            // Determine feed type
            let channel, items, channelLink, channelTitle;
            const rssChannel = xmlDoc.querySelector('channel');
            const atomFeed = xmlDoc.querySelector('feed');

            if (rssChannel) {
                // RSS 2.0
                channel = rssChannel;
                channelLink = channel.querySelector('link')?.textContent?.trim() || '#';
                channelTitle = channel.querySelector('title')?.textContent?.trim() || 'News';
                items = xmlDoc.querySelectorAll('item');
            } else if (atomFeed) {
                // Atom 1.0
                channelLink = atomFeed.querySelector('link[rel="self"]')?.getAttribute('href') || '#';
                channelTitle = atomFeed.querySelector('title')?.textContent?.trim() || 'News';
                items = xmlDoc.querySelectorAll('entry');
            } else {
                throw new Error('Unknown feed format');
            }

            const articles = [];
            for (let i = 0; i < Math.min(items.length, 2); i++) {
                const item = items[i];
                let title, link, pubDateRaw, description, imageUrl;

                if (rssChannel) {
                    // RSS parsing
                    title = item.querySelector('title')?.textContent?.trim() || 'No title';
                    link = item.querySelector('link')?.textContent?.trim() || '#';
                    pubDateRaw = item.querySelector('pubDate')?.textContent || '';
                    description = item.querySelector('description')?.textContent || '';
                    imageUrl = extractImageFromEntry(item, description);
                } else {
                    // Atom parsing
                    title = item.querySelector('title')?.textContent?.trim() || 'No title';
                    const linkElem = item.querySelector('link[rel="alternate"]');
                    link = linkElem ? linkElem.getAttribute('href') : (item.querySelector('link')?.getAttribute('href') || '#');
                    pubDateRaw = item.querySelector('published')?.textContent || item.querySelector('updated')?.textContent || '';
                    description = item.querySelector('summary')?.textContent?.trim() || item.querySelector('content')?.textContent?.trim() || '';
                    // Remove HTML tags for excerpt
                    const textDesc = description.replace(/<[^>]*>/g, '');
                    description = textDesc;
                    imageUrl = extractImageFromEntry(item, description);
                }

                // Format date
                let formattedDate = '';
                if (pubDateRaw) {
                    const dateObj = new Date(pubDateRaw);
                    if (!isNaN(dateObj.getTime())) {
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
                } else {
                    formattedDate = 'Date unknown';
                }

                // Full excerpt (strip HTML already done for Atom)
                const fullExcerpt = description.substring(0, 300); // limit to avoid huge text

                articles.push({
                    title,
                    link,
                    pubDate: formattedDate,
                    excerpt: fullExcerpt,
                    imageUrl,
                    channelLink
                });
            }
            renderNews(articles, channelLink, channelTitle);
        } catch (err) {
            console.error('News fetch error:', err);
            content.innerHTML = '<div class="module-error">Failed to load news.</div>';
        }
    }

    function renderNews(articles, channelLink, channelTitle) {
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