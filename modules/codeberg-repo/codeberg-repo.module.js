/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/codeberg-repo/codeberg-repo.module.js
// CODEBERG-REPO — reads the handi/handi-the-social-homepage repository feed on
// Codeberg and shows the latest commits, pushes and releases in a compact
// panel. Fetched through the server's generic feed relay (/api/feed) since
// cross-origin RSS can't be read directly from the browser.

import { loadSettings } from "../../js/core/settings.js";

const DEFAULT_FEED = "https://codeberg.org/handi/handi-the-social-homepage.rss";
const REFRESH_MIN = 15;
const MAX_ITEMS = 12;

function feedUrl() {
  try {
    var s = loadSettings();
    var feed =
      (s && s["codeberg-repo"] && s["codeberg-repo"].feed) || DEFAULT_FEED;
    return feed;
  } catch (e) {
    return DEFAULT_FEED;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, function (m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
  });
}

function decodeEntities(str) {
  if (!str) return "";
  var d = document.createElement("div");
  d.innerHTML = str;
  return (d.textContent || d.innerText || "").trim();
}

// Pull the leading human-readable action out of a Codeberg activity title,
// e.g. "handi pushed to main at handi/handi-the-social-homepage".
function actionOf(title) {
  var t = title || "";
  var m = t.match(/^(\S[^a-z]*[a-z]+ (?:pushed|opened|commented|closed|merged|created|renamed|forked|released|updated|starred)[^\n]*)/i);
  return m ? m[1].trim() : t;
}

// Codeberg activity descriptions often embed the commit/issue summary as
// plain text after the links. Strip tags and collapse whitespace into a
// short, readable excerpt.
function excerptOf(description) {
  var txt = decodeEntities((description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
  if (!txt) return "";
  return txt.length > 140 ? txt.slice(0, 140).replace(/\s+\S*$/, "") + "…" : txt;
}

function fmtDate(iso) {
  if (!iso) return "";
  var d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function initCodebergRepo(container) {
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
  const modName =
    window.LANG && window.LANG.modules && window.LANG.modules["codeberg-repo"]
      ? window.LANG.modules["codeberg-repo"].name
      : "Codeberg Repo";
  title.innerHTML = '<i class="fa-brands fa-code-branch"></i> ' + modName;
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "codeberg-repo-content";
  container.appendChild(content);

  const parentItem = container.closest(".dashboard-item");
  if (parentItem) parentItem.dataset.module = "codeberg-repo";

  let refreshIntervalId = null;

  function render(items, channelLink) {
    content.innerHTML = "";
    if (!items.length) {
      content.innerHTML =
        '<div class="module-empty"><i class="fa-brands fa-code-branch"></i><p>' +
        escapeHtml(t("d_codebergRepoEmpty", "No activity yet.")) +
        "</p></div>";
      return;
    }

    var list = document.createElement("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:8px;";

    items.forEach(function (it) {
      var row = document.createElement("a");
      row.href = it.link || "#";
      if (row.href.charAt(0) !== "#") {
        row.target = "_blank";
        row.rel = "noopener noreferrer";
      }
      row.style.cssText =
        "display:block;padding:10px 12px;border-radius:10px;text-decoration:none;color:inherit;" +
        "border:1px solid color-mix(in srgb, var(--topbar-accent, #0047cc) 18%, transparent);" +
        "background:color-mix(in srgb, var(--topbar-accent, #0047cc) 4%, transparent);";

      var action = escapeHtml(it.action);
      var excerpt = it.excerpt ? escapeHtml(it.excerpt) : "";
      var date = it.date ? escapeHtml(it.date) : "";

      row.innerHTML =
        '<div style="font-size:0.9rem;font-weight:600;line-height:1.3;">' + action + "</div>" +
        (excerpt ? '<div style="font-size:0.82rem;opacity:0.7;margin-top:3px;line-height:1.35;">' + excerpt + "</div>" : "") +
        (date ? '<div style="font-size:0.75rem;opacity:0.5;margin-top:4px;"><i class="fa-regular fa-clock"></i> ' + date + "</div>" : "");

      list.appendChild(row);
    });

    content.appendChild(list);

    if (channelLink) {
      var foot = document.createElement("div");
      foot.style.cssText = "margin-top:8px;text-align:right;";
      foot.innerHTML =
        '<a href="' + escapeHtml(channelLink) + '" target="_blank" rel="noopener" style="font-size:0.8rem;font-weight:600;">' +
        escapeHtml(t("d_codebergRepoViewRepo", "Open repository")) +
        " ↗</a>";
      content.appendChild(foot);
    }

    if (window.refreshDashboardLayout) window.refreshDashboardLayout();
  }

  function showError() {
    content.innerHTML =
      '<div class="module-empty"><i class="fa-solid fa-triangle-exclamation"></i><p>' +
      escapeHtml(t("d_codebergRepoError", "Could not load the repository feed.")) +
      "</p></div>";
  }

  async function fetchCodebergRepo() {
    try {
      content.innerHTML =
        '<div class="codeberg-repo-loading" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:20px;color:#64748b;">' +
        '<i class="fa-solid fa-spinner fa-spin"></i> ' +
        escapeHtml(t("d_loading", "Loading...")) +
        "</div>";

      var resp = await fetch("/api/feed?url=" + encodeURIComponent(feedUrl()));
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      var xmlText = await resp.text();
      var xmlDoc = new DOMParser().parseFromString(xmlText, "text/xml");
      if (xmlDoc.querySelector("parsererror")) throw new Error("Invalid XML");

      var channel = xmlDoc.querySelector("channel");
      var channelLink =
        (channel && channel.querySelector("link") && channel.querySelector("link").textContent.trim()) ||
        "https://codeberg.org/handi/handi-the-social-homepage";

      var items = [];
      var nodes = xmlDoc.querySelectorAll("item");
      var limit = Math.min(nodes.length, MAX_ITEMS);
      for (var i = 0; i < limit; i++) {
        var node = nodes[i];
        var rawTitle = (node.querySelector("title") && node.querySelector("title").textContent) || "";
        var titleText = decodeEntities(rawTitle.trim());
        var link = (node.querySelector("link") && node.querySelector("link").textContent.trim()) || "";
        var rawDate = (node.querySelector("pubDate") && node.querySelector("pubDate").textContent) || "";
        var rawDesc = (node.querySelector("description") && node.querySelector("description").textContent) || "";

        // Activity summaries are wrapped in <![CDATA[ ... ]]> and may be empty
        // when the title already carries the full action; fall back gracefully.
        items.push({
          action: actionOf(titleText) || titleText,
          link: link,
          date: fmtDate(rawDate),
          excerpt: excerptOf(rawDesc),
        });
      }

      render(items, channelLink);
    } catch (err) {
      console.error("Codeberg repo fetch error:", err);
      showError();
    }
  }

  fetchCodebergRepo();
  refreshIntervalId = setInterval(fetchCodebergRepo, REFRESH_MIN * 60 * 1000);

  return function () {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
  };
}
