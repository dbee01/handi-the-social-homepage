/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/news/news.module.js – paginated: 4 visible, scroll by 2
import { loadSettings } from "../../js/core/settings.js";

// International news feeds with country flags
const NEWS_FEEDS = [
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="10" height="20" fill="#169b62"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ff883e"/></svg>', name: "Ireland – The Journal", url: "https://www.thejournal.ie/feed/" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#012169"/><path d="M0 0l30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" stroke-width="2"/><line x1="15" y1="0" x2="15" y2="20" stroke="#fff" stroke-width="6"/><line x1="0" y1="10" x2="30" y2="10" stroke="#fff" stroke-width="6"/><line x1="15" y1="0" x2="15" y2="20" stroke="#c8102e" stroke-width="3"/><line x1="0" y1="10" x2="30" y2="10" stroke="#c8102e" stroke-width="3"/></svg>', name: "UK – BBC", url: "https://feeds.bbci.co.uk/news/rss.xml" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="10" height="20" fill="#002395"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ed2939"/></svg>', name: "France – Le Monde", url: "https://www.lemonde.fr/rss/une.xml" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="6.67" fill="#000"/><rect y="6.67" width="30" height="6.67" fill="#d00"/><rect y="13.34" width="30" height="6.66" fill="#fc0"/></svg>', name: "Deutschland – Spiegel", url: "https://www.spiegel.de/schlagzeilen/index.rss" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="5" fill="#c60b1e"/><rect y="5" width="30" height="10" fill="#ffc400"/><rect y="15" width="30" height="5" fill="#c60b1e"/></svg>', name: "España – El País", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ce2b37"/></svg>', name: "Italia – Corriere", url: "https://www.corriere.it/rss/homepage.xml" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="6.67" fill="#ae1c28"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.34" width="30" height="6.66" fill="#21468b"/></svg>', name: "Nederland – NOS", url: "https://feeds.nos.nl/nosnieuwsalgemeen" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#dc143c"/></svg>', name: "Polska – TVN24", url: "https://tvn24.pl/najnowsze.xml" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="12" height="20" fill="#006600"/><rect x="12" width="18" height="20" fill="#f00"/><circle cx="12" cy="10" r="4" fill="#fc0" stroke="#000" stroke-width=".5"/></svg>', name: "Portugal – Público", url: "https://feeds.feedburner.com/PublicoRSS" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="10" height="20" fill="#000"/><rect x="10" width="10" height="20" fill="#fae042"/><rect x="20" width="10" height="20" fill="#ed2939"/></svg>', name: "België – De Standaard", url: "https://www.standaard.be/binnenland/rss/" },
  { flag: '<svg viewBox="0 0 20 20" width="20" height="14"><rect width="20" height="20" fill="#d52b1e"/><line x1="7" y1="5" x2="13" y2="15" stroke="#fff" stroke-width="2.5"/><line x1="13" y1="5" x2="7" y2="15" stroke="#fff" stroke-width="2.5"/></svg>', name: "Schweiz – NZZ", url: "https://www.nzz.ch/recent.rss" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#006aa7"/><line x1="10" y1="0" x2="10" y2="20" stroke="#fecc00" stroke-width="4"/><line x1="0" y1="8" x2="30" y2="12" stroke="#fecc00" stroke-width="4"/></svg>', name: "Sverige – SVT", url: "https://www.svt.se/nyheter/rss.xml" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#ef2b2d"/><line x1="8" y1="0" x2="8" y2="20" stroke="#fff" stroke-width="4"/><line x1="0" y1="8" x2="30" y2="12" stroke="#fff" stroke-width="4"/><line x1="10" y1="0" x2="10" y2="20" stroke="#002868" stroke-width="2"/><line x1="0" y1="9" x2="30" y2="11" stroke="#002868" stroke-width="2"/></svg>', name: "Norge – NRK", url: "https://www.nrk.no/nyheter/siste.rss" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="1.54" fill="#b22234"/><rect y="1.54" width="30" height="1.54" fill="#fff"/><rect y="3.08" width="30" height="1.54" fill="#b22234"/><rect y="4.62" width="30" height="1.54" fill="#fff"/><rect y="6.15" width="30" height="1.54" fill="#b22234"/><rect y="7.69" width="30" height="1.54" fill="#fff"/><rect y="9.23" width="30" height="1.54" fill="#b22234"/><rect y="10.77" width="30" height="1.54" fill="#fff"/><rect y="12.31" width="30" height="1.54" fill="#b22234"/><rect y="13.85" width="30" height="1.54" fill="#fff"/><rect y="15.38" width="30" height="1.54" fill="#b22234"/><rect y="16.92" width="30" height="1.54" fill="#fff"/><rect y="18.46" width="30" height="1.54" fill="#b22234"/><rect width="10" height="10.77" fill="#3c3b6e"/></svg>', name: "USA – NPR", url: "https://feeds.npr.org/1001/rss.xml" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#f00"/><rect x="7.5" width="15" height="20" fill="#fff"/><path d="M15 3l1.5 4.5h5l-4 3 1.5 4.5-4-3-4 3 1.5-4.5-4-3h5z" fill="#f00"/></svg>', name: "Canada – CBC", url: "https://www.cbc.ca/webfeed/rss/rss-topstories" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#00008b"/><circle cx="15" cy="10" r="4" fill="#fff"/><circle cx="13" cy="9" r=".8" fill="#00008b"/><circle cx="17" cy="9" r=".8" fill="#00008b"/><circle cx="15" cy="11" r=".6" fill="#00008b"/></svg>', name: "Australia – ABC", url: "https://www.abc.net.au/news/feed/51120/rss.xml" },
  { flag: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#00008b"/><circle cx="15" cy="10" r="4" fill="#fff"/><circle cx="13" cy="9" r=".8" fill="#00008b"/><circle cx="17" cy="9" r=".8" fill="#00008b"/><circle cx="15" cy="11" r=".6" fill="#00008b"/></svg>', name: "New Zealand – RNZ", url: "https://www.rnz.co.nz/rss/national.xml" },
];

export default async function initNews(container) {
  const t =
    window.t ||
    function (k, e) {
      return e || k;
    };
  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.prepend(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  var modName =
    window.LANG && window.LANG.modules && window.LANG.modules.news
      ? window.LANG.modules.news.name
      : "NEWS";
  title.innerHTML = '<i class="fa-solid fa-newspaper"></i> ' + modName;
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "news-content";
  container.appendChild(content);

  const STORAGE_KEY = "handiNewsFeed";
  const settings = loadSettings();
  const refreshMinutes = settings.news?.refreshInterval || 15;
  const maxArticles = settings.news?.maxArticles || 16;
  let refreshIntervalId = null;
  let rssUrl = localStorage.getItem(STORAGE_KEY) || "";

  function saveFeed(url) {
    rssUrl = url;
    try {
      localStorage.setItem(STORAGE_KEY, url);
    } catch (e) {}
  }

  function renderFeedSelector() {
      content.innerHTML = `
        <div class="module-empty">
          <i class="fa-solid fa-newspaper"></i>
          <p>${t("d_configureNews", "Configure NEWS element")}</p>
        </div>
        <div class="news-feed-list" style="display:flex;flex-direction:column;gap:4px;margin-top:8px;max-height:300px;overflow-y:auto;">
          ${NEWS_FEEDS.map(function (f, i) {
            return `<div class="news-feed-item" data-idx="${i}" style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;border-radius:8px;border:1px solid #e5e7eb;">${f.flag}<span>${f.name}</span></div>`;
          }).join("")}
        </div>
      `;
      content.querySelectorAll(".news-feed-item").forEach(function (el) {
        el.addEventListener("click", function () {
          var idx = parseInt(el.getAttribute("data-idx"));
          if (idx >= 0 && NEWS_FEEDS[idx]) {
            saveFeed(NEWS_FEEDS[idx].url);
            fetchNews();
          }
        });
      });
    }

  function formatSourceName(url) {
    try {
      var hostname = new URL(url).hostname;
      return (
        hostname
          .replace(/^www\./, "")
          .split(".")[0]
          .replace(/^THE/i, "THE ")
          .toUpperCase() + " NEWS"
      );
    } catch (e) {
      return "NEWS";
    }
  }

  function extractImageFromEntry(entry, description) {
    description = description || "";
    // Try enclosure
    var enclosure = entry.querySelector('link[rel="enclosure"][type^="image"]');
    if (enclosure && enclosure.getAttribute("href"))
      return enclosure.getAttribute("href");
    // Try media:content (common RSS extension)
    var media = entry.querySelector("media\\:content, content");
    if (media && media.getAttribute("url")) return media.getAttribute("url");
    // Try media:thumbnail (BBC, Spiegel)
    var thumb = entry.querySelector("media\\:thumbnail, thumbnail");
    if (thumb && thumb.getAttribute("url")) return thumb.getAttribute("url");
    // Try any element with a url attribute that looks like an image
    var all = entry.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var u = all[i].getAttribute("url");
      if (u && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(u)) return u;
    }
    // Fallback: img tag in description
    var m = description.match(/<img[^>]+src="([^">]+)"/);
    return m ? m[1] : "";
  }

  async function fetchNews() {
    try {
      content.innerHTML =
        '<div class="news-loading"><i class="fa-solid fa-spinner fa-spin"></i> ' +
        t("d_loading", "Loading news...") +
        "</div>";
      var resp = await fetch("/api/news?url=" + encodeURIComponent(rssUrl));
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      var xmlText = await resp.text();
      var xmlDoc = new DOMParser().parseFromString(xmlText, "text/xml");
      if (xmlDoc.querySelector("parsererror")) throw new Error("Invalid XML");

      var channel, items, channelLink, channelTitle;
      var rssChannel = xmlDoc.querySelector("channel");
      var atomFeed = xmlDoc.querySelector("feed");

      if (rssChannel) {
        channel = rssChannel;
        channelLink =
          (channel.querySelector("link") &&
            channel.querySelector("link").textContent &&
            channel.querySelector("link").textContent.trim()) ||
          "#";
        channelTitle =
          (channel.querySelector("title") &&
            channel.querySelector("title").textContent &&
            channel.querySelector("title").textContent.trim()) ||
          "News";
        items = xmlDoc.querySelectorAll("item");
      } else if (atomFeed) {
        var selfLink = atomFeed.querySelector('link[rel="self"]');
        channelLink = selfLink ? selfLink.getAttribute("href") || "#" : "#";
        channelTitle =
          (atomFeed.querySelector("title") &&
            atomFeed.querySelector("title").textContent &&
            atomFeed.querySelector("title").textContent.trim()) ||
          "News";
        items = xmlDoc.querySelectorAll("entry");
      } else {
        throw new Error("Unknown feed format");
      }

      var articles = [];
      var limit = Math.min(items.length, maxArticles);
      for (var i = 0; i < limit; i++) {
        var item = items[i];
        var artTitle, link, pubDateRaw, description, imageUrl;

        if (rssChannel) {
          artTitle =
            (item.querySelector("title") &&
              item.querySelector("title").textContent &&
              item.querySelector("title").textContent.trim()) ||
            "No title";
          link =
            (item.querySelector("link") &&
              item.querySelector("link").textContent &&
              item.querySelector("link").textContent.trim()) ||
            "#";
          pubDateRaw =
            (item.querySelector("pubDate") &&
              item.querySelector("pubDate").textContent) ||
            "";
          description =
            (item.querySelector("description") &&
              item.querySelector("description").textContent) ||
            "";
          description = description.replace(/<[^>]*>/g, "");
          imageUrl = extractImageFromEntry(item, description);
        } else {
          artTitle =
            (item.querySelector("title") &&
              item.querySelector("title").textContent &&
              item.querySelector("title").textContent.trim()) ||
            "No title";
          var altLink = item.querySelector('link[rel="alternate"]');
          link = altLink
            ? altLink.getAttribute("href")
            : (item.querySelector("link") &&
                item.querySelector("link").getAttribute("href")) ||
              "#";
          pubDateRaw =
            (item.querySelector("published") &&
              item.querySelector("published").textContent) ||
            (item.querySelector("updated") &&
              item.querySelector("updated").textContent) ||
            "";
          description =
            (item.querySelector("summary") &&
              item.querySelector("summary").textContent &&
              item.querySelector("summary").textContent.trim()) ||
            (item.querySelector("content") &&
              item.querySelector("content").textContent &&
              item.querySelector("content").textContent.trim()) ||
            "";
          description = description.replace(/<[^>]*>/g, "");
          imageUrl = extractImageFromEntry(item, description);
        }

        var formattedDate = t("d_dateUnknown", "Date unknown");
        if (pubDateRaw) {
          var d = new Date(pubDateRaw);
          if (!isNaN(d.getTime())) {
            formattedDate = d.toLocaleString("en-IE", {
              timeZone: "Europe/Dublin",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          }
        }

        articles.push({
          title: artTitle,
          link: link,
          pubDate: formattedDate,
          excerpt: description.substring(0, 300),
          imageUrl: imageUrl,
          channelLink: channelLink,
        });
      }
      renderNews(articles, channelLink, channelTitle);
      window.logEvent(2, "news_load", { source: formatSourceName(rssUrl), articles: articles.length });
    } catch (err) {
      console.error("News fetch error:", err);
      window.logEvent(1, "news_error", { source: rssUrl, error: err.message });
      content.innerHTML = `
        <div class="module-empty">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>${t("d_tryAnother", "Could not load news. Try another source.")}</p>
          <button id="newsBackBtn" class="settings-link-btn">
            <i class="fa-solid fa-arrow-left"></i> ${t("d_chooseAnother", "Choose another source")}
          </button>
        </div>
      `;
      var backBtn = content.querySelector("#newsBackBtn");
      if (backBtn)
        backBtn.onclick = function () {
          saveFeed("");
          renderFeedSelector();
        };
    }
  }

  function renderNews(articles, channelLink, channelTitle) {
    if (!articles.length) {
      content.innerHTML =
        '<div class="module-empty">' +
        t("d_noData", "No news available.") +
        "</div>";
      return;
    }
    // Clear the loading indicator before rendering the fetched articles.
    content.innerHTML = "";
    var sourceDisplay = formatSourceName(channelLink);

    // Header bar with source name and change button
    var headerBar = document.createElement("div");
    headerBar.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;";
    headerBar.innerHTML =
      '<small style="opacity:0.7;">' +
      escapeHtml(sourceDisplay) +
      "</small>" +
      '<button id="newsChangeSource" style="background:none;border:none;cursor:pointer;font-size:0.85rem;opacity:0.6;color:inherit;" title="' +
      t("d_changeSource", "Change source") +
      '"><i class="fa-solid fa-rotate-right"></i> ' +
      t("d_changeSource", "Source") +
      "</button>";
    content.appendChild(headerBar);

    var changeBtn = content.querySelector("#newsChangeSource");
    if (changeBtn)
      changeBtn.onclick = function () {
        saveFeed("");
        renderFeedSelector();
      };

    // Single article viewer with left / right scrolling (same pattern as Mastodon)
    var currentIndex = 0;

    var carousel = document.createElement("div");
    carousel.style.cssText = "display:flex;align-items:center;gap:8px;width:100%;";

    var leftBtn = document.createElement("button");
    leftBtn.className = "news-carousel-btn";
    leftBtn.textContent = "‹";
    leftBtn.style.cssText =
      "flex-shrink:0;width:40px;height:40px;border-radius:50%;border:1px solid #cbd5e1;" +
      "background:#fff;cursor:pointer;font-size:1.4rem;line-height:1;color:#334155;";
    leftBtn.setAttribute("aria-label", t("d_scrollLeft", "Previous article"));

    var view = document.createElement("div");
    view.className = "news-post-view";
    view.style.cssText = "flex:1;min-width:0;";

    var rightBtn = document.createElement("button");
    rightBtn.className = "news-carousel-btn";
    rightBtn.textContent = "›";
    rightBtn.style.cssText = leftBtn.style.cssText;
    rightBtn.setAttribute("aria-label", t("d_scrollRight", "Next article"));

    carousel.appendChild(leftBtn);
    carousel.appendChild(view);
    carousel.appendChild(rightBtn);
    content.appendChild(carousel);

    function renderArticle() {
      var article = articles[currentIndex];
      if (!article) {
        view.innerHTML = "";
        return;
      }
      view.innerHTML = `
        <div class="news-article" style="margin-bottom:0;padding:16px;border-radius:12px;display:flex;flex-direction:column;gap:12px;">
          ${article.imageUrl
            ? '<img class="news-image" src="' + article.imageUrl + '" alt="" style="width:100%;height:var(--media-height);object-fit:contain;border-radius:8px;background:#f1f5f9;display:block;" onerror="this.style.display=\'none\'">'
            : '<div style="width:100%;height:var(--media-height);display:flex;align-items:center;justify-content:center;background:#f1f5f9;border-radius:8px;"><i class="fa-solid fa-newspaper" style="font-size:2rem;color:#94a3b8;"></i></div>'}
          <div style="display:flex;justify-content:space-between;">
            <div>${escapeHtml(sourceDisplay)}</div>
            <div>${escapeHtml(article.pubDate)}</div>
          </div>
          <h3 style="margin:0;line-height:1.25;"><a href="${article.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a></h3>
          <p style="margin:0;line-height:1.35;">${escapeHtml(article.excerpt)}</p>
        </div>
      `;
    }

    function go(dir) {
      if (!articles.length) return;
      currentIndex = (currentIndex + dir + articles.length) % articles.length;
      renderArticle();
    }

    leftBtn.addEventListener("click", function () {
      go(-1);
    });
    rightBtn.addEventListener("click", function () {
      go(1);
    });

    renderArticle();

    if (window.refreshDashboardLayout) window.refreshDashboardLayout();
  }

  function startRefresh() {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    fetchNews();
    refreshIntervalId = setInterval(fetchNews, refreshMinutes * 60 * 1000);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m];
    });
  }

  if (rssUrl) {
    startRefresh();
  } else {
    renderFeedSelector();
  }

  return function () {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
  };
}
