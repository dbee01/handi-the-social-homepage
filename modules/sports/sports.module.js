/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/sports/sports.module.js
// TODAY'S FIXTURES – polls /api/sports/live (the server proxies the
// API-Football "fixtures?date=…" endpoint with the key kept in .env) and
// renders each fixture with kickoff time, venue, teams and score.
import { loadSettings } from "../../js/core/settings.js";

const POLL_MS = 60 * 1000;

// Inline SVG icons (instead of emoji) so the module renders consistently
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
var SVG_PIN =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;" aria-hidden="true">' +
  '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z"/>' +
  '<circle cx="12" cy="10" r="3"/>' +
  "</svg>";

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m],
  );
}

// Bookmaker name → betting site. Odds boxes link to the relevant site so a
// tap takes the user straight there. Keys are lower-cased for lookup;
// unknown bookmakers fall back to a search so the box still goes somewhere
// useful instead of being a dead end.
var BOOKMAKER_SITES = {
  "1xbet": "https://1xbet.com",
  "10bet": "https://www.10bet.com",
  "12bet": "https://www.12bet.com",
  "188bet": "https://www.188bet.com",
  "888sport": "https://www.888sport.com",
  "admiralbet": "https://www.admiralbet.com",
  "bet365": "https://www.bet365.com",
  "bet9ja": "https://www.bet9ja.com",
  "betika": "https://www.betika.com",
  "betathome": "https://www.bet-at-home.com",
  "betano": "https://www.betano.com",
  "betclic": "https://www.betclic.com",
  "betfair": "https://www.betfair.com",
  "betfred": "https://www.betfred.com",
  "betonline": "https://www.betonline.ag",
  "betrivers": "https://www.betrivers.com",
  "betsafe": "https://www.betsafe.com",
  "betsson": "https://www.betsson.com",
  "betus": "https://www.betus.com.pa",
  "betvictor": "https://www.betvictor.com",
  "betway": "https://www.betway.com",
  "bodog": "https://www.bodog.eu",
  "bovada": "https://www.bovada.lv",
  "boylesports": "https://www.boylesports.com",
  "bwin": "https://www.bwin.com",
  "caesars": "https://www.caesars.com/sportsbook",
  "comeon": "https://www.comeon.com",
  "coral": "https://www.coral.co.uk",
  "dafabet": "https://www.dafabet.com",
  "draftkings": "https://www.draftkings.com",
  "fanduel": "https://www.fanduel.com",
  "fun88": "https://www.fun88.com",
  "ladbrokes": "https://www.ladbrokes.com",
  "leovegas": "https://www.leovegas.com",
  "marathonbet": "https://www.marathonbet.com",
  "meridianbet": "https://www.meridianbet.com",
  "mozzart": "https://www.mozzartbet.com",
  "mybookie": "https://www.mybookie.ag",
  "nordicbet": "https://www.nordicbet.com",
  "novibet": "https://www.novibet.com",
  "paddypower": "https://www.paddypower.com",
  "parimatch": "https://parimatch.com",
  "pinnacle": "https://www.pinnacle.com",
  "pointsbet": "https://www.pointsbet.com",
  "sbobet": "https://www.sbobet.com",
  "skybet": "https://m.skybet.com",
  "smarkets": "https://www.smarkets.com",
  "sportpesa": "https://www.sportpesa.com",
  "sportingbet": "https://www.sportingbet.com",
  "sportsbet": "https://www.sportsbet.com.au",
  "stake": "https://stake.com",
  "stoiximan": "https://www.stoiximan.gr",
  "twinspires": "https://www.twinspires.com",
  "unibet": "https://www.unibet.com",
  "williamhill": "https://www.williamhill.com",
  "wynnbet": "https://www.wynnbet.com",
};

