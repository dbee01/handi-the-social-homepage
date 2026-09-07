/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/gallery/gallery.module.js
// FILTER & DISPLAY: prefer a Pixelfed Atom feed (if reachable), otherwise show
// locally loaded images. Displays one image with its caption at a time, with
// left / right scrolling (same pattern as the Mastodon module).
import { loadGallery, saveGallery } from "../../js/core/storage.js";
import { loadSettings } from "../../js/core/settings.js";

const ATOM_NS = "http://www.w3.org/2005/Atom";
const MEDIA_NS = "http://search.yahoo.com/mrss/";

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}

function firstTextNS(el, ns, tag) {
  const nodes = el.getElementsByTagNameNS(ns, tag);
  return nodes.length ? (nodes[0].textContent || "").trim() : "";
}

function authorNameOf(entry) {
  const authors = entry.getElementsByTagNameNS(ATOM_NS, "author");
  if (!authors.length) return "";
  return firstTextNS(authors[0], ATOM_NS, "name");
}

function linkOf(entry) {
  const links = entry.getElementsByTagNameNS(ATOM_NS, "link");
  for (let i = 0; i < links.length; i++) {
    const rel = links[i].getAttribute("rel") || "alternate";
    if (rel === "alternate") {
      const href = links[i].getAttribute("href");
      if (href) return href;
    }
  }
  return firstTextNS(entry, ATOM_NS, "id");
}

// Feed-level alternate link (direct child of <feed>), used for the info card.
function feedLinkOf(doc) {
  const links = doc.getElementsByTagNameNS(ATOM_NS, "link");
  for (let i = 0; i < links.length; i++) {
    if (links[i].parentNode !== doc.documentElement) continue;
    const rel = links[i].getAttribute("rel") || "alternate";
    if (rel === "alternate") {
      const href = links[i].getAttribute("href");
      if (href) return href;
    }
  }
  return "";
}

function imageOf(entry) {
  const media = entry.getElementsByTagNameNS(MEDIA_NS, "content");
  if (media.length) {
    const u = media[0].getAttribute("url");
    if (u) return u;
  }
  const content = firstTextNS(entry, ATOM_NS, "content");
  const m = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : "";
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

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(
    /[&<>]/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
  );
}

function truncate(str, max) {
  if (!str) return "";
  str = String(str);
  return str.length > max ? str.substring(0, max) + "…" : str;
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

// Pixelfed feed URL -> @username (e.g. https://pixelfed.social/users/dansup.atom
// -> @dansup).
function accountOfFeedUrl(url) {
  try {
    var segs = new URL(url).pathname.split("/").filter(Boolean);
    var last = (segs[segs.length - 1] || "").replace(/\.atom$/i, "");
    return last ? "@" + decodeURIComponent(last) : "";
  } catch (e) {
    return "";
  }
}

async function fetchPixelfedFeed(url) {
  const resp = await fetch("/api/feed?url=" + encodeURIComponent(url));
  if (!resp.ok) return { info: null, items: [] };
  const text = await resp.text();
  const doc = new DOMParser().parseFromString(text, "text/xml");
  if (doc.querySelector("parsererror")) return { info: null, items: [] };

  // Feed-level metadata for the cast-style info card: title, subtitle
  // (description), logo/icon (thumbnail), and the profile link.
  const info = {
    title: firstTextNS(doc, ATOM_NS, "title"),
    description: stripHtml(firstTextNS(doc, ATOM_NS, "subtitle")),
    image:
      firstTextNS(doc, ATOM_NS, "logo") || firstTextNS(doc, ATOM_NS, "icon"),
    link: feedLinkOf(doc),
  };

  const entries = doc.getElementsByTagNameNS(ATOM_NS, "entry");
  const items = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const img = imageOf(entry);
    if (!img) continue;
    const title = firstTextNS(entry, ATOM_NS, "title");
    const summary = firstTextNS(entry, ATOM_NS, "summary");
    items.push({
      img,
      caption: title || stripHtml(summary),
      link: linkOf(entry),
      date: formatDate(firstTextNS(entry, ATOM_NS, "updated")),
      author: authorNameOf(entry),
    });
  }
  return { info: info, items: items };
}

