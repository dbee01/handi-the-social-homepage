/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/sports/sports.module.js
// LIVE FOOTBALL RADAR – polls /api/sports/live (the server proxies the
// API-Football "live=all" endpoint with the key kept in .env) and renders
// each live match with its recent key events: goals, cards, VAR.
import { loadSettings } from "../../js/core/settings.js";

const POLL_MS = 60 * 1000;

// Inline SVG icons (instead of emoji) so the radar renders consistently
// across all browsers/devices.
var SVG_GOAL =
  '<svg viewBox="0 0 24 24" width="15" height="15" style="flex-shrink:0;" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="10" fill="#fff" stroke="#1e293b" stroke-width="1.5"/>' +
  '<path d="M12 6.5l2.1 1.5-.8 2.6h-2.6l-.8-2.6z" fill="#1e293b"/>' +
  '<path d="M12 6.5v4.1M9.9 8l2.1 2.6M14.1 8l-2.1 2.6" stroke="#1e293b" stroke-width="1.2" fill="none"/>' +
  "</svg>";
var SVG_VAR =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#334155" stroke-width="1.8" stroke-linecap="round" style="flex-shrink:0;" aria-hidden="true">' +
  '<rect x="3" y="5" width="18" height="13" rx="2"/>' +
  '<path d="M8 21h8M12 18v3"/>' +
  "</svg>";
var SVG_RED_CARD =
  '<svg viewBox="0 0 24 24" width="13" height="15" style="flex-shrink:0;" aria-hidden="true">' +
  '<rect x="6" y="3" width="12" height="18" rx="1.5" fill="#dc2626"/>' +
  "</svg>";
var SVG_YELLOW_CARD =
  '<svg viewBox="0 0 24 24" width="13" height="15" style="flex-shrink:0;" aria-hidden="true">' +
  '<rect x="6" y="3" width="12" height="18" rx="1.5" fill="#eab308"/>' +
  "</svg>";
var SVG_NEUTRAL =
  '<svg viewBox="0 0 24 24" width="12" height="12" style="flex-shrink:0;" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="6" fill="#94a3b8"/>' +
  "</svg>";
var SVG_LIVE_DOT =
  '<svg viewBox="0 0 24 24" width="10" height="10" style="flex-shrink:0;" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="8" fill="#ef4444"/>' +
  "</svg>";

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m],
  );
}

function eventIcon(ev) {
  if (ev.type === "Goal") return SVG_GOAL;
  if (ev.type === "Var") return SVG_VAR;
  if (ev.type === "Card") {
    var d = (ev.detail || "").toLowerCase();
    if (d.indexOf("red") !== -1) return SVG_RED_CARD;
    if (d.indexOf("yellow") !== -1) return SVG_YELLOW_CARD;
    return SVG_NEUTRAL;
  }
  return SVG_NEUTRAL;
}

function eventLabel(ev) {
  var d = (ev.detail || "").toLowerCase();
  if (ev.type === "Goal") {
    if (d.indexOf("penalty") !== -1) return "PENALTY GOAL";
    if (d.indexOf("own") !== -1) return "OWN GOAL";
    return "GOAL";
  }
  if (ev.type === "Card") {
    if (d.indexOf("red") !== -1) return "RED CARD";
    if (d.indexOf("yellow") !== -1)
      return d.indexOf("second") !== -1 ? "SECOND YELLOW" : "YELLOW CARD";
    return "CARD";
  }
  if (ev.type === "Var") return "VAR";
  return ev.type || "EVENT";
}