// Homepage (or search fallback) for the given bookmaker name.
function oddsLink(bookmaker) {
  var key = String(bookmaker || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (BOOKMAKER_SITES[key]) return BOOKMAKER_SITES[key];
  return (
    "https://www.google.com/search?q=" +
    encodeURIComponent(String(bookmaker || "").trim() + " odds")
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

// Live/started statuses used to pick the badge and whether the score shows.
var LIVE_STATUS = ["1H", "2H", "HT", "ET", "P", "LIVE"];
var DONE_STATUS = ["FT", "AET", "PEN"];

function badgeFor(m) {
  var s = (m.status || "").toUpperCase();
  if (LIVE_STATUS.indexOf(s) !== -1) {
    var minute = typeof m.minute === "number" && m.minute > 0 ? m.minute + "'" : s;
    return (
      '<span style="font-weight:700;font-size:0.8rem;padding:2px 8px;border-radius:999px;background:#ef4444;color:#fff;">' +
      escapeHtml(minute) +
      "</span>"
    );
  }
  if (DONE_STATUS.indexOf(s) !== -1) {
    return (
      '<span style="font-weight:700;font-size:0.8rem;padding:2px 8px;border-radius:999px;background:#64748b;color:#fff;">' +
      escapeHtml(s) +
      "</span>"
    );
  }
  // Not started — show the kickoff time
  return (
    '<span style="font-weight:700;font-size:0.8rem;padding:2px 8px;border-radius:999px;background:color-mix(in srgb, var(--topbar-accent, #0047cc) 15%, transparent);color:var(--topbar-accent, #0047cc);">' +
    escapeHtml(m.time || s || "") +
    "</span>"
  );
}

function hasStarted(m) {
  var s = (m.status || "").toUpperCase();
  return LIVE_STATUS.indexOf(s) !== -1 || DONE_STATUS.indexOf(s) !== -1;
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
      // empty = all of today's fixtures). The server filters + caches per
      // filter. Defaults to League of Ireland when nothing saved.
      var leagueIds = "357";
      try {
        leagueIds = String(
          (loadSettings().sports && loadSettings().sports.leagueIds) || "357",
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
          t("d_sportsError", "Could not load today's fixtures.") +
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
          t("d_sportsNone", "No fixtures today.") +
          "</p></div>",
      );
      return;
    }
    var anyLive = matches.some(function (m) {
      return LIVE_STATUS.indexOf((m.status || "").toUpperCase()) !== -1;
    });
    var html =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
      '<small style="display:flex;align-items:center;gap:5px;opacity:0.7;">' +
      (anyLive
        ? '<span style="width:8px;height:8px;border-radius:50%;background:#ef4444;display:inline-block;"></span>'
        : "") +
      t("d_sportsToday", "Today") +
      " · " +
      matches.length +
      "</small></div>";
    matches.forEach(function (m) {
      html += matchHtml(m);
    });
    showMessage(html);
  }

  function matchHtml(m) {
    var started = hasStarted(m);
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
      '<div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-bottom:8px;">' +
      (m.leagueLogo
        ? '<img src="' +
          escapeHtml(m.leagueLogo) +
          '" alt="" style="width:16px;height:16px;border-radius:3px;object-fit:cover;" onerror="this.style.display=\'none\'">'
        : "") +
      '<small style="opacity:0.7;">' +
      escapeHtml(m.league) +
      "</small>" +
      badgeFor(m) +
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
      '<span style="font-size:1.15rem;font-weight:800;white-space:nowrap;' +
      (started ? "" : "opacity:0.45;") +
      '">' +
      (started ? (m.scoreHome || 0) + "–" + (m.scoreAway || 0) : "–") +
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
      (m.venue
        ? '<div style="display:flex;align-items:center;gap:5px;font-size:0.8rem;opacity:0.7;">' +
          SVG_PIN +
          "<span>" +
          escapeHtml(m.venue) +
          "</span></div>"
        : "") +
      (m.odds
        ? '<div style="display:flex;gap:6px;border-top:1px solid rgba(128,128,128,0.25);padding-top:8px;margin-top:8px;">' +
          ["home", "draw", "away"]
            .map(function (k) {
              var o = m.odds[k];
              var label =
                k === "home" ? "Home" : k === "draw" ? "Draw" : "Away";
              var box =
                '<div style="font-size:0.68rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.03em;">' +
                label +
                "</div>" +
                '<div style="font-weight:800;font-size:0.95rem;">' +
                (o && typeof o.odd === "number" ? o.odd.toFixed(2) : "–") +
                "</div>" +
                (o && o.bookmaker
                  ? '<div style="font-size:0.62rem;opacity:0.6;">' +
                    escapeHtml(o.bookmaker) +
                    "</div>"
                  : "");
              // Whole box links to that bookmaker's site (search fallback).
              var outer =
                '<div style="flex:1;text-align:center;border:1px solid rgba(128,128,128,0.3);border-radius:8px;padding:4px 2px;">' +
                box +
                "</div>";
              if (o && o.bookmaker) {
                outer =
                  '<a href="' +
                  oddsLink(o.bookmaker) +
                  '" target="_blank" rel="noopener noreferrer" style="flex:1;text-align:center;border:1px solid rgba(128,128,128,0.3);border-radius:8px;padding:4px 2px;text-decoration:none;color:inherit;display:block;">' +
                  box +
                  "</a>";
              }
              return outer;
            })
            .join("") +
          "</div>"
        : "") +
      (evHtml
        ? '<div style="display:flex;flex-direction:column;gap:4px;border-top:1px solid rgba(128,128,128,0.25);padding-top:8px;margin-top:8px;">' +
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
