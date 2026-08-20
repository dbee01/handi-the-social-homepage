/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/support/support.module.js
// Support module — renders the handi-pack &support HTML, or a default
// welcome block when no custom HTML was provided.
import { loadSettings } from "../../js/core/settings.js";

const DEFAULT_HTML = [
  "<h4>Welcome to your custom build handi-pack homepage.</h4>",
  "<ul>",
  "  <li>Click the settings cog button in the footer to see a full list of free and premium features.</li>",
  "  <li>Click on the image above for a free 7 day trial.</li>",
  "  <li>Share this homepage with your friends (bottom of the page).</li>",
  "  <li>Finally, you can install this homepage for easy access by following the instructions (above).</li>",
  "</ul>",
  "<p>Enjoy!</p>",
].join("\n");

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

  const cfg = (loadSettings().support) || {};
  const customHtml = (cfg.html || "").trim();

  // The pack's &support HTML wins; otherwise show the default welcome block.
  content.innerHTML = customHtml || DEFAULT_HTML;
}
