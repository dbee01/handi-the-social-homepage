/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/gallery/gallery.module.js
// FILTER & DISPLAY: prefer a Pixelfed Atom feed (if reachable), otherwise show
// locally loaded images. No slideshow / prev / next / play controls.
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

  function makeCard(imgUrl, caption, meta) {
    const link = meta && meta.link;
    const card = document.createElement(link ? "a" : "div");
    card.style.cssText =
      "display:flex;flex-direction:column;border-radius:12px;overflow:hidden;" +
      "border:1px solid #e5e7eb;background:#fff;text-decoration:none;color:inherit;";
    if (link) {
      card.href = link;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
    }

    const img = document.createElement("img");
    img.src = imgUrl;
    img.loading = "lazy";
    img.style.cssText =
      "width:100%;height:180px;object-fit:cover;display:block;background:#f1f5f9;";
    card.appendChild(img);

    const body = document.createElement("div");
    body.style.cssText =
      "padding:10px;display:flex;flex-direction:column;gap:4px;";

    if (caption) {
      const cap = document.createElement("div");
      cap.style.cssText =
        "font-size:0.95rem;font-weight:600;line-height:1.3;";
      cap.textContent = caption;
      body.appendChild(cap);
    }

    const metaParts = [];
    if (meta && meta.author) metaParts.push(meta.author);
    if (meta && meta.date) metaParts.push(meta.date);
    if (metaParts.length) {
      const small = document.createElement("div");
      small.style.cssText = "font-size:0.8rem;color:#64748b;";
      small.textContent = metaParts.join(" · ");
      body.appendChild(small);
    }

    card.appendChild(body);
    return card;
  }

  function renderGrid(items) {
    const grid = document.createElement("div");
    grid.style.cssText =
      "display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));" +
      "gap:12px;width:100%;";
    items.forEach(function (item) {
      grid.appendChild(
        makeCard(item.img, item.caption, {
          link: item.link,
          date: item.date,
          author: item.author,
        }),
      );
    });
    return grid;
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

  if (feedItems.length) {
    content.appendChild(renderGrid(feedItems));
    content.appendChild(makeAddButton());
  } else if (images.length) {
    // Display uploaded images as a simple grid (no slideshow controls).
    const grid = document.createElement("div");
    grid.style.cssText =
      "display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));" +
      "gap:10px;width:100%;";
    images.forEach(function (img) {
      const card = document.createElement("div");
      card.style.cssText =
        "display:flex;flex-direction:column;border-radius:12px;overflow:hidden;" +
        "border:1px solid #e5e7eb;background:#fff;";
      const im = document.createElement("img");
      im.src = img.url;
      im.loading = "lazy";
      im.style.cssText =
        "width:100%;height:140px;object-fit:cover;display:block;background:#f1f5f9;";
      card.appendChild(im);
      const cap = document.createElement("div");
      cap.style.cssText = "padding:8px;font-size:0.85rem;font-weight:600;";
      cap.textContent = (img.name || "")
        .replace(/\.[^.]+$/, "")
        .replace(/[+_\-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      card.appendChild(cap);
      grid.appendChild(card);
    });
    content.appendChild(grid);
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
