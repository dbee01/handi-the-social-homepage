/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/support/support.module.js
// Support module — renders the handi-pack &support HTML, or a default
// welcome block when no custom HTML was provided.
import { loadSettings } from "../../js/core/settings.js";

const PREMIUM_URL = "https://buy.stripe.com/14AbJ05WbgWM73pbIfdUY00";

// Escape pack metadata before injecting it — it originates from URL params.
function esc(s) {
  return String(s).replace(/[&<>"]/g, function (m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m];
  });
}

// Title + description come from the handi-pack URL params (`handi-pack` and
// `description`), stored by js/core/handi-pack.js after the redirect.
function getPackMeta() {
  let name = "";
  let description = "";
  try {
    name = localStorage.getItem("handiPackName") || "";
    description = localStorage.getItem("handiPackDescription") || "";
  } catch (e) {}
  // Fall back to the URL directly if the module runs before the redirect.
  try {
    const qs = new URLSearchParams(window.location.search);
    if (!name && qs.get("handi-pack")) name = qs.get("handi-pack");
    if (!description && qs.get("description")) description = qs.get("description");
  } catch (e) {}
  return { name: name.trim(), description: description.trim() };
}

// Default welcome block: the pack's title & description, plus a Try Premium
// link for the 7 day free trial.
function defaultHtml() {
  const { name, description } = getPackMeta();
  const title = name || "Welcome to your custom build handi-homepage homepage.";
  return [
    "<h3>" + esc(title) + "</h3>",
    description ? '<p class="support-desc">' + esc(description) + "</p>" : "",
    '<p class="support-trial">Try Premium for 7 days? <a class="premium-link" href="' + PREMIUM_URL + '" target="_blank" rel="noopener" title="Try Premium" aria-label="Try Premium"><i class="fa-solid fa-crown"></i></a></p>',
  ].join("\n");
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

  // 3. Fall back to the default welcome block.
  content.innerHTML = defaultHtml();
}
