/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/github-user/github.module.js
// GITHUB USER ACTIVITY — reads a user's public events via GitHub's REST API
// (https://api.github.com/users/{user}/events/public), which sends
// `Access-Control-Allow-Origin: *`, so it can be fetched directly from the
// browser — no server relay or proxy needed.

import { loadSettings } from "../../js/core/settings.js";

const DEFAULT_USER = "dbee01";
const REFRESH_MIN = 15;
const MAX_ITEMS = 12;
const API_ROOT = "https://api.github.com";

function feedUrl() {
  try {
    var s = loadSettings();
    var user = (s && s["github-user"] && s["github-user"].user) || DEFAULT_USER;
    return API_ROOT + "/users/" + encodeURIComponent(user) + "/events/public?per_page=" + MAX_ITEMS;
  } catch (e) {
    return API_ROOT + "/users/" + DEFAULT_USER + "/events/public?per_page=" + MAX_ITEMS;
  }
}

function profileUrl() {
  try {
    var s = loadSettings();
    var user = (s && s["github-user"] && s["github-user"].user) || DEFAULT_USER;
    return "https://github.com/" + encodeURIComponent(user);
  } catch (e) {
    return "https://github.com/" + DEFAULT_USER;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, function (m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
  });
}

// Map a GitHub event `type` to a short human-readable action label shown as
// the row's leading text, e.g. PushEvent -> "pushed".
const EVENT_LABELS = {
  PushEvent: "pushed",
  CreateEvent: "created",
  DeleteEvent: "deleted",
  WatchEvent: "starred",
  ForkEvent: "forked",
  IssuesEvent: "touched an issue",
  IssueCommentEvent: "commented",
  PullRequestEvent: "updated a pull request",
  PullRequestReviewEvent: "reviewed a pull request",
  PullRequestReviewCommentEvent: "commented on a review",
  ReleaseEvent: "released",
  PublicEvent: "made a repo public",
  GollumEvent: "edited the wiki",
  CommitCommentEvent: "commented on a commit",
};

// Human-readable summary of a single GitHub event: "<action> <ref> at <repo>".
function actionOf(ev) {
  var verb = EVENT_LABELS[ev.type] || ev.type;
  var repo = (ev.repo && ev.repo.name) || "";

  // Push events name a branch; everything else is best described by the type.
  if (ev.type === "PushEvent") {
    var branch = shortRef((ev.payload && ev.payload.ref) || "");
    var commits = (ev.payload && ev.payload.commits) || [];
    var suffix = commits.length ? ", " + commits.length + " commit" + (commits.length === 1 ? "" : "s") : "";
    return verb + " to " + branch + suffix + (repo ? " at " + repo : "");
  }

  if (ev.type === "CreateEvent" || ev.type === "ForkEvent") {
    var what = ev.type === "ForkEvent" ? (repo + " fork") : (ev.payload.ref_type === "repository" ? "repository " + repo : shortRef(ev.payload.ref || ""));
    return verb + " " + what;
  }

  if (ev.type === "WatchEvent") {
    return verb + " " + repo;
  }

  return verb + (repo ? " at " + repo : "");
}

// Turn a full ref like "refs/heads/master" into "master".
function shortRef(ref) {
  if (!ref) return "";
  return ref.replace(/^refs\/(heads|tags)\//, "") || ref;
}

// A short, linkable destination for each event; the repo page is a safe default.
function linkOf(ev) {
  if (ev.type === "PushEvent") {
    var head = (ev.payload && ev.payload.head) || "";
    var name = (ev.repo && ev.repo.name) || "";
    if (head && name) return "https://github.com/" + name + "/commit/" + head;
  }
  return "https://github.com/" + ((ev.repo && ev.repo.name) || "");
}

// Short detail line: latest commit message, PR/issue title, etc.
function excerptOf(ev) {
  if (ev.type === "PushEvent") {
    var commits = (ev.payload && ev.payload.commits) || [];
    if (commits.length) {
      var msg = commits[commits.length - 1].message || "";
      return truncate(msg);
    }
  }
  if (ev.type === "IssuesEvent" || ev.type === "PullRequestEvent") {
    var o = ev.payload && (ev.payload.issue || ev.payload.pull_request);
    if (o && o.title) return truncate(o.title);
  }
  if (ev.type === "ReleaseEvent" && ev.payload && ev.payload.release) {
    return truncate(ev.payload.release.name || ev.payload.release.tag_name || "");
  }
  return "";
}

function truncate(str) {
  str = String(str || "").replace(/\s+/g, " ").trim();
  if (!str) return "";
  return str.length > 120 ? str.slice(0, 120).replace(/\s+\S*$/, "") + "…" : str;
}

function fmtDate(iso) {
  if (!iso) return "";
  var d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function initGitHub(container) {
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
    window.LANG && window.LANG.modules && window.LANG.modules["github-user"]
      ? window.LANG.modules["github-user"].name
      : "GitHub";
  title.innerHTML = '<i class="fa-brands fa-github"></i> ' + modName;
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "github-content";
  container.appendChild(content);

  const parentItem = container.closest(".dashboard-item");
  if (parentItem) parentItem.dataset.module = "github-user";

  let refreshIntervalId = null;

  function render(items, channelLink) {
    content.innerHTML = "";
    if (!items.length) {
      content.innerHTML =
        '<div class="module-empty"><i class="fa-brands fa-github"></i><p>' +
        escapeHtml(t("d_githubUserEmpty", "No activity yet.")) +
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
        escapeHtml(t("d_githubUserViewProfile", "Open GitHub")) +
        " ↗</a>";
      content.appendChild(foot);
    }

    if (window.refreshDashboardLayout) window.refreshDashboardLayout();
  }

  function showError() {
    content.innerHTML =
      '<div class="module-empty"><i class="fa-solid fa-triangle-exclamation"></i><p>' +
      escapeHtml(t("d_githubUserError", "Could not load the GitHub feed.")) +
      "</p></div>";
  }

  async function fetchGitHub() {
    try {
      content.innerHTML =
        '<div class="github-loading" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:20px;color:#64748b;">' +
        '<i class="fa-solid fa-spinner fa-spin"></i> ' +
        escapeHtml(t("d_loading", "Loading...")) +
        "</div>";

      var resp = await fetch(feedUrl(), {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      var events = await resp.json();
      if (!Array.isArray(events)) throw new Error("Unexpected response");

      var items = events.slice(0, Math.min(events.length, MAX_ITEMS)).map(function (ev) {
        return {
          action: actionOf(ev),
          link: linkOf(ev),
          date: fmtDate(ev.created_at),
          excerpt: excerptOf(ev),
        };
      });

      render(items, profileUrl());
    } catch (err) {
      console.error("GitHub fetch error:", err);
      showError();
    }
  }

  fetchGitHub();
  refreshIntervalId = setInterval(fetchGitHub, REFRESH_MIN * 60 * 1000);

  return function () {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
  };
}