export default async function initGallery(container) {
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
    window.LANG && window.LANG.modules && window.LANG.modules.gallery
      ? window.LANG.modules.gallery.name
      : "GALLERY";
  title.innerHTML = '<i class="fa-solid fa-images"></i> ' + name;
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "gallery-content";
  container.appendChild(content);

  const parentItem = container.closest(".dashboard-item");
  if (parentItem) {
    parentItem.dataset.module = "gallery";
    parentItem.style.minHeight = "unset";
  }

  let images = [];
  try {
    images = await loadGallery();
  } catch (err) {
    console.error("Gallery load error:", err);
  }

  // Save picked images with a byte-accurate progress bar (drawn by the
  // triggerLoad overlay). Alerts and returns false on failure.
  async function saveUploadedImages(newImages, loadOpts) {
    try {
      await saveGallery(newImages, function (doneBytes, totalBytes, name) {
        if (loadOpts && loadOpts.setProgress) {
          loadOpts.setProgress(doneBytes, totalBytes, name);
        }
      });
      return true;
    } catch (err) {
      var quota =
        err &&
        (err.name === "QuotaExceededError" ||
          /quota/i.test(err.message || ""));
      alert(
        quota
          ? "Not enough storage on this device to save the images."
          : "Could not save images: " + (err.message || err),
      );
      return false;
    }
  }

  function createFileInput() {
    var loadOpts = {
      accept: "image/*",
      multiple: true,
      progress: true,
      onFiles: async function (newImages) {
        if (await saveUploadedImages([...images, ...newImages], loadOpts)) {
          container.innerHTML = "";
          initGallery(container);
        }
      },
    };
    window.triggerLoad(loadOpts);
  }

  function makeAddButton() {
    const btn = document.createElement("button");
    btn.className = "settings-link-btn";
    btn.style.cssText = "margin:0 auto 12px;";
    btn.innerHTML =
      '<i class="fa-solid fa-upload"></i> ' + t("d_uploadImages", "Load Images");
    btn.addEventListener("click", createFileInput);
    return btn;
  }

  // Single-image viewer with left / right scrolling, mirroring the Mastodon module.
  function makeCarousel(items) {
    if (!items.length) return null;

    let currentIndex = 0;

    const carousel = document.createElement("div");
    carousel.style.cssText = "display:flex;align-items:center;gap:8px;width:100%;";

    const leftBtn = document.createElement("button");
    leftBtn.className = "gallery-scroll-btn";
    leftBtn.textContent = "‹";
    leftBtn.style.cssText =
      "flex-shrink:0;width:40px;height:40px;border-radius:50%;border:1px solid #cbd5e1;" +
      "background:#fff;cursor:pointer;font-size:1.4rem;line-height:1;color:#334155;";
    leftBtn.setAttribute("aria-label", t("d_scrollLeft", "Previous image"));

    const view = document.createElement("div");
    view.className = "gallery-post-view";
    view.style.cssText = "flex:1;min-width:0;";

    const rightBtn = document.createElement("button");
    rightBtn.className = "gallery-scroll-btn";
    rightBtn.textContent = "›";
    rightBtn.style.cssText = leftBtn.style.cssText;
    rightBtn.setAttribute("aria-label", t("d_scrollRight", "Next image"));

    carousel.appendChild(leftBtn);
    carousel.appendChild(view);
    carousel.appendChild(rightBtn);

    function renderItem() {
      const item = items[currentIndex];
      if (!item) {
        view.innerHTML = "";
        return;
      }
      const img = `<img class="gallery-slide-img" src="${item.img || "/images/noimage.svg"}" alt="" loading="lazy"${item.img ? "" : ' style="width:100% !important;object-fit:cover !important;"'} onerror="this.onerror=null;this.src='/images/noimage.svg';this.style.setProperty('object-fit','cover','important');this.style.setProperty('width','100%','important');">`;
      const imgHtml = item.link
        ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer" style="display:block;">${img}</a>`
        : img;
      const metaParts = [];
      if (item.author) metaParts.push(escapeHtml(item.author));
      if (item.date) metaParts.push(escapeHtml(item.date));
      view.innerHTML = `
        <div class="gallery-item" style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:16px;">
          ${imgHtml}
          ${item.caption ? `<div class="gallery-caption">${escapeHtml(truncate(item.caption, 120))}</div>` : ""}
          ${metaParts.length ? `<div style="font-size:0.8rem;color:#64748b;">${metaParts.join(" · ")}</div>` : ""}
        </div>
      `;
    }

    function go(dir) {
      if (!items.length) return;
      currentIndex = (currentIndex + dir + items.length) % items.length;
      renderItem();
    }

    leftBtn.addEventListener("click", function () {
      go(-1);
    });
    rightBtn.addEventListener("click", function () {
      go(1);
    });

    renderItem();
    return carousel;
  }

  // --- Decide what to display: uploaded images win over the feed ---
  const hasUploads = images.length > 0;
  let feedUrl = "";
  try {
    feedUrl = (
      (loadSettings().gallery && loadSettings().gallery.pixelfedUrl) ||
      ""
    ).trim();
  } catch (e) {
    feedUrl = "";
  }

  let feedInfo = null;
  let feedItems = [];
  if (feedUrl && !hasUploads) {
    content.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:20px;color:#64748b;">' +
      '<i class="fa-solid fa-spinner fa-spin"></i> ' +
      t("d_loading", "Loading...") +
      "</div>";
    try {
      const parsed = await fetchPixelfedFeed(feedUrl);
      feedItems = parsed.items;
      feedInfo = parsed.info;
    } catch (err) {
      console.error("Pixelfed feed error:", err);
      feedItems = [];
    }
    content.innerHTML = "";
  }

  let items = [];
  if (images.length) {
    items = images.map(function (img) {
      return {
        img: img.url,
        caption: (img.name || "")
          .replace(/\.[^.]+$/, "")
          .replace(/[+_\-]/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
        link: "",
        date: "",
        author: "",
      };
    });
  } else if (feedItems.length) {
    items = feedItems;
  }

  // Cast-style feed info card (thumbnail, title, description with a More /
  // Less expand link, and a link to the feed's website).
  function buildFeedInfoCard(info) {
    var desc = info.description || "";
    var preview =
      desc.length > 180 ? desc.slice(0, 180).replace(/\s+\S*$/, "") + "…" : desc;
    var clamped =
      desc.length > 500 ? desc.slice(0, 500).replace(/\s+\S*$/, "") + "…" : desc;
    var el = document.createElement("div");
    el.className = "gallery-info";
    el.style.cssText =
      "display:flex;gap:12px;align-items:flex-start;margin:0 0 10px;padding:16px;border-radius:10px;" +
      "border:1px solid color-mix(in srgb, var(--topbar-accent, #0047cc) 25%, transparent);" +
      "background:color-mix(in srgb, var(--topbar-accent, #0047cc) 5%, transparent);";
    var html = "";
    if (info.image)
      html +=
        '<img src="' +
        escapeHtml(info.image) +
        '" alt="" loading="lazy" style="width:88px;height:88px;border-radius:8px;object-fit:cover;flex-shrink:0;" onerror="this.style.display=\'none\'"/>';
    html += '<div style="min-width:0;flex:1;">';
    if (info.title)
      html +=
        '<div style="font-weight:700;font-size:1.05rem;line-height:1.3;">' +
        escapeHtml(info.title) +
        "</div>";
    if (desc)
      html +=
        '<div style="font-size:0.9rem;line-height:1.4;opacity:0.85;margin-top:6px;"><span id="galleryInfoDesc">' +
        escapeHtml(preview) +
        "</span>" +
        (desc.length > 180
          ? ' <a href="#" id="galleryInfoDescMore" style="font-weight:700;white-space:nowrap;">' +
            t("d_more", "More") +
            "</a>"
          : "") +
        "</div>";
    if (info.link)
      html +=
        '<a href="' +
        escapeHtml(info.link) +
        '" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-size:0.9rem;font-weight:700;">' +
        t("d_website", "Website") +
        " ↗</a>";
    html += "</div>";
    el.innerHTML = html;
    var descEl = el.querySelector("#galleryInfoDesc");
    var moreEl = el.querySelector("#galleryInfoDescMore");
    if (descEl && moreEl) {
      var moreText = t("d_more", "More"),
        lessText = t("d_less", "Less");
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
    return el;
  }

  // Mastodon-style source bar: website · account + change source button.
  function buildSourceBar() {
    var bar = document.createElement("div");
    bar.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;";
    bar.innerHTML =
      '<small style="opacity:0.7;">' +
      escapeHtml(hostnameOf(feedUrl)) +
      " · " +
      escapeHtml(accountOfFeedUrl(feedUrl)) +
      "</small>" +
      '<button id="galleryChangeSource" style="background:none;border:none;cursor:pointer;font-size:0.85rem;opacity:0.6;color:inherit;" title="' +
      t("d_changeSource", "Change source") +
      '"><i class="fa-solid fa-rotate-right"></i> ' +
      t("d_changeSource", "Source") +
      "</button>";
    var btn = bar.querySelector("#galleryChangeSource");
    if (btn)
      btn.onclick = function () {
        window.location.href = "settings.html?args=gallery";
      };
    return bar;
  }

  if (items.length) {
    // Mastodon-style source bar (only when a Pixelfed feed is active).
    if (feedItems.length) content.appendChild(buildSourceBar());
    // Only show the feed info card when a Pixelfed feed is actually active.
    if (feedItems.length && feedInfo && (feedInfo.title || feedInfo.image || feedInfo.link)) {
      content.appendChild(buildFeedInfoCard(feedInfo));
    }
    const carousel = makeCarousel(items);
    if (carousel) content.appendChild(carousel);
    content.appendChild(makeAddButton());
  } else {
    content.innerHTML = `
      <div class="module-empty">
        <i class="fa-solid fa-images"></i>
        <p>${t("d_noImages", "No images in gallery.")}</p>
        <button id="galleryUploadBtn" class="settings-link-btn">
          <i class="fa-solid fa-upload"></i> ${t("d_uploadImages", "Load Images")}
        </button>
        <small style="display:block;margin-top:10px;opacity:0.7;">or choose your favourite account on Pixelfed to follow by entering the username URL</small>
      </div>
    `;
    const uploadBtn = content.querySelector("#galleryUploadBtn");
    if (uploadBtn) uploadBtn.onclick = createFileInput;
  }

  return function () {};
}
