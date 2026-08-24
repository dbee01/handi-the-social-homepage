/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/flip/flip.module.js
// FILTER & DISPLAY: read a Flipboard profile or topic RSS feed and show its
// "flips" (image, title, description) with a link back to the source, plus
// left/right scroll buttons.
import { loadSettings } from "../../js/core/settings.js";

const MEDIA_NS = "http://search.yahoo.com/mrss/";

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
  const media = item.getElementsByTagNameNS(MEDIA_NS, "content");
  if (media.length) {
    const u = media[0].getAttribute("url");
    if (u) return u;
  }
  // Fallback: any media:thumbnail or enclosure-like image url.
  const thumbs = item.getElementsByTagNameNS(MEDIA_NS, "thumbnail");
  if (thumbs.length) {
    const u = thumbs[0].getAttribute("url");
    if (u) return u;
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

// Resolve HTML entities (e.g. &#225; -> á) left over after tag stripping.
// Idempotent: safe to apply to textContent-derived strings too.
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

function parseFlipFeed(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  if (doc.querySelector("parsererror")) return { info: null, items: [] };
  const channel = doc.querySelector("channel");
  const info = channel
    ? {
        title: decodeEntities(textOf(channel, "title")),
        link: textOf(channel, "link"),
        description: decodeEntities(stripHtml(textOf(channel, "description"))),
        image: channelImageOf(channel),
      }
    : null;
  const items = doc.getElementsByTagName("item");
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const title = textOf(item, "title");
    const link = textOf(item, "link");
    if (!title && !link) continue;
    out.push({
      title: decodeEntities(title),
      link,
      description: decodeEntities(stripHtml(textOf(item, "description"))),
      image: imageOf(item),
      source: decodeEntities(sourceNameOf(item)),
      pubDate: formatDate(textOf(item, "pubDate")),
      author: decodeEntities(textOf(item, "author")),
    });
  }
  return { info: info, items: out };
}

async function fetchFlipFeed(url) {
  const resp = await fetch("/api/feed?url=" + encodeURIComponent(url));
  if (!resp.ok) return { info: null, items: [] };
  const text = await resp.text();
  return parseFlipFeed(text);
}

