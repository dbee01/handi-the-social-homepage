/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/channel/channel.module.js
// CHANNEL — reads an Atom/RSS feed and shows its entries as a horizontal card
// scroller (image, title, snippet, date) with a link back to the source, plus
// left/right scroll buttons. Cloned from the newsletter module and
// parameterised by channel id so Channel 1–4 share one implementation.
//
// Each channel reads its feed URL from Settings under its own key
// (settings.channel1.feedUrl … settings.channel4.feedUrl).
import { loadSettings, normalizeFeedUrl } from "../../js/core/settings.js";

const MEDIA_NS = "http://search.yahoo.com/mrss/";
const YT_NS = "http://www.youtube.com/xml/schemas/2015";

function textOf(el, tag) {
  const nodes = el.getElementsByTagName(tag);
  return nodes.length ? (nodes[0].textContent || "").trim() : "";
}

function sourceNameOf(item) {
  const sources = item.getElementsByTagName("source");
  if (!sources.length) return "";
  return (
    (sources[0].textContent || "").trim() ||
    (sources[0].getAttribute("url") || "").trim()
  );
}

function imageOf(item) {
  // media:thumbnail is the real image in YouTube Atom feeds (and rss.app).
  const thumbs = item.getElementsByTagNameNS(MEDIA_NS, "thumbnail");
  if (thumbs.length) {
    const u = thumbs[0].getAttribute("url");
    if (u) return u;
  }
  // media:content only when it is actually an image (not the flash player URL).
  const media = item.getElementsByTagNameNS(MEDIA_NS, "content");
  for (let i = 0; i < media.length; i++) {
    const medium = (media[i].getAttribute("medium") || "").toLowerCase();
    const type = (media[i].getAttribute("type") || "").toLowerCase();
    if (medium === "image" || type.indexOf("image/") === 0) {
      const u = media[i].getAttribute("url");
      if (u) return u;
    }
  }
  // enclosure with an image type.
  const enclosures = item.getElementsByTagName("enclosure");
  for (let i = 0; i < enclosures.length; i++) {
    if ((enclosures[i].getAttribute("type") || "").toLowerCase().indexOf("image/") === 0) {
      const u = enclosures[i].getAttribute("url");
      if (u) return u;
    }
  }
  return "";
}

// Resolve a playable video URL for a feed entry (YouTube embed, video
// enclosure/media, or a YouTube watch link). Returns "" when none is found.
function videoOf(item) {
  // 1. <iframe> embed inside the description (rss.app video feeds put the
  //    YouTube embed here, e.g. <iframe src="https://www.youtube.com/embed/...">).
  const desc = textOf(item, "description");
  if (desc) {
    const doc = new DOMParser().parseFromString(desc, "text/html");
    const iframe = doc.querySelector("iframe[src]");
    if (iframe) {
      const src = (iframe.getAttribute("src") || "").trim();
      if (src) return src;
    }
  }
  // 2. YouTube Atom playlist feed: <yt:videoId>.
  const ytIds = item.getElementsByTagNameNS(YT_NS, "videoId");
  if (ytIds.length) {
    const id = (ytIds[0].textContent || "").trim();
    if (id) return "https://www.youtube.com/embed/" + id;
  }
  // 3. media:content / enclosure with a video type.
  const media = item.getElementsByTagNameNS(MEDIA_NS, "content");
  for (let i = 0; i < media.length; i++) {
    if ((media[i].getAttribute("medium") || "").toLowerCase() === "video") {
      const u = media[i].getAttribute("url");
      if (u) return u;
    }
  }
  const enclosures = item.getElementsByTagName("enclosure");
  for (let i = 0; i < enclosures.length; i++) {
    if ((enclosures[i].getAttribute("type") || "").toLowerCase().indexOf("video") === 0) {
      const u = enclosures[i].getAttribute("url");
      if (u) return u;
    }
  }
  // 4. YouTube watch / youtu.be link → embed URL (also reads the <link> href).
  const linkEl = item.querySelector('link[href]');
  const link =
    textOf(item, "link") || (linkEl ? linkEl.getAttribute("href") : "");
  if (link) {
    const watch = link.match(/youtube\.com\/watch\?v=([\w-]+)/);
    if (watch) return "https://www.youtube.com/embed/" + watch[1];
    const short = link.match(/youtu\.be\/([\w-]+)/);
    if (short) return "https://www.youtube.com/embed/" + short[1];
  }
  return "";
}

