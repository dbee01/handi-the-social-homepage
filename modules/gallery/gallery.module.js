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

async function fetchPixelfedFeed(url) {
  const resp = await fetch("/api/feed?url=" + encodeURIComponent(url));
  if (!resp.ok) return [];
  const text = await resp.text();
  const doc = new DOMParser().parseFromString(text, "text/xml");
  if (doc.querySelector("parsererror")) return [];

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
  return items;
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
  if (parentItem) parentItem.dataset.module = "gallery";

  let images = [];
  try {
    images = await loadGallery();
  } catch (err) {
    console.error("Gallery load error:", err);
  }

  function createFileInput() {
    window.triggerLoad({
      accept: "image/*",
      multiple: true,
      onFiles: async function (newImages) {
        await saveGallery([...images, ...newImages]);
        container.innerHTML = "";
        initGallery(container);
      },
    });
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
      const img = item.img
        ? `<img class="gallery-slide-img" src="${item.img}" alt="" loading="lazy" onerror="this.style.display='none'">`
        : "";
      const imgHtml = item.link
        ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer" style="display:block;">${img}</a>`
        : img;
      const metaParts = [];
      if (item.author) metaParts.push(escapeHtml(item.author));
      if (item.date) metaParts.push(escapeHtml(item.date));
      view.innerHTML = `
        <div class="gallery-item" style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:8px 0;">
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

  // --- Decide what to display: feed first, then uploaded images ---
  let feedUrl = "";
  try {
    feedUrl = (
      (loadSettings().gallery && loadSettings().gallery.pixelfedUrl) ||
      ""
    ).trim();
  } catch (e) {
    feedUrl = "";
  }

  let feedItems = [];
  if (feedUrl) {
    content.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:24px;color:#64748b;">' +
      '<i class="fa-solid fa-spinner fa-spin"></i> ' +
      t("d_loading", "Loading...") +
      "</div>";
    try {
      feedItems = await fetchPixelfedFeed(feedUrl);
    } catch (err) {
      console.error("Pixelfed feed error:", err);
      feedItems = [];
    }
    content.innerHTML = "";
  }

  let items = [];
  if (feedItems.length) {
    items = feedItems;
  } else if (images.length) {
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
  }

  if (items.length) {
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
      </div>
    `;
    const uploadBtn = content.querySelector("#galleryUploadBtn");
    if (uploadBtn) uploadBtn.onclick = createFileInput;
  }

  return function () {};
}
