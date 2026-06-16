// modules/news/news.module.js – paginated: 4 visible, scroll by 2
import { loadSettings } from "../../js/core/settings.js";

export default async function initNews(container) {
  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.prepend(pinBtn);

  const titleDiv = document.createElement("div");
  titleDiv.className = "panel-title";
  titleDiv.innerHTML = '<i class="fa-solid fa-newspaper"></i> NEWS';
  container.appendChild(titleDiv);

  const content = document.createElement("div");
  content.className = "news-content";
  container.appendChild(content);

  const settings = loadSettings();
  const rssUrl =
    settings.news?.rssUrl ||
    "https://www.irishexaminer.com/feed/35-top_news.xml";
  const refreshMinutes = settings.news?.refreshInterval || 15;
  const maxArticles = settings.news?.maxArticles || 16;
  const VISIBLE = 4;
  const STEP = 2;
  let currentStart = 0;

  let refreshIntervalId = null;

  function formatSourceName(url) {
    try {
      const hostname = new URL(url).hostname;
      let name = hostname.replace(/^www\./, "").split(".")[0];
      return name.toUpperCase() + " NEWS";
    } catch (e) {
      return "NEWS";
    }
  }

  function extractImageFromEntry(entry, description = "") {
    const enclosureLink = entry.querySelector(
      'link[rel="enclosure"][type^="image"]',
    );
    if (enclosureLink && enclosureLink.getAttribute("href")) {
      return enclosureLink.getAttribute("href");
    }
    const mediaContent = entry.querySelector("media\\:content, content");
    if (mediaContent && mediaContent.getAttribute("url")) {
      return mediaContent.getAttribute("url");
    }
    if (description) {
      const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch) return imgMatch[1];
    }
    return "";
  }

  async function fetchNews() {
    try {
      content.innerHTML =
        '<div class="news-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading news...</div>';
      const response = await fetch(
        `/api/news?url=${encodeURIComponent(rssUrl)}`,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const parseError = xmlDoc.querySelector("parsererror");
      if (parseError) throw new Error("Invalid XML");

      let channel, items, channelLink, channelTitle;
      const rssChannel = xmlDoc.querySelector("channel");
      const atomFeed = xmlDoc.querySelector("feed");

      if (rssChannel) {
        channel = rssChannel;
        channelLink = channel.querySelector("link")?.textContent?.trim() || "#";
        channelTitle =
          channel.querySelector("title")?.textContent?.trim() || "News";
        items = xmlDoc.querySelectorAll("item");
      } else if (atomFeed) {
        channelLink =
          atomFeed.querySelector('link[rel="self"]')?.getAttribute("href") ||
          "#";
        channelTitle =
          atomFeed.querySelector("title")?.textContent?.trim() || "News";
        items = xmlDoc.querySelectorAll("entry");
      } else {
        throw new Error("Unknown feed format");
      }

      const articles = [];
      const articleLimit = Math.min(items.length, maxArticles);
      for (let i = 0; i < articleLimit; i++) {
        const item = items[i];
        let title, link, pubDateRaw, description, imageUrl;

        if (rssChannel) {
          title =
            item.querySelector("title")?.textContent?.trim() || "No title";
          link = item.querySelector("link")?.textContent?.trim() || "#";
          pubDateRaw = item.querySelector("pubDate")?.textContent || "";
          description = item.querySelector("description")?.textContent || "";
          imageUrl = extractImageFromEntry(item, description);
        } else {
          title =
            item.querySelector("title")?.textContent?.trim() || "No title";
          const linkElem = item.querySelector('link[rel="alternate"]');
          link = linkElem
            ? linkElem.getAttribute("href")
            : item.querySelector("link")?.getAttribute("href") || "#";
          pubDateRaw =
            item.querySelector("published")?.textContent ||
            item.querySelector("updated")?.textContent ||
            "";
          description =
            item.querySelector("summary")?.textContent?.trim() ||
            item.querySelector("content")?.textContent?.trim() ||
            "";
          const textDesc = description.replace(/<[^>]*>/g, "");
          description = textDesc;
          imageUrl = extractImageFromEntry(item, description);
        }

        let formattedDate = "";
        if (pubDateRaw) {
          const dateObj = new Date(pubDateRaw);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toLocaleString("en-IE", {
              timeZone: "Europe/Dublin",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          } else {
            formattedDate = "Date unknown";
          }
        } else {
          formattedDate = "Date unknown";
        }

        const fullExcerpt = description.substring(0, 300);
        articles.push({
          title,
          link,
          pubDate: formattedDate,
          excerpt: fullExcerpt,
          imageUrl,
          channelLink,
        });
      }
      renderNews(articles, channelLink, channelTitle);
    } catch (err) {
      console.error("News fetch error:", err);
      content.innerHTML =
        '<div class="module-error">Failed to load news.</div>';
    }
  }

  function renderNews(articles, channelLink, channelTitle) {
    if (!articles.length) {
      content.innerHTML = '<div class="module-empty">No news available.</div>';
      return;
    }

    // Build the UI with inline styles for guaranteed behavior
    content.innerHTML = `
            <div class="news-scroll-wrapper" style="display: flex; flex-direction: column; gap: 8px;">
                <button id="newsScrollUp" class="news-scroll-btn" style="width: 100%; padding: 12px; background: #e2e8f0; border: none; border-radius: 12px; cursor: pointer; font-size: 1rem; font-weight: bold;">▲ Scroll Up</button>
                <div id="newsList" class="news-list" style="overflow-y: auto; scroll-behavior: smooth; padding: 4px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff;"></div>
                <button id="newsScrollDown" class="news-scroll-btn" style="width: 100%; padding: 12px; background: #e2e8f0; border: none; border-radius: 12px; cursor: pointer; font-size: 1rem; font-weight: bold;">▼ Scroll Down</button>
            </div>
        `;

    const list = document.getElementById("newsList");
    const up = document.getElementById("newsScrollUp");
    const down = document.getElementById("newsScrollDown");
    const sourceDisplay = formatSourceName(channelLink);

    if (!list) return;

    // Add all articles
    for (const article of articles) {
      const articleDiv = document.createElement("div");
      articleDiv.className = "news-article";
      articleDiv.style.marginBottom = "16px";
      articleDiv.style.padding = "16px";
      articleDiv.style.background = "#ffffff";
      articleDiv.style.border = "1px solid #e2e8f0";
      articleDiv.style.borderRadius = "12px";
      articleDiv.innerHTML = `
                <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                    ${article.imageUrl ? `<img src="${article.imageUrl}" alt="" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'">` : '<div style="width: 60px; height: 60px; background: #e2e8f0; border-radius: 8px;"></div>'}
                    <div style="flex: 1;">
                        <div style="font-weight: 700; color: #0047cc;">${escapeHtml(sourceDisplay)}</div>
                        <div style="font-size: 0.75rem; color: #64748b;">${escapeHtml(article.pubDate)}</div>
                    </div>
                </div>
                <h3 style="font-size: 1rem; margin: 8px 0;"><a href="${article.link}" target="_blank" style="color: #1e1e1e; text-decoration: none;">${escapeHtml(article.title)}</a></h3>
                <p style="color: #475569; font-size: 0.85rem; margin: 0;">${escapeHtml(article.excerpt)}</p>
            `;
      list.appendChild(articleDiv);
    }

    // Function to set height to exactly fit 2 articles
    function setExactHeight() {
      const articleElements = list.querySelectorAll(".news-article");
      if (articleElements.length >= 2) {
        // Get the bottom position of the 2nd article
        const secondArticle = articleElements[1];
        const heightNeeded =
          secondArticle.offsetTop + secondArticle.offsetHeight + 20;
        list.style.maxHeight = `${heightNeeded}px`;
        console.log(`Set height to ${heightNeeded}px for 2 articles`);
      } else if (articleElements.length === 1) {
        list.style.maxHeight = `${articleElements[0].offsetHeight + 30}px`;
      } else {
        list.style.maxHeight = "300px";
      }
    }

    // Wait for images to load, then set height
    const images = list.querySelectorAll("img");
    if (images.length === 0) {
      setTimeout(setExactHeight, 50);
    } else {
      let loadedCount = 0;
      images.forEach((img) => {
        if (img.complete) {
          loadedCount++;
        } else {
          img.addEventListener("load", () => {
            loadedCount++;
            if (loadedCount === images.length) setExactHeight();
          });
          img.addEventListener("error", () => {
            loadedCount++;
            if (loadedCount === images.length) setExactHeight();
          });
        }
      });
      setTimeout(setExactHeight, 1000);
    }

    // Also observe size changes (window resize, font loading)
    const resizeObserver = new ResizeObserver(() => setExactHeight());
    resizeObserver.observe(list);

    // Calculate scroll amount (height of one article + margin)
    const firstArticle = list.querySelector(".news-article");
    const scrollAmount = firstArticle ? firstArticle.offsetHeight + 16 : 350;

    // Scroll up (shows previous articles)
    up.onclick = (e) => {
      e.preventDefault();
      list.scrollBy({ top: -scrollAmount, behavior: "smooth" });
    };

    // Scroll down (shows next articles)
    down.onclick = (e) => {
      e.preventDefault();
      list.scrollBy({ top: scrollAmount, behavior: "smooth" });
    };

    if (window.refreshDashboardLayout) window.refreshDashboardLayout();
  }

  function startRefresh() {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    fetchNews();
    refreshIntervalId = setInterval(fetchNews, refreshMinutes * 60 * 1000);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(
      /[&<>]/g,
      (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
    );
  }

  startRefresh();
  return () => {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
  };
}