// Entry description: RSS <description>, Atom <summary>/<content>, or YouTube's
// <media:group><media:description>.
function descriptionOf(item) {
  const direct =
    textOf(item, "description") ||
    textOf(item, "summary") ||
    textOf(item, "content");
  if (direct) return direct;
  const md = item.getElementsByTagNameNS(MEDIA_NS, "description");
  if (md.length) return md[0].textContent || "";
  return "";
}

// Author: prefer the nested <author><name> (YouTube/Atom), fall back to the
// author element's whole text.
function authorOf(item) {
  const authors = item.getElementsByTagName("author");
  if (authors.length) {
    const names = authors[0].getElementsByTagName("name");
    if (names.length) return (names[0].textContent || "").trim();
    return (authors[0].textContent || "").trim();
  }
  return "";
}

// Channel-level thumbnail (RSS <image><url>) for the feed info card.
function channelImageOf(channel) {
  const img = channel.querySelector("image > url");
  return img ? (img.textContent || "").trim() : "";
}

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function cleanDescription(html) {
  var s = String(html || "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<head[\s\S]*?<\/head>/gi, " ");
  return stripHtml(s);
}

function decodeEntities(str) {
  if (!str) return "";
  const d = document.createElement("div");
  d.innerHTML = str;
  return (d.textContent || d.innerText || "").trim();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m],
  );
}

