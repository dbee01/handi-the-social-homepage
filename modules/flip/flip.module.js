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

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
  if (doc.querySelector("parsererror")) return [];
  const items = doc.getElementsByTagName("item");
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const title = textOf(item, "title");
    const link = textOf(item, "link");
    if (!title && !link) continue;
    out.push({
      title,
      link,
      description: stripHtml(textOf(item, "description")),
      image: imageOf(item),
      source: sourceNameOf(item),
      pubDate: formatDate(textOf(item, "pubDate")),
      author: textOf(item, "author"),
    });
  }
  return out;
}

async function fetchFlipFeed(url) {
  const resp = await fetch("/api/feed?url=" + encodeURIComponent(url));
  if (!resp.ok) return [];
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

  let items = [];
  try {
    items = await fetchFlipFeed(feedUrl);
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

  function makeCard(item) {
    const card = document.createElement("a");
    card.className = "flip-card";
    card.style.cssText =
      "flex:0 0 100%;display:flex;flex-direction:column;border-radius:12px;" +
      "overflow:hidden;border:1px solid #e5e7eb;background:#fff;text-decoration:none;" +
      "color:inherit;scroll-snap-align:start;padding:16px;";
    if (item.link) {
      card.href = item.link;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
    }

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
      metaTop.style.cssText = "display:flex;justify-content:space-between;";
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
      h.textContent = item.title;
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