export default async function initSports(container) {
  var t =
    window.t ||
    function (k, e) {
      return e || k;
    };

  var pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.appendChild(pinBtn);

  var title = document.createElement("div");
  title.className = "panel-title";
  var name =
    window.LANG && window.LANG.modules && window.LANG.modules.sports
      ? window.LANG.modules.sports.name
      : "Sports";
  title.innerHTML = '<i class="fa-solid fa-futbol"></i> ' + name;
  container.appendChild(title);

  var content = document.createElement("div");
  content.className = "sports-content";
  content.style.cssText = "display:flex;flex-direction:column;gap:10px;width:100%;";
  container.appendChild(content);

  var parentItem = container.closest(".dashboard-item");
  if (parentItem) parentItem.dataset.module = "sports";

  var pollTimer = null;
  var stopped = false;

  function showMessage(html) {
    content.innerHTML = html;
  }

  async function refresh() {
    if (stopped) return;
    var data;
    try {
      // Optional league filter from Settings (comma-separated league ids;
      // empty = all live leagues). The server filters + caches per filter.
      var leagueIds = "";
      try {
        leagueIds = String(
          (loadSettings().sports && loadSettings().sports.leagueIds) || "",
        ).trim();
      } catch (e) {}
      var url =
        "/api/sports/live" +
        (leagueIds ? "?leagues=" + encodeURIComponent(leagueIds) : "");
      var resp = await fetch(url, { cache: "no-store" });
      if (resp.status === 503) {
        var j = await resp.json().catch(function () {
          return {};
        });
        if (j && j.error === "not_configured") {
          showMessage(
            '<div class="module-empty"><i class="fa-solid fa-futbol"></i><p>' +
              t(
                "d_sportsNoKey",
                "Live sports is not configured on the server.",
              ) +
              "</p><small style=\"opacity:0.6;\">" +
              t(
                "d_sportsNoKeyHint",
                "Add APISPORTS_KEY to the server's .env and restart.",
              ) +
              "</small></div>",
          );
          return;
        }
      }
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      data = await resp.json();
    } catch (err) {
      console.error("Sports radar error:", err);
      showMessage(
        '<div class="module-empty"><i class="fa-solid fa-triangle-exclamation"></i><p>' +
          t("d_sportsError", "Could not load live scores.") +
          "</p></div>",
      );
      return;
    }
    render(data);
  }

  function render(data) {
    var matches = (data && data.matches) || [];
    if (!matches.length) {
      showMessage(
        '<div class="module-empty"><i class="fa-solid fa-futbol"></i><p>' +
          t("d_sportsNone", "No live matches right now.") +
          "</p></div>",
      );
      return;
    }
    var html =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
      '<small style="display:flex;align-items:center;gap:5px;opacity:0.7;">' +
      SVG_LIVE_DOT +
      t("d_sportsLive", "LIVE") +
      " · " +
      matches.length +
      "</small></div>";
    matches.forEach(function (m) {
      html += matchHtml(m);
    });
    showMessage(html);
  }

  function matchHtml(m) {
    var minute =
      typeof m.minute === "number" && m.minute > 0 ? m.minute + "'" : m.status || "";
    var events = (m.events || []).slice().reverse(); // newest first
    var evHtml = events
      .slice(0, 4)
      .map(function (ev) {
        return (
          '<div style="display:flex;align-items:center;gap:6px;font-size:0.85rem;">' +
          "<span>" +
          eventIcon(ev) +
          "</span>" +
          "<strong>" +
          escapeHtml(eventLabel(ev)) +
          "</strong>" +
          (ev.time ? '<span style="opacity:0.6;">' + ev.time + "'</span>" : "") +
          (ev.player ? "<span>" + escapeHtml(ev.player) + "</span>" : "") +
          "</div>"
        );
      })
      .join("");
    return (
      '<div style="padding:12px;border-radius:12px;border:1px solid color-mix(in srgb, var(--topbar-accent, #0047cc) 25%, transparent);background:color-mix(in srgb, var(--topbar-accent, #0047cc) 5%, transparent);">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">' +
      (m.leagueLogo
        ? '<img src="' +
          escapeHtml(m.leagueLogo) +
          '" alt="" style="width:16px;height:16px;border-radius:3px;object-fit:cover;" onerror="this.style.display=\'none\'">'
        : "") +
      '<small style="opacity:0.7;flex:1;">' +
      escapeHtml(m.league) +
      "</small>" +
      '<span style="font-weight:700;font-size:0.8rem;padding:2px 8px;border-radius:999px;background:#ef4444;color:#fff;">' +
      escapeHtml(minute) +
      "</span>" +
      "</div>" +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">' +
      '<div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;justify-content:flex-end;text-align:right;">' +
      (m.homeLogo
        ? '<img src="' +
          escapeHtml(m.homeLogo) +
          '" alt="" style="width:22px;height:22px;border-radius:50%;object-fit:cover;" onerror="this.style.display=\'none\'">'
        : "") +
      '<span style="font-weight:700;">' +
      escapeHtml(m.home) +
      "</span>" +
      "</div>" +
      '<span style="font-size:1.15rem;font-weight:800;white-space:nowrap;">' +
      (m.scoreHome || 0) +
      "–" +
      (m.scoreAway || 0) +
      "</span>" +
      '<div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;">' +
      '<span style="font-weight:700;">' +
      escapeHtml(m.away) +
      "</span>" +
      (m.awayLogo
        ? '<img src="' +
          escapeHtml(m.awayLogo) +
          '" alt="" style="width:22px;height:22px;border-radius:50%;object-fit:cover;" onerror="this.style.display=\'none\'">'
        : "") +
      "</div>" +
      "</div>" +
      (evHtml
        ? '<div style="display:flex;flex-direction:column;gap:4px;border-top:1px solid rgba(128,128,128,0.25);padding-top:8px;">' +
          evHtml +
          "</div>"
        : "") +
      "</div>"
    );
  }

  content.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:20px;color:#64748b;">' +
    '<i class="fa-solid fa-spinner fa-spin"></i> ' +
    t("d_loading", "Loading...") +
    "</div>";

  refresh();
  pollTimer = setInterval(refresh, POLL_MS);

  return function () {
    stopped = true;
    if (pollTimer) clearInterval(pollTimer);
  };
}