function formatDate(raw) {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Atom feeds use <entry> instead of <item>; accept both.
function parseFeed(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  if (doc.querySelector("parsererror")) {
    return { info: null, items: [], valid: false };
  }
  const channel = doc.querySelector("channel") || doc.querySelector("feed");
  const hasItems =
    doc.getElementsByTagName("item").length > 0 ||
    doc.getElementsByTagName("entry").length > 0;
  // No <channel>/<feed> and no items — the response isn't a feed document
  // (e.g. the URL returned an HTML page instead of XML).
  if (!channel && !hasItems) {
    return { info: null, items: [], valid: false };
  }
  const info = channel
    ? {
        title: decodeEntities(textOf(channel, "title")),
        link: textOf(channel, "link"),
        description: decodeEntities(
          cleanDescription(textOf(channel, "description") || textOf(channel, "subtitle")),
        ),
        image: channelImageOf(channel),
      }
    : null;

  const itemEls = doc.getElementsByTagName("item");
  const entryEls = doc.getElementsByTagName("entry");
  const els = itemEls.length ? itemEls : entryEls;

  const out = [];
  for (let i = 0; i < els.length; i++) {
    const item = els[i];
    const title = textOf(item, "title");
    const link =
      textOf(item, "link") ||
      (() => {
        const l = item.querySelector(
          'link[rel="alternate"][href], link[href]',
        );
        return l ? (l.getAttribute("href") || "").trim() : "";
      })();
    if (!title && !link) continue;
    out.push({
      title: decodeEntities(title),
      link,
      description: decodeEntities(cleanDescription(descriptionOf(item))),
      image: imageOf(item),
      video: videoOf(item),
      source: decodeEntities(sourceNameOf(item)),
      pubDate: formatDate(textOf(item, "pubDate") || textOf(item, "published") || textOf(item, "updated")),
      author: decodeEntities(authorOf(item)),
    });
  }
  return { info: info, items: out, valid: true };
}

async function fetchFeed(url) {
  const resp = await fetch("/api/feed?url=" + encodeURIComponent(url));
  if (!resp.ok) return { info: null, items: [], valid: false };
  const text = await resp.text();
  return parseFeed(text);
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

// Factory: build an init function for a specific channel module id.
export function makeChannelModule(channelId, fallbackName, icon) {
  return async function initChannel(container) {
    const t =
      window.t ||
      function (k, e) {
        return e || k;
      };

    const pinBtn = container.querySelector(".pin-btn");
    container.innerHTML = "";
    if (pinBtn) container.appendChild(pinBtn);

    const title = document.createElement("div");
    title.className = "panel-title";
    const name =
      window.LANG && window.LANG.modules && window.LANG.modules[channelId]
        ? window.LANG.modules[channelId].name
        : fallbackName;
    title.innerHTML = '<i class="' + icon + '"></i> ' + escapeHtml(name);
    container.appendChild(title);

    const content = document.createElement("div");
    content.className = "channel-content";
    content.style.cssText = "display:flex;flex-direction:column;gap:10px;width:100%;";
    container.appendChild(content);

    const parentItem = container.closest(".dashboard-item");
    if (parentItem) parentItem.dataset.module = channelId;

    let feedUrl = "";
    try {
      const s = loadSettings();
      feedUrl = normalizeFeedUrl(
        (s[channelId] && s[channelId].feedUrl) || "",
      );
    } catch (e) {}

    if (!feedUrl) {
      content.innerHTML =
        '<div class="module-empty">' +
        '<i class="' + icon + '"></i><p>' +
        t("d_channelConfigure", "Add an Atom/RSS feed URL in Settings.") +
        "</p>" +
        '<button class="settings-link-btn">' +
        '<i class="' + icon + '"></i> ' +
        t("d_channelLoad", "Load Channel") +
        "</button></div>";
      const settingsBtn = content.querySelector(".settings-link-btn");
      if (settingsBtn)
        settingsBtn.onclick = function () {
          window.location.href = "settings.html?args=" + channelId;
        };
      return function () {};
    }

    content.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:20px;color:#64748b;">' +
      '<i class="fa-solid fa-spinner fa-spin"></i> ' +
      t("d_loading", "Loading...") +
      "</div>";

    let feedInfo = null;
    let items = [];
    let valid = true;
    try {
      const parsed = await fetchFeed(feedUrl);
      feedInfo = parsed.info;
      items = parsed.items;
      valid = parsed.valid !== false;
    } catch (err) {
      console.error(channelId + " feed error:", err);
      items = [];
      valid = false;
    }
    content.innerHTML = "";

    if (!items.length) {
      const msg = valid
        ? t("d_channelEmpty", "No items found.")
        : t(
            "d_channelInvalid",
            "Could not load this feed. Check the URL is a valid Atom/RSS feed.",
          );
      content.innerHTML =
        '<div class="module-empty"><i class="' + icon + '"></i><p>' +
        msg +
        "</p></div>";
      return function () {};
    }

    // Source bar: host · full screen · change source.
    const sourceBar = document.createElement("div");
    sourceBar.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;";
    sourceBar.innerHTML =
      '<small style="opacity:0.7;">' +
      escapeHtml(hostnameOf(feedUrl)) +
      "</small>" +
      '<div style="display:flex;align-items:center;gap:12px;">' +
      '<button class="channel-fullscreen-btn" style="background:none;border:none;cursor:pointer;font-size:0.85rem;opacity:0.7;color:inherit;" title="' +
      t("d_fullScreen", "Full Screen") +
      '"><i class="fa-solid fa-expand"></i> ' +
      t("d_fullScreen", "Full Screen") +
      "</button>" +
      '<button class="channel-source-btn" style="background:none;border:none;cursor:pointer;font-size:0.85rem;opacity:0.6;color:inherit;" title="' +
      t("d_changeSource", "Change source") +
      '"><i class="fa-solid fa-rotate-right"></i> ' +
      t("d_changeSource", "Source") +
      "</button>" +
      "</div>";
    sourceBar.querySelector(".channel-source-btn").onclick = function () {
      window.location.href = "settings.html?args=" + channelId;
    };

    // Full-screen toggle: expands the whole channel element over the page and
    // clicking again reduces it back to its original dashboard slot.
    const fullscreenBtn = sourceBar.querySelector(".channel-fullscreen-btn");
    let isFullscreen = false;
    function setFullscreen(on) {
      if (!parentItem) return;
      isFullscreen = on;
      if (on) {
        parentItem.dataset.channelPrevStyle =
          parentItem.getAttribute("style") || "";
        parentItem.style.cssText =
          "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:100000;" +
          "background:var(--bg,#ffffff);overflow:auto;padding:16px;box-sizing:border-box;" +
          "margin:0;max-width:100vw;";
      } else {
        parentItem.style.cssText = parentItem.dataset.channelPrevStyle || "";
        delete parentItem.dataset.channelPrevStyle;
      }
      if (fullscreenBtn) {
        fullscreenBtn.innerHTML = isFullscreen
          ? '<i class="fa-solid fa-compress"></i> ' + t("d_reduce", "Reduce")
          : '<i class="fa-solid fa-expand"></i> ' + t("d_fullScreen", "Full Screen");
      }
    }
    if (fullscreenBtn)
      fullscreenBtn.onclick = function () {
        setFullscreen(!isFullscreen);
      };

    content.appendChild(sourceBar);

    // Feed info card.
    if (feedInfo && (feedInfo.title || feedInfo.image || feedInfo.link)) {
      const infoCard = document.createElement("div");
      infoCard.className = "channel-info";
      infoCard.style.cssText =
        "display:flex;gap:12px;align-items:flex-start;margin:0 0 10px;padding:16px;border-radius:10px;" +
        "border:1px solid color-mix(in srgb, var(--topbar-accent, #0047cc) 25%, transparent);" +
        "background:color-mix(in srgb, var(--topbar-accent, #0047cc) 5%, transparent);";
      let infoHtml = "";
      if (feedInfo.image)
        infoHtml +=
          '<img src="' +
          escapeHtml(feedInfo.image) +
          '" alt="" loading="lazy" style="width:88px;height:88px;border-radius:8px;object-fit:cover;flex-shrink:0;" onerror="this.style.display=\'none\'"/>';
      infoHtml += '<div style="min-width:0;flex:1;">';
      if (feedInfo.title)
        infoHtml +=
          '<div style="font-weight:700;font-size:1.05rem;line-height:1.3;">' +
          escapeHtml(feedInfo.title) +
          "</div>";
      const desc = feedInfo.description || "";
      const descDuplicatesTitle =
        !!feedInfo.title &&
        desc.toLowerCase() === String(feedInfo.title).toLowerCase();
      if (desc && !descDuplicatesTitle)
        infoHtml +=
          '<div style="font-size:0.9rem;line-height:1.4;opacity:0.85;margin-top:6px;">' +
          escapeHtml(desc.length > 180 ? desc.slice(0, 180).replace(/\s+\S*$/, "") + "…" : desc) +
          "</div>";
      if (feedInfo.link)
        infoHtml +=
          '<a href="' +
          escapeHtml(feedInfo.link) +
          '" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-size:0.9rem;font-weight:700;">' +
          t("d_website", "Website") +
          " ↗</a>";
      infoHtml += "</div>";
      infoCard.innerHTML = infoHtml;
      content.appendChild(infoCard);
    }

    // Full-screen lightbox for playing a video (instead of navigating away).
    function openVideoLightbox(videoUrl) {
      const existing = document.getElementById("channel-video-lightbox");
      if (existing) existing.remove();

      const overlay = document.createElement("div");
      overlay.id = "channel-video-lightbox";
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.92);" +
        "display:flex;align-items:center;justify-content:center;padding:24px;";

      const box = document.createElement("div");
      box.style.cssText =
        "position:relative;width:min(100%,1280px);aspect-ratio:16/9;max-height:90vh;";

      const iframe = document.createElement("iframe");
      iframe.src =
        videoUrl + (videoUrl.indexOf("?") === -1 ? "?autoplay=1" : "&autoplay=1");
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true;
      iframe.style.cssText = "width:100%;height:100%;border:0;background:#000;";
      box.appendChild(iframe);

      const close = document.createElement("button");
      close.innerHTML = "&times;";
      close.setAttribute("aria-label", t("d_close", "Close"));
      close.style.cssText =
        "position:absolute;top:16px;right:16px;width:44px;height:44px;border:none;" +
        "border-radius:50%;background:rgba(255,255,255,0.18);color:#fff;" +
        "font-size:1.7rem;line-height:1;cursor:pointer;z-index:2;";

      overlay.appendChild(box);
      overlay.appendChild(close);
      document.body.appendChild(overlay);

      function onKey(e) {
        if (e.key === "Escape") closeFn();
      }
      function closeFn() {
        overlay.remove();
        document.removeEventListener("keydown", onKey);
      }
      close.addEventListener("click", closeFn);
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeFn();
      });
      document.addEventListener("keydown", onKey);
    }

    function makeCard(item) {
      const card = document.createElement("div");
      card.className = "channel-card";
      card.style.cssText =
        "flex:0 0 100%;display:flex;flex-direction:column;border-radius:12px;" +
        "overflow:hidden;border:1px solid #e5e7eb;background:transparent;" +
        "color:inherit;scroll-snap-align:start;padding:16px;text-align:center;";

      if (item.video) {
        // Video entry: show the thumbnail with a play button. Clicking it
        // opens a full-screen lightbox player. The wrapper enforces the
        // video's natural 16:9 aspect ratio.
        const wrap = document.createElement("div");
        wrap.style.cssText =
          "position:relative;cursor:pointer;width:100%;aspect-ratio:16/9;height:auto;" +
          "border-radius:8px;overflow:hidden;background:#000;";
        const thumb = document.createElement("img");
        thumb.src = item.image || "";
        thumb.loading = "lazy";
        thumb.style.cssText =
          "width:100%;height:100%;object-fit:cover;display:block;";
        wrap.appendChild(thumb);
        const play = document.createElement("div");
        play.innerHTML = '<i class="fa-solid fa-play"></i>';
        play.style.cssText =
          "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
          "font-size:2.2rem;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.6);" +
          "background:rgba(0,0,0,.25);";
        wrap.appendChild(play);
        wrap.addEventListener("click", function () {
          openVideoLightbox(item.video);
        });
        card.appendChild(wrap);
      } else if (item.image) {
        const img = document.createElement("img");
        img.src = item.image;
        img.loading = "lazy";
        img.style.cssText =
          "width:100%;height:var(--media-height);object-fit:contain;display:block;border-radius:8px;";
        card.appendChild(img);
      }

      const body = document.createElement("div");
      body.style.cssText =
        "padding:0;display:flex;flex-direction:column;gap:12px;flex:1;";

      if (item.source || item.pubDate) {
        const metaTop = document.createElement("div");
        metaTop.style.cssText = "display:flex;justify-content:center;gap:12px;";
        const org = document.createElement("div");
        org.textContent = item.source || "";
        const date = document.createElement("div");
        date.textContent = item.pubDate || "";
        metaTop.appendChild(org);
        metaTop.appendChild(date);
        body.appendChild(metaTop);
      }

      if (item.title) {
        const h = document.createElement("h3");
        h.style.cssText =
          "margin:0;padding-top:4px;font-size:var(--font-size);font-weight:700;line-height:1.25;";
        if (item.video) {
          // Video: the title plays directly in the lightbox — no source page.
          h.textContent = item.title;
          h.style.cursor = "pointer";
          h.addEventListener("click", function () {
            openVideoLightbox(item.video);
          });
        } else if (item.link) {
          const a = document.createElement("a");
          a.href = item.link;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = item.title;
          h.appendChild(a);
        } else {
          h.textContent = item.title;
        }
        body.appendChild(h);
      }

      if (item.description) {
        const d = document.createElement("p");
        d.style.cssText =
          "margin:0;font-size:var(--font-size);color:rgb(71, 85, 100);line-height:1.35;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;font-weight:normal;";
        d.textContent = item.description;
        body.appendChild(d);
      }

      if (item.author && item.author !== item.source) {
        const a = document.createElement("div");
        a.style.cssText =
          "font-size:var(--font-size);color:#94a3b8;margin-top:auto;padding-top:4px;";
        a.textContent = item.author;
        body.appendChild(a);
      }

      card.appendChild(body);
      return card;
    }

    function scrollByCards(dir) {
      const amount = (scroller.clientWidth || 320) * 0.8;
      scroller.scrollBy({ left: dir * amount, behavior: "smooth" });
    }

    const toolbar = document.createElement("div");
    toolbar.style.cssText =
      "display:flex;align-items:center;gap:8px;width:100%;position:relative;";

    const leftBtn = document.createElement("button");
    leftBtn.className = "channel-scroll-btn";
    leftBtn.setAttribute("aria-label", t("d_scrollLeft", "Scroll left"));
    leftBtn.textContent = "‹";
    leftBtn.style.cssText =
      "flex-shrink:0;width:40px;height:40px;border-radius:50%;border:1px solid #cbd5e1;" +
      "background:#fff;cursor:pointer;font-size:1.4rem;line-height:1;color:#334155;";
    leftBtn.addEventListener("click", function () {
      scrollByCards(-1);
    });

    const scroller = document.createElement("div");
    scroller.className = "channel-scroller";
    scroller.style.cssText =
      "flex:1;display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;" +
      "padding:4px 2px;scrollbar-width:thin;margin:0 46px;";
    // Present every item in the feed, ordered bottom-to-top (the last feed
    // entries come first in the scroller).
    items
      .slice()
      .reverse()
      .forEach(function (item) {
        scroller.appendChild(makeCard(item));
      });

    const rightBtn = document.createElement("button");
    rightBtn.className = "channel-scroll-btn";
    rightBtn.setAttribute("aria-label", t("d_scrollRight", "Scroll right"));
    rightBtn.textContent = "›";
    rightBtn.style.cssText = leftBtn.style.cssText;
    rightBtn.addEventListener("click", function () {
      scrollByCards(1);
    });

    toolbar.appendChild(leftBtn);
    toolbar.appendChild(scroller);
    toolbar.appendChild(rightBtn);
    content.appendChild(toolbar);

    return function () {};
  };
}
