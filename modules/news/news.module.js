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
      name = name.replace(/^THE/i, "THE ").toUpperCase();
      return name + " NEWS";
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

    currentStart = 0;
    const sourceDisplay = formatSourceName(channelLink);

    content.innerHTML = `
      <div class="news-scroll-wrapper" style="display:flex;flex-direction:column;gap:8px;">
        <button id="newsScrollUp" class="news-scroll-btn">▲ Scroll Up</button>
        <div id="newsList" class="news-list"></div>
        <button id="newsScrollDown" class="news-scroll-btn">▼ Scroll Down</button>
      </div>
    `;

    const list = document.getElementById("newsList");
    if (!list) return;

    // Add all articles as DOM elements
    const articleEls = articles.map((article) => {
      const div = document.createElement("div");
      div.className = "news-article";
      div.innerHTML = `
        <div style="display:flex;gap:12px;margin-bottom:12px;">
          ${article.imageUrl ? `<img src="${article.imageUrl}" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:8px;" onerror="this.style.display='none'">` : '<div style="width:120px;height:auto;"></div>'}
          <div style="flex:1;">
            <div>${escapeHtml(sourceDisplay)}</div>
            <div>${escapeHtml(article.pubDate)}</div>
          </div>
        </div>
        <h3><a href="${article.link}" target="_blank">${escapeHtml(article.title)}</a></h3>
        <p>${escapeHtml(article.excerpt)}</p>
      `;
      list.appendChild(div);
      return div;
    });

    function updateVisibility() {
      articleEls.forEach((el, i) => {
        el.style.display =
          i >= currentStart && i < currentStart + VISIBLE ? "" : "none";
      });
      // Disable buttons at boundaries
      const upBtn = document.getElementById("newsScrollUp");
      const downBtn = document.getElementById("newsScrollDown");
      if (upBtn) upBtn.style.opacity = currentStart === 0 ? "0.7" : "1";
      if (downBtn)
        downBtn.style.opacity =
          currentStart + VISIBLE >= articleEls.length ? "0.7" : "1";
    }

    updateVisibility();

    document.getElementById("newsScrollUp").onclick = (e) => {
      e.preventDefault();
      if (currentStart > 0) {
        currentStart = Math.max(0, currentStart - STEP);
        updateVisibility();
      }
    };

    document.getElementById("newsScrollDown").onclick = (e) => {
      e.preventDefault();
      if (currentStart + VISIBLE < articleEls.length) {
        currentStart = Math.min(
          articleEls.length - VISIBLE,
          currentStart + STEP,
        );
        updateVisibility();
      }
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
