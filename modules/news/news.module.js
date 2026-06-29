// modules/news/news.module.js – paginated: 4 visible, scroll by 2
import { loadSettings } from "../../js/core/settings.js";

// International news feeds with country flags
const NEWS_FEEDS = [
  { flag: '🇮🇪', name: 'Ireland – RTÉ',       url: 'https://www.rte.ie/feeds/rss/news.xml' },
  { flag: '🇬🇧', name: 'UK – BBC',             url: 'https://feeds.bbci.co.uk/news/rss.xml' },
  { flag: '🇫🇷', name: 'France – Le Monde',    url: 'https://www.lemonde.fr/rss/une.xml' },
  { flag: '🇩🇪', name: 'Deutschland – Spiegel', url: 'https://www.spiegel.de/schlagzeilen/index.rss' },
  { flag: '🇪🇸', name: 'España – El País',     url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada' },
  { flag: '🇮🇹', name: 'Italia – Corriere',     url: 'https://www.corriere.it/rss/homepage.xml' },
  { flag: '🇳🇱', name: 'Nederland – NOS',       url: 'https://feeds.nos.nl/nosnieuwsalgemeen' },
  { flag: '🇵🇱', name: 'Polska – TVN24',         url: 'https://tvn24.pl/najnowsze.xml' },
  { flag: '🇵🇹', name: 'Portugal – Público',    url: 'https://feeds.feedburner.com/PublicoRSS' },
  { flag: '🇧🇪', name: 'België – De Standaard', url: 'https://www.standaard.be/rss/section/1f2838d4-99ea-49f0-9102-138784c7ea7c' },
  { flag: '🇨🇭', name: 'Schweiz – NZZ',          url: 'https://www.nzz.ch/recent.rss' },
  { flag: '🇸🇪', name: 'Sverige – SVT',          url: 'https://www.svt.se/nyheter/rss.xml' },
  { flag: '🇳🇴', name: 'Norge – NRK',            url: 'https://www.nrk.no/nyheter/siste.rss' },
  { flag: '🇺🇸', name: 'USA – NPR',              url: 'https://feeds.npr.org/1001/rss.xml' },
  { flag: '🇨🇦', name: 'Canada – CBC',            url: 'https://www.cbc.ca/webfeed/rss/rss-topstories' },
  { flag: '🇦🇺', name: 'Australia – ABC',         url: 'https://www.abc.net.au/news/feed/51120/rss.xml' },
  { flag: '🇳🇿', name: 'New Zealand – RNZ',       url: 'https://www.rnz.co.nz/rss/national.xml' },
];

export default async function initNews(container) {
  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.prepend(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  var name =
    window.LANG && window.LANG.modules && window.LANG.modules.news
      ? window.LANG.modules.news.name
      : "NEWS";
  title.innerHTML = '<i class="fa-solid fa-newspaper"></i> ' + name;
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "news-content";
  container.appendChild(content);

  const STORAGE_KEY = "handiNewsFeed";
  const settings = loadSettings();
  const refreshMinutes = settings.news?.refreshInterval || 15;
  const maxArticles = settings.news?.maxArticles || 16;
  const VISIBLE = 4;
  const STEP = 2;
  let currentStart = 0;
  let refreshIntervalId = null;
  let rssUrl = "";

  // Check settings first, then localStorage, then show selector
  if (settings.news?.rssUrl) {
    rssUrl = settings.news.rssUrl;
  } else {
    try {
      rssUrl = localStorage.getItem(STORAGE_KEY) || "";
    } catch (e) {}
  }

  function saveFeed(url) {
    rssUrl = url;
    try {
      localStorage.setItem(STORAGE_KEY, url);
    } catch (e) {}
  }

  function renderFeedSelector() {
    var name =
      window.LANG && window.LANG.modules && window.LANG.modules.news
        ? window.LANG.modules.news.name
        : "NEWS";
    content.innerHTML = `
      <div class="module-empty">
        <i class="fa-solid fa-newspaper"></i>
        <p>Configure ${name} element</p>
        <div style="margin-top:12px;">
          <select id="newsFeedSelect" style="padding:8px 12px;border-radius:8px;border:2px solid #cbd5e1;font-size:1rem;max-width:100%;">
            <option value="">— Select a news source —</option>
            ${NEWS_FEEDS.map((f, i) => `<option value="${i}">${f.flag} ${f.name}</option>`).join("")}
          </select>
        </div>
      </div>
    `;
    var sel = content.querySelector("#newsFeedSelect");
    if (sel) {
      sel.addEventListener("change", function () {
        var idx = parseInt(this.value);
        if (idx >= 0 && NEWS_FEEDS[idx]) {
          saveFeed(NEWS_FEEDS[idx].url);
          fetchNews();
        }
      });
    }
  }

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
      // Show selector + error so user can try another feed
      var name =
        window.LANG && window.LANG.modules && window.LANG.modules.news
          ? window.LANG.modules.news.name
          : "NEWS";
      content.innerHTML = `
        <div class="module-empty">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>Could not load news. Try another source.</p>
          <button id="newsBackBtn" class="settings-link-btn">
            <i class="fa-solid fa-arrow-left"></i> Choose another source
          </button>
        </div>
      `;
      var backBtn = content.querySelector("#newsBackBtn");
      if (backBtn) {
        backBtn.onclick = function () {
          saveFeed("");
          renderFeedSelector();
        };
      }
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
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <small style="opacity:0.7;">${escapeHtml(sourceDisplay)}</small>
          <button id="newsChangeSource" style="background:none;border:none;cursor:pointer;font-size:0.85rem;opacity:0.6;" title="Change source">🔄 Source</button>
        </div>
        <button id="newsScrollUp" class="news-scroll-btn">▲ Scroll Up</button>
        <div id="newsList" class="news-list"></div>
        <button id="newsScrollDown" class="news-scroll-btn">▼ Scroll Down</button>
      </div>
    `;

    var changeBtn = content.querySelector("#newsChangeSource");
    if (changeBtn) {
      changeBtn.onclick = function () {
        saveFeed("");
        renderFeedSelector();
      };
    }

    const list = document.getElementById("newsList");
    if (!list) return;

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

  if (rssUrl) {
    startRefresh();
  } else {
    renderFeedSelector();
  }

  return () => {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
  };
}