// Strip nested "topic from URL" wraps and any duplicated trailing feed suffix,
// e.g. /topic/https://flipboard.com/topic/europeanfootball.rss.rss
//      -> https://flipboard.com/topic/europeanfootball.rss
function tidyFlipboardUrl(url) {
  while (/^https?:\/\/flipboard\.com\/topic\/https?:\/\//i.test(url)) {
    url = url.replace(/^https?:\/\/flipboard\.com\/topic\//i, "");
  }
  return url.replace(/(\.rss)+$/i, ".rss");
}

// Accepts a full URL, "#topic"/"'topic'" (topic), or "@user"/"'user'" (user)
// and normalises it to a Flipboard RSS URL.
function normalizeFlip(value, type) {
  value = (value || "").trim();
  if (!value) return "";

  // Full Flipboard URL, with or without a scheme.
  if (/^(https?:\/\/)?flipboard\.com\//i.test(value)) {
    if (!/^https?:\/\//i.test(value)) value = "https://" + value;
    return tidyFlipboardUrl(value);
  }
  // Any other full URL.
  if (/^https?:\/\//i.test(value)) return value;

  // Strip surrounding single quotes: 'topic' -> topic
  if (value.length >= 2 && value[0] === "'" && value[value.length - 1] === "'") {
    value = value.slice(1, -1).trim();
  }
  // Strip a leading # (topic) or @ (user).
  if (value[0] === "#" || value[0] === "@") value = value.slice(1).trim();
  if (!value) return "";

  const base =
    type === "topic"
      ? "https://flipboard.com/topic/"
      : "https://flipboard.com/@";
  return tidyFlipboardUrl(base + encodeURIComponent(value) + ".rss");
}

// Feed URL -> label for the source bar: @profile or #topic, e.g.
// https://flipboard.com/@armisticemiss.rss -> @armisticemiss
function flipLabelOf(url) {
  try {
    const u = new URL(url);
    const segs = u.pathname.split("/").filter(Boolean);
    const last = (segs[segs.length - 1] || "").replace(/\.rss$/i, "");
    if (!last) return u.hostname.replace(/^www\./, "");
    const cleaned0 = last.replace(/^[@#]/, "");
    let cleaned = cleaned0;
    try {
      cleaned = decodeURIComponent(cleaned0);
    } catch (e) {}
    return segs[0] === "topic" ? "#" + cleaned : "@" + cleaned;
  } catch (e) {
    return "";
  }
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

export default async function initFlip(container) {
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
    window.LANG && window.LANG.modules && window.LANG.modules.flip
      ? window.LANG.modules.flip.name
      : "Flip";
  title.innerHTML = '<i class="fa-solid fa-right-left"></i> ' + name;
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "flip-content";
  content.style.cssText = "display:flex;flex-direction:column;gap:10px;width:100%;";
  container.appendChild(content);

  const parentItem = container.closest(".dashboard-item");
  if (parentItem) parentItem.dataset.module = "flip";

  let profileUrl = "";
  let topicUrl = "";
  try {
    const s = loadSettings();
    profileUrl = normalizeFlip((s.flip && s.flip.profileUrl) || "", "user");
    topicUrl = normalizeFlip((s.flip && s.flip.topicUrl) || "", "topic");
  } catch (e) {}

  const feedUrl = profileUrl || topicUrl;

  if (!feedUrl) {
    content.innerHTML =
      '<div class="module-empty"><i class="fa-solid fa-right-left"></i><p>' +
      t("d_flipConfigure", "Add a Flipboard profile or topic URL in Settings.") +
      "</p></div>";
    return function () {};
  }

  content.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:20px;color:#64748b;">' +
    '<i class="fa-solid fa-spinner fa-spin"></i> ' +
    t("d_loading", "Loading...") +
    "</div>";

  let feedInfo = null;
  let items = [];
  try {
    const parsed = await fetchFlipFeed(feedUrl);
    feedInfo = parsed.info;
    items = parsed.items;
  } catch (err) {
    console.error("Flip feed error:", err);
    items = [];
  }
  content.innerHTML = "";

  if (!items.length) {
    content.innerHTML =
      '<div class="module-empty"><i class="fa-solid fa-right-left"></i><p>' +
      t("d_flipEmpty", "No flips found.") +
      "</p></div>";
    return function () {};
  }

  // Mastodon-style source bar: website · profile/topic + change source.
  const sourceBar = document.createElement("div");
  sourceBar.style.cssText =
    "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;";
  sourceBar.innerHTML =
    '<small style="opacity:0.7;">' +
    escapeHtml(hostnameOf(feedUrl)) +
    " · " +
    escapeHtml(flipLabelOf(feedUrl)) +
    "</small>" +
    '<button id="flipChangeSource" style="background:none;border:none;cursor:pointer;font-size:0.85rem;opacity:0.6;color:inherit;" title="' +
    t("d_changeSource", "Change source") +
    '"><i class="fa-solid fa-rotate-right"></i> ' +
    t("d_changeSource", "Source") +
    "</button>";
  const flipChangeBtn = sourceBar.querySelector("#flipChangeSource");
  if (flipChangeBtn)
    flipChangeBtn.onclick = function () {
      window.location.href = "settings.html?args=flip";
    };
  content.appendChild(sourceBar);

  // Cast-style feed info card (thumbnail, title, description, more link).
  if (feedInfo && (feedInfo.title || feedInfo.image || feedInfo.link)) {
    const infoCard = document.createElement("div");
    infoCard.className = "flip-info";
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
    if (desc)
      infoHtml +=
        '<div style="font-size:0.9rem;line-height:1.4;opacity:0.85;margin-top:6px;"><span id="flipInfoDesc">' +
        escapeHtml(
          desc.length > 180
            ? desc.slice(0, 180).replace(/\s+\S*$/, "") + "…"
            : desc,
        ) +
        "</span>" +
        (desc.length > 180
          ? ' <a href="#" id="flipInfoDescMore" style="font-weight:700;white-space:nowrap;">' +
            t("d_more", "More") +
            "</a>"
          : "") +
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
    const descEl = infoCard.querySelector("#flipInfoDesc");
    const moreEl = infoCard.querySelector("#flipInfoDescMore");
    if (descEl && moreEl) {
      const preview =
        desc.length > 180 ? desc.slice(0, 180).replace(/\s+\S*$/, "") + "…" : desc;
      const clamped =
        desc.length > 500 ? desc.slice(0, 500).replace(/\s+\S*$/, "") + "…" : desc;
      const moreText = t("d_more", "More");
      const lessText = t("d_less", "Less");
      moreEl.addEventListener("click", function (e) {
        e.preventDefault();
        if (moreEl.textContent === lessText) {
          descEl.textContent = preview;
          moreEl.textContent = moreText;
        } else {
          descEl.textContent = clamped;
          moreEl.textContent = lessText;
        }
      });
    }
    content.appendChild(infoCard);
  }

  function makeCard(item) {
    const card = document.createElement("div");
    card.className = "flip-card";
    card.style.cssText =
      "flex:0 0 100%;display:flex;flex-direction:column;border-radius:12px;" +
      "overflow:hidden;border:1px solid #e5e7eb;background:transparent;" +
      "color:inherit;scroll-snap-align:start;padding:16px;text-align:center;";

    if (item.image) {
      const img = document.createElement("img");
      img.src = item.image;
      img.loading = "lazy";
      img.style.cssText =
        "width:100%;height:var(--media-height);object-fit:contain;display:block;background:#f1f5f9;border-radius:8px;";
      card.appendChild(img);
    }

    const body = document.createElement("div");
    body.style.cssText =
      "padding:0;display:flex;flex-direction:column;gap:12px;flex:1;";

    // Source + date row, same layout as the news element
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
      if (item.link) {
        const a = document.createElement("a");
        a.className = "flip-card-link";
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

    // Author line (source and date are already shown in the row above)
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
  toolbar.style.cssText = "display:flex;align-items:center;gap:8px;width:100%;";

  const leftBtn = document.createElement("button");
  leftBtn.className = "flip-scroll-btn";
  leftBtn.setAttribute("aria-label", t("d_scrollLeft", "Scroll left"));
  leftBtn.textContent = "‹";
  leftBtn.style.cssText =
    "flex-shrink:0;width:40px;height:40px;border-radius:50%;border:1px solid #cbd5e1;" +
    "background:#fff;cursor:pointer;font-size:1.4rem;line-height:1;color:#334155;";
  leftBtn.addEventListener("click", function () {
    scrollByCards(-1);
  });

  const scroller = document.createElement("div");
  scroller.className = "flip-scroller";
  scroller.style.cssText =
    "flex:1;display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;" +
    "padding:4px 2px;scrollbar-width:thin;";
  items.forEach(function (item) {
    scroller.appendChild(makeCard(item));
  });

  const rightBtn = document.createElement("button");
  rightBtn.className = "flip-scroll-btn";
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
}
