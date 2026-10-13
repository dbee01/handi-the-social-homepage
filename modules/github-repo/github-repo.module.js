/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/github-repo/github-repo.module.js
// GITHUB REPO COMMITS — reads the latest commits for a repository via GitHub's
// REST API (https://api.github.com/repos/{owner}/{repo}/commits), which sends
// `Access-Control-Allow-Origin: *`, so it can be fetched directly from the
// browser — no server relay or proxy needed.

import { loadSettings } from "../../js/core/settings.js";

const DEFAULT_REPO = "dbee01/handi-the-social-homepage";
const REFRESH_MIN = 15;
const MAX_ITEMS = 12;
const API_ROOT = "https://api.github.com";

// The settings field was historically a full feed URL; accept either a
// GitHub "owner/repo" path or an old-style GitHub feed URL (best-effort).
function repoPath() {
  try {
    var s = loadSettings();
    var raw = (s && s["github-repo"] && s["github-repo"].feed) || DEFAULT_REPO;
    var m = String(raw).match(/github\.com\/([^/]+\/[^/?#]+)/i);
    if (m) return m[1].replace(/\.git$/i, "");
    if (/^[^/]+\/[^/]+$/.test(raw)) return raw;
    return DEFAULT_REPO;
  } catch (e) {
    return DEFAULT_REPO;
  }
}

function commitsUrl() {
  // `repoPath()` is "owner/repo"; the slash is a path separator, not data,
  // so encode each segment separately (encoding the whole string would turn
  // the / into %2F and GitHub's API would 404).
  var parts = repoPath().split("/");
  var path = parts.map(encodeURIComponent).join("/");
  return API_ROOT + "/repos/" + path + "/commits?per_page=" + MAX_ITEMS;
}

function repoHtmlUrl() {
  return "https://github.com/" + repoPath();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, function (m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
  });
}

// Commit author: prefer the GitHub login, fall back to the commit author name.
function authorOf(commit) {
  if (commit.author && commit.author.login) return commit.author.login;
  if (commit.commit && commit.commit.author && commit.commit.author.name) {
    return commit.commit.author.name;
  }
  return "";
}

// Short detail line: the commit message.
function excerptOf(commit) {
  var msg = commit.commit && commit.commit.message;
  var txt = String(msg || "").replace(/\s+/g, " ").trim();
  if (!txt) return "";
  return txt.length > 140 ? txt.slice(0, 140).replace(/\s+\S*$/, "") + "…" : txt;
}

function fmtDate(iso) {
  if (!iso) return "";
  var d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function initGitHubRepo(container) {
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
    window.LANG && window.LANG.modules && window.LANG.modules["github-repo"]
      ? window.LANG.modules["github-repo"].name
      : "GitHub Repo";
  title.innerHTML = '<i class="fa-brands fa-github"></i> ' + modName;
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "github-repo-content";
  container.appendChild(content);

  const parentItem = container.closest(".dashboard-item");
  if (parentItem) parentItem.dataset.module = "github-repo";

  let refreshIntervalId = null;

  function render(items, channelLink) {
    content.innerHTML = "";
    if (!items.length) {
      content.innerHTML =
        '<div class="module-empty"><i class="fa-brands fa-github"></i><p>' +
        escapeHtml(t("d_githubRepoEmpty", "No activity yet.")) +
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
        escapeHtml(t("d_githubRepoViewRepo", "Open repository")) +
        " ↗</a>";
      content.appendChild(foot);
    }

    if (window.refreshDashboardLayout) window.refreshDashboardLayout();
  }

  function showError() {
    content.innerHTML =
      '<div class="module-empty"><i class="fa-solid fa-triangle-exclamation"></i><p>' +
      escapeHtml(t("d_githubRepoError", "Could not load the repository feed.")) +
      "</p></div>";
  }

  async function fetchGitHubRepo() {
    try {
      content.innerHTML =
        '<div class="github-repo-loading" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:20px;color:#64748b;">' +
        '<i class="fa-solid fa-spinner fa-spin"></i> ' +
        escapeHtml(t("d_loading", "Loading...")) +
        "</div>";

      var resp = await fetch(commitsUrl(), {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      var commits = await resp.json();
      if (!Array.isArray(commits)) throw new Error("Unexpected response");

      var items = commits.slice(0, Math.min(commits.length, MAX_ITEMS)).map(function (c) {
        var author = authorOf(c) || "";
        var sha = (c.sha || "").slice(0, 7);
        var action = (author ? author + " " : "") + "committed " + sha;
        return {
          action: action,
          link: (c.html_url || ""),
          date: fmtDate(c.commit && c.commit.committer && c.commit.committer.date),
          excerpt: excerptOf(c),
        };
      });

      render(items, repoHtmlUrl());
    } catch (err) {
      console.error("GitHub repo fetch error:", err);
      showError();
    }
  }

  fetchGitHubRepo();
  refreshIntervalId = setInterval(fetchGitHubRepo, REFRESH_MIN * 60 * 1000);

  return function () {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
  };
}
