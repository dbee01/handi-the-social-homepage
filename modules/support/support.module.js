/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/support/support.module.js
// Support module — renders the handi-pack &support HTML, or the configured
// support image/title/description/link from Settings. With nothing
// configured the element stays empty.
import { loadSettings } from "../../js/core/settings.js";

const PREMIUM_URL = "https://buy.stripe.com/14AbJ05WbgWM73pbIfdUY00";

// Escape pack metadata before injecting it — it originates from URL params.
function esc(s) {
  return String(s).replace(/[&<>"]/g, function (m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m];
  });
}

export default async function initSupport(container) {
  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.appendChild(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  const name =
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

  const cfg = loadSettings().support || {};
  const customHtml = (cfg.html || "").trim();

  // 1. A custom &support=<html> pack override wins.
  if (customHtml) {
    content.innerHTML = customHtml;
    return;
  }

  // 2. Otherwise render the configured support resource (image/video,
  //    title, description, link) when present.
  const hasResource =
    cfg.imageUrl || cfg.imageTitle || cfg.description || cfg.linkUrl;
  if (hasResource) {
    const parts = [];
    if (cfg.imageUrl) {
      // Videos stay unlinked (their controls need clicks); images link to the
      // same destination as the Link URL configured in Settings.
      const media =
        cfg.mediaType === "video"
          ? '<video class="support-media" controls playsinline src="' +
            esc(cfg.imageUrl) +
            '"></video>'
          : '<img class="support-media" src="' +
            esc(cfg.imageUrl) +
            '" alt="' +
            esc(cfg.imageTitle || "") +
            '" loading="lazy" />';
      if (cfg.mediaType !== "video" && cfg.linkUrl) {
        parts.push(
          '<a class="support-media-link" href="' +
            esc(cfg.linkUrl) +
            '" target="_blank" rel="noopener" aria-label="' +
            esc(cfg.imageTitle || "") +
            '">' +
            media +
            "</a>"
        );
      } else {
        parts.push(media);
      }
    }
    if (cfg.imageTitle) parts.push("<h3>" + esc(cfg.imageTitle) + "</h3>");
    if (cfg.description) {
      parts.push('<p class="support-desc">' + esc(cfg.description) + "</p>");
    }
    if (cfg.linkUrl) {
      parts.push(
        '<a class="support-link" href="' +
          esc(cfg.linkUrl) +
          '" target="_blank" rel="noopener">Learn More &rarr;</a>'
      );
    }
    content.innerHTML = parts.join("\n");
    return;
  }

  // 3. No content configured — leave the element empty. (Previously this
  //    re-rendered the handi-pack name/description as a "welcome" block, but
  //    that duplicated pack branding such as the Gaeilge homepage.)
  content.innerHTML = "";
}
