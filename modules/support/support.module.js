/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/support/support.module.js
// Support module — image or video card with external link and description.
import { loadSettings } from "../../js/core/settings.js";

export default async function initSupport(container) {
  var t =
    window.t ||
    function (k, e) {
      return e || k;
    };
  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.appendChild(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  var name =
    window.LANG && window.LANG.modules && window.LANG.modules.support
      ? window.LANG.modules.support.name
      : "SUPPORT";
  title.innerHTML = '<i class="fa-solid fa-hand-holding-heart"></i> ' + name;
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "support-content";
  container.appendChild(content);

  const parentItem = container.closest(".dashboard-item");
  if (parentItem) parentItem.dataset.module = "support";

  const settings = loadSettings();
  const cfg = settings.support || {};

  const mediaUrl = cfg.imageUrl || "";
  const mediaTitle = cfg.imageTitle || "";
  const linkUrl = cfg.linkUrl || "";
  const description = cfg.description || "";
  const mediaType = cfg.mediaType || detectMediaType(mediaUrl);

  if (!mediaUrl && !linkUrl && !description) {
    content.innerHTML = `
      <div class="module-empty">
        <i class="fa-solid fa-hand-holding-heart"></i>
        <p>${t("d_configureSupport", "Configure in Settings.")}</p>
      </div>
    `;
    return;
  }

  var html = '<div class="support-card" style="text-align:center;">';

  if (mediaUrl) {
    var linkOpen = linkUrl ? '<a href="' + escapeAttr(linkUrl) + '" target="_blank" rel="noopener">' : "";
    var linkClose = linkUrl ? "</a>" : "";
    html += linkOpen;

    if (mediaType === "video") {
      html += '<video src="' + escapeAttr(mediaUrl) + '" controls playsinline ' +
        'style="max-width:80%;width:100%;height:auto;display:block;margin:0 auto 8px;border-radius:var(--radius);" ' +
        'poster="' + escapeAttr(mediaUrl) + '#t=0.1"></video>';
    } else {
      html += '<img src="' + escapeAttr(mediaUrl) + '" alt="' + escapeAttr(mediaTitle || "Support") + '" class="support-img" style="max-width:80%;width:100%;height:auto;display:block;margin:0 auto 8px;border-radius:var(--radius);" />';
    }

    html += linkClose;
  }

  if (mediaTitle) {
    html += '<h3 class="support-title" style="margin:4px 0;font-family:var(--header-font);font-size:1.2rem;">' + escapeHtml(mediaTitle) + "</h3>";
  }

  if (linkUrl) {
    html += '<a href="' + escapeAttr(linkUrl) + '" target="_blank" rel="noopener" class="support-link" style="display:inline-block;margin-bottom:8px;font-weight:700;">' + escapeHtml(linkUrl) + "</a>";
  }

  if (description) {
    html += '<p class="support-desc" style="margin-top:8px;line-height:1.5;color:var(--text);text-align:center;">' + escapeHtml(description) + "</p>";
  }

  html += "</div>";

  content.innerHTML = html;
}

/** Auto-detect whether a URL points to a video or image. */
function detectMediaType(url) {
  if (!url) return "image";
  // data URI
  if (url.startsWith("data:video/")) return "video";
  if (url.startsWith("data:image/")) return "image";
  // common video extensions
  if (/\.(mp4|webm|ogg|ogv|mov|avi|mkv)(\?.*)?$/i.test(url)) return "video";
  return "image";
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]; });
}

function escapeAttr(str) {
  if (!str) return "";
  return str.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
