/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// modules/fitness/fitness.module.js
// FITNESS — pulls a user's training data from wger.de (weight, workouts,
// nutrition and progress pictures) and displays it in a tabbed panel:
//   1. Weight — a line chart of body-weight measurements
//   2. Workouts — the workout-session history (exercise diary)
//   3. Nutrition — a nutrition-diary/chart of logged meals
//   4. Gallery — progress photos
//
// Authentication is a per-user *permanent* token the user pastes on the
// settings page (stored in their own browser under settings.fitness.token).
// The module calls the wger.de REST API directly and never touches the
// server, so no credential leaves the device.

import { loadSettings } from "../../js/core/settings.js";

const POLL_MS = 5 * 60 * 1000; // re-fetch every 5 minutes
const WGER_BASE = "https://wger.de/api/v2";
const WGER_ORIGIN = "https://wger.de";

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, function (m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
  });
}

// Resolve a wger media URL (often relative, e.g. "/media/...") to an absolute
// URL on wger.de, since the browser would otherwise resolve it against our own
// origin and break gallery images.
function resolveMedia(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.charAt(0) === "/") return WGER_ORIGIN + url;
  return WGER_ORIGIN + "/" + url;
}

// Read the user's permanent wger token from their saved settings.
function getWgerToken() {
  try {
    var s = loadSettings();
    return (s && s.fitness && s.fitness.token) || "";
  } catch (e) {
    return "";
  }
}

// Fetch a wger resource directly from the browser, authenticated with the
// user's permanent token. `params` become query-string params. Returns the
// parsed JSON payload. Throws { notConfigured: true } when no token is set,
// or { offline: true } when the request can't reach wger.
async function wgerGet(path, params) {
  var token = getWgerToken();
  if (!token) {
    var nc = new Error("no_token");
    nc.notConfigured = true;
    throw nc;
  }

  var qs = new URLSearchParams();
  if (params) {
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null || v === "") return;
      qs.set(k, String(v));
    });
  }
  var q = qs.toString();
  var url = WGER_BASE + path + (q ? "?" + q : "");

  var resp;
  try {
    resp = await fetch(url, {
      headers: { Authorization: "Token " + token },
      cache: "no-store",
    });
  } catch (e) {
    var off = new Error("offline");
    off.offline = true;
    throw off;
  }

  if (!resp.ok) {
    // 401/403 = bad/revoked token; surface a distinct state.
    if (resp.status === 401 || resp.status === 403) {
      var bad = new Error("bad_token");
      bad.badToken = true;
      throw bad;
    }
    throw new Error("HTTP " + resp.status);
  }
  return resp.json();
}

// ---------------------------------------------------------------------------
// SVG line chart (no external library) — used for the weight graph.
// ---------------------------------------------------------------------------
function renderLineChart(points, opts) {
  opts = opts || {};
  var W = 320;
  var H = 160;
  var padL = 40;
  var padR = 12;
  var padT = 12;
  var padB = 24;

  if (!points.length) return "";

  var xs = points.map(function (p) { return p.x; });
  var ys = points.map(function (p) { return p.y; });
  var minX = Math.min.apply(null, xs);
  var maxX = Math.max.apply(null, xs);
  var minY = Math.min.apply(null, ys);
  var maxY = Math.max.apply(null, ys);
  if (maxX === minX) maxX = minX + 1;
  // Add a little headroom above/below so the line isn't pinned to the edges.
  if (maxY === minY) { maxY = minY + 1; minY = minY - 1; }
  var ySpread = maxY - minY;
  minY -= ySpread * 0.1;
  maxY += ySpread * 0.1;

  function px(x) { return padL + ((x - minX) / (maxX - minX)) * (W - padL - padR); }
  function py(y) { return padT + (1 - (y - minY) / (maxY - minY)) * (H - padT - padB); }

  var d = points.map(function (p, i) {
    return (i === 0 ? "M" : "L") + px(p.x).toFixed(1) + " " + py(p.y).toFixed(1);
  }).join(" ");

  var grid = "";
  for (var g = 0; g <= 3; g++) {
    var gy = py(minY + ((maxY - minY) * g) / 3);
    grid += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" stroke="rgba(128,128,128,0.15)" stroke-width="1"/>';
  }

  var dots = points.map(function (p) {
    return '<circle cx="' + px(p.x).toFixed(1) + '" cy="' + py(p.y).toFixed(1) + '" r="2.6" fill="' + (opts.color || "#0047cc") + '"/>';
  }).join("");

  var minLabel = (opts.minLabel || minY.toFixed(1));
  var maxLabel = (opts.maxLabel || maxY.toFixed(1));

  var svg =
    '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="display:block;" role="img" aria-label="' + escapeHtml(opts.label || "chart") + '">' +
    grid +
    '<path d="' + d + '" fill="none" stroke="' + (opts.color || "#0047cc") + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
    dots +
    '<text x="' + (W - padR) + '" y="' + (H - 6) + '" text-anchor="end" font-size="10" fill="#94a3b8">' + escapeHtml(opts.xLabel || "") + '</text>' +
    '<text x="' + (padL - 6) + '" y="' + (padT + 10) + '" text-anchor="end" font-size="10" fill="#94a3b8">' + escapeHtml(maxLabel) + '</text>' +
    '<text x="' + (padL - 6) + '" y="' + (H - padB + 10) + '" text-anchor="end" font-size="10" fill="#94a3b8">' + escapeHtml(minLabel) + '</text>' +
    "</svg>";

  return svg;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDate(iso) {
  if (!iso) return "";
  var d = new Date(iso);
  if (isNaN(d.getTime())) return escapeHtml(iso);
  return d.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso) {
  if (!iso) return "";
  var d = new Date(iso);
  if (isNaN(d.getTime())) return escapeHtml(iso);
  return d.toLocaleString("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function initFitness(container) {
  const t =
    window.t ||
    function (k, e) { return e || k; };

  const pinBtn = container.querySelector(".pin-btn");
  container.innerHTML = "";
  if (pinBtn) container.appendChild(pinBtn);

  const title = document.createElement("div");
  title.className = "panel-title";
  var modName =
    window.LANG && window.LANG.modules && window.LANG.modules.fitness
      ? window.LANG.modules.fitness.name
      : "Fitness";
  title.innerHTML = '<i class="fa-solid fa-heart-pulse"></i> ' + modName;
  container.appendChild(title);

  const content = document.createElement("div");
  content.className = "fitness-content";
  content.style.cssText = "display:flex;flex-direction:column;gap:10px;width:100%;";
  container.appendChild(content);

  const parentItem = container.closest(".dashboard-item");
  if (parentItem) parentItem.dataset.module = "fitness";

  var stopped = false;
  var pollTimer = null;

  function showMessage(html) {
    content.innerHTML = html;
    if (window.refreshDashboardLayout) window.refreshDashboardLayout();
  }

  function showEmpty(icon, message) {
    showMessage(
      '<div class="module-empty"><i class="' + icon + '"></i><p>' +
      escapeHtml(message) +
      "</p></div>",
    );
  }

  // -------------------------------------------------------------------------
  // Tab switching
  // -------------------------------------------------------------------------
  var tabs = ["weight", "workouts", "nutrition", "gallery"];
  var currentTab = tabs[0];

  function renderTabs(active) {
    var html = '<div style="display:flex;gap:6px;flex-wrap:wrap;">';
    var labels = {
      weight: t("d_fitnessWeight", "Weight"),
      workouts: t("d_fitnessWorkouts", "Workouts"),
      nutrition: t("d_fitnessNutrition", "Nutrition"),
      gallery: t("d_fitnessGallery", "Gallery"),
    };
    tabs.forEach(function (tab) {
      var isActive = tab === active;
      html +=
        '<button data-fitness-tab="' + tab + '" style="' +
        (isActive
          ? "background:var(--topbar-accent, #0047cc);color:#fff;"
          : "background:color-mix(in srgb, var(--topbar-accent, #0047cc) 10%, transparent);color:inherit;") +
        'border:1px solid color-mix(in srgb, var(--topbar-accent, #0047cc) 40%, transparent);border-radius:999px;padding:5px 14px;font-size:0.85rem;cursor:pointer;' +
        '">' + escapeHtml(labels[tab]) + "</button>";
    });
    html += "</div>";
    return html;
  }

  async function selectTab(tab) {
    currentTab = tab;
    renderTabsHeader();
    await loadTab(tab);
  }

  function renderTabsHeader() {
    // Rebuild tab bar only (keeps the rest of the panel).
    var existing = content.querySelector(".fitness-tabs");
    if (existing) existing.remove();
    var bar = document.createElement("div");
    bar.className = "fitness-tabs";
    bar.innerHTML = renderTabs(currentTab);
    content.prepend(bar);
    bar.querySelectorAll("[data-fitness-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectTab(btn.getAttribute("data-fitness-tab")).then(function () {
          if (window.refreshDashboardLayout) window.refreshDashboardLayout();
        });
      });
    });
  }

  // -------------------------------------------------------------------------
  // Loaders for each tab
  // -------------------------------------------------------------------------
  async function loadTab(tab) {
    var body = document.createElement("div");
    body.className = "fitness-tab-body";
    body.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:20px;color:#64748b;">' +
      '<i class="fa-solid fa-spinner fa-spin"></i> ' +
      escapeHtml(t("d_loading", "Loading...")) +
      "</div>";
    // Remove any prior body, keep tabs on top.
    var prev = content.querySelector(".fitness-tab-body");
    if (prev) prev.remove();
    content.appendChild(body);

    try {
      if (tab === "weight") return await loadWeight(body);
      if (tab === "workouts") return await loadWorkouts(body);
      if (tab === "nutrition") return await loadNutrition(body);
      if (tab === "gallery") return await loadGallery(body);
    } catch (err) {
      if (err && err.notConfigured) {
        body.innerHTML =
          '<div class="module-empty"><i class="fa-solid fa-key"></i><p>' +
          escapeHtml(t("d_fitnessNoKey", "Add your wger API key to see your fitness data.")) +
          "</p><small style=\"opacity:0.6;\">" +
          escapeHtml(t("d_fitnessNoKeyHint", "Open Settings → Fitness, and paste your permanent wger token.")) +
          "</small></div>";
        return;
      }
      if (err && err.badToken) {
        body.innerHTML =
          '<div class="module-empty"><i class="fa-solid fa-triangle-exclamation"></i><p>' +
          escapeHtml(t("d_fitnessBadKey", "Your wger API key was rejected.")) +
          "</p><small style=\"opacity:0.6;\">" +
          escapeHtml(t("d_fitnessBadKeyHint", "Check the token in Settings → Fitness and try again.")) +
          "</small></div>";
        return;
      }
      if (err && err.offline) {
        body.innerHTML =
          '<div class="module-empty"><i class="fa-solid fa-wifi"></i><p>' +
          escapeHtml(t("d_fitnessOffline", "Can't reach wger.de right now.")) +
          "</p><small style=\"opacity:0.6;\">" +
          escapeHtml(t("d_fitnessOfflineHint", "Check your internet connection and try again.")) +
          "</small></div>";
        return;
      }
      console.error("Fitness load error:", err);
      body.innerHTML =
        '<div class="module-empty"><i class="fa-solid fa-triangle-exclamation"></i><p>' +
        escapeHtml(t("d_error", "Could not load fitness data.")) +
        "</p></div>";
    }
  }

  // ---- Weight ------------------------------------------------------------
  async function loadWeight(body) {
    // Find the official body-weight category, then its measurements.
    var cats = await wgerGet("/measurement-category/", {
      metric_type: "body_weight",
      is_official: "True",
    });
    var results = (cats && cats.results) || [];
    var catId = results.length ? results[0].id : null;
    if (!catId) {
      body.innerHTML =
        '<div class="module-empty"><i class="fa-solid fa-weight-scale"></i><p>' +
        escapeHtml(t("d_fitnessNoWeight", "No weight measurements yet.")) +
        "</p></div>";
      return;
    }
    var meas = await wgerGet("/measurement/", {
      category: catId,
      ordering: "date",
      limit: 200,
    });
    var list = (meas && meas.results) || [];
    if (!list.length) {
      body.innerHTML =
        '<div class="module-empty"><i class="fa-solid fa-weight-scale"></i><p>' +
        escapeHtml(t("d_fitnessNoWeight", "No weight measurements yet.")) +
        "</p></div>";
      return;
    }

    // Points ordered oldest -> newest for the chart.
    var points = list
      .map(function (m) {
        var v = parseFloat(m.value);
        if (!Number.isFinite(v)) return null;
        var ts = Date.parse(m.date);
        if (isNaN(ts)) return null;
        return { x: ts, y: v };
      })
      .filter(Boolean)
      .sort(function (a, b) { return a.x - b.x; });

    var latest = list[0];
    var unit = "";
    try { unit = (latest && latest.unit) || results[0].unit || ""; } catch (e) {}

    var html =
      '<div style="font-weight:700;font-size:1.1rem;">' +
      escapeHtml(t("d_fitnessWeight", "Weight")) +
      "</div>" +
      '<div style="display:flex;align-items:baseline;gap:6px;">' +
      '<span style="font-size:1.6rem;font-weight:800;">' +
      escapeHtml(latest.value) + "</span>" +
      '<span style="opacity:0.6;">' + escapeHtml(unit || "") + "</span>" +
      '<span style="opacity:0.5;font-size:0.85rem;">· ' + escapeHtml(fmtDate(latest.date)) + "</span>" +
      "</div>";

    if (points.length >= 2) {
      var first = points[0].y;
      var last = points[points.length - 1].y;
      var delta = last - first;
      var deltaHtml =
        '<span style="margin-left:6px;font-size:0.85rem;font-weight:700;color:' +
          (delta <= 0 ? "#16a34a" : "#dc2626") + ';">' +
          (delta > 0 ? "+" : "") + delta.toFixed(1) + " " + escapeHtml(unit || "") +
        "</span>";
      html += deltaHtml;
    }

    html += renderLineChart(points, {
      label: t("d_fitnessWeight", "Weight"),
      minLabel: (Math.min.apply(null, points.map(function (p) { return p.y; }))).toFixed(1),
      maxLabel: (Math.max.apply(null, points.map(function (p) { return p.y; }))).toFixed(1),
    });

    html += '<small style="opacity:0.55;">' +
      escapeHtml(t("d_fitnessWeightHint", "Body weight over time")) +
      " · " + list.length + " " + escapeHtml(t("d_fitnessEntries", "entries")) +
      "</small>";

    body.innerHTML = html;

    // Also show a compact recent-entries list.
    var recent = '<div style="display:flex;flex-direction:column;gap:4px;margin-top:8px;">';
    list.slice(0, 5).forEach(function (m) {
      recent +=
        '<div style="display:flex;justify-content:space-between;font-size:0.85rem;padding:4px 0;border-top:1px solid rgba(128,128,128,0.15);">' +
        '<span style="opacity:0.7;">' + escapeHtml(fmtDate(m.date)) + "</span>" +
        '<span style="font-weight:700;">' + escapeHtml(m.value) + " " + escapeHtml(m.unit || "") + "</span>" +
        "</div>";
    });
    recent += "</div>";
    body.innerHTML += recent;
  }

  // ---- Workouts ----------------------------------------------------------
  async function loadWorkouts(body) {
    var sessions = await wgerGet("/workoutsession/", { ordering: "-datetime_start", limit: 20 });
    var list = (sessions && sessions.results) || [];
    if (!list.length) {
      body.innerHTML =
        '<div class="module-empty"><i class="fa-solid fa-dumbbell"></i><p>' +
        escapeHtml(t("d_fitnessNoWorkouts", "No workouts logged yet.")) +
        "</p></div>";
      return;
    }

    var html = '<div style="font-weight:700;font-size:1.1rem;margin-bottom:6px;">' +
      escapeHtml(t("d_fitnessWorkouts", "Workout history")) + "</div>";

    var impressionLabels = { "1": "🙂", "2": "😐", "3": "😄" };

    list.forEach(function (s) {
      var date = s.datetime_start || "";
      var impression = impressionLabels[s.impression] || "";
      html +=
        '<div style="padding:10px 12px;border-radius:10px;border:1px solid color-mix(in srgb, var(--topbar-accent, #0047cc) 20%, transparent);background:color-mix(in srgb, var(--topbar-accent, #0047cc) 5%, transparent);margin-bottom:8px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
        '<span style="font-weight:700;">' + escapeHtml(t("d_fitnessWorkoutSession", "Workout")) + "</span>" +
        '<span style="display:flex;align-items:center;gap:6px;">' +
        (impression ? '<span>' + impression + "</span>" : "") +
        '<span style="opacity:0.6;font-size:0.8rem;white-space:nowrap;">' + escapeHtml(fmtDateTime(date)) + "</span>" +
        "</span></div>" +
        (s.notes
          ? '<div style="font-size:0.85rem;opacity:0.7;margin-top:4px;">' + escapeHtml(s.notes) + "</div>"
          : "") +
        "</div>";
    });

    body.innerHTML = html;
  }

  // ---- Nutrition ---------------------------------------------------------
  // The wger "nutrition diary" is the LogItem endpoint. Each entry points at an
  // ingredient + an optional weight unit + an amount; we resolve those to real
  // names/macros and roll everything up per day for a daily breakdown + charts.
  async function loadNutrition(body) {
    var data = await wgerGet("/nutritiondiary/", { ordering: "-datetime", limit: 300 });
    var entries = (data && data.results) || [];
    if (!entries.length) {
      body.innerHTML =
        '<div class="module-empty"><i class="fa-solid fa-utensils"></i><p>' +
        escapeHtml(t("d_fitnessNoNutrition", "No nutritional diary entries yet.")) +
        "</p></div>";
      return;
    }

    // Resolve ingredient + weight-unit metadata on demand, caching by id so we
    // never hit the API twice for the same ingredient/unit.
    var ingredientCache = {};
    var unitCache = {};
    async function resolveIngredient(id) {
      if (ingredientCache[id]) return ingredientCache[id];
      try {
        var info = await wgerGet("/ingredientinfo/" + id + "/");
        ingredientCache[id] = info;
        return info;
      } catch (e) {
        ingredientCache[id] = null;
        return null;
      }
    }
    async function resolveUnit(id) {
      if (!id) return null;
      if (unitCache[id]) return unitCache[id];
      try {
        var info = await wgerGet("/ingredientweightunit/" + id + "/");
        unitCache[id] = info;
        return info;
      } catch (e) {
        unitCache[id] = null;
        return null;
      }
    }

    // Compute the nutritional values for a single diary entry, mirroring wger's
    // BaseMealItem.get_nutritional_values: ingredient.*value * weight / 100,
    // where weight = amount * weight_unit.gram (defaults to grams).
    function computeEntry(item, ingredient, unit) {
      var amount = parseFloat(item.amount);
      if (!Number.isFinite(amount)) amount = 0;
      var gramsPerUnit = unit && parseFloat(unit.gram) ? parseFloat(unit.gram) : 1;
      var weight = amount * gramsPerUnit;
      var g = (ingredient && Number(ingredient)) ? Number(ingredient) : 0;
      function mac(val) {
        var v = ingredient ? parseFloat(ingredient[val]) : NaN;
        if (!Number.isFinite(v)) return 0;
        return (v * weight) / 100;
      }
      return {
        energy: mac("energy"),
        protein: mac("protein"),
        carbohydrates: mac("carbohydrates"),
        fat: mac("fat"),
        weight: weight,
      };
    }

    // Resolve every entry's ingredient + unit, then attach computed values.
    var resolved = [];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var ingredient = await resolveIngredient(entry.ingredient);
      var unit = await resolveUnit(entry.weight_unit);
      var nv = computeEntry(entry, ingredient, unit);
      resolved.push({
        datetime: entry.datetime,
        name: (ingredient && ingredient.name) ? ingredient.name : "—",
        amount: entry.amount || "",
        unitName: (unit && unit.name) ? unit.name : "g",
        energy: nv.energy,
        protein: nv.protein,
        carbohydrates: nv.carbohydrates,
        fat: nv.fat,
        weight: nv.weight,
      });
    }

    // Group by local calendar day (newest first).
    function dayKey(iso) {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return "?";
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }
    var days = {};
    resolved.forEach(function (r) {
      var k = dayKey(r.datetime);
      if (!days[k]) days[k] = { key: k, items: [], energy: 0, protein: 0, carbohydrates: 0, fat: 0 };
      var d = days[k];
      d.items.push(r);
      d.energy += r.energy;
      d.protein += r.protein;
      d.carbohydrates += r.carbohydrates;
      d.fat += r.fat;
    });
    var dayList = Object.keys(days).map(function (k) { return days[k]; })
      .sort(function (a, b) { return a.key < b.key ? 1 : -1; });

    // Latest day + running totals for the summary header.
    var latest = dayList[0];
    var total = { energy: 0, protein: 0, carbohydrates: 0, fat: 0 };
    resolved.forEach(function (r) {
      total.energy += r.energy;
      total.protein += r.protein;
      total.carbohydrates += r.carbohydrates;
      total.fat += r.fat;
    });

    // ---- Build HTML -----------------------------------------------------
    var html = '<div style="font-weight:700;font-size:1.1rem;">' +
      escapeHtml(t("d_fitnessNutrition", "Nutrition")) + "</div>";

    // Today's totals highlight.
    html +=
      '<div style="margin-top:6px;">' +
      '<div style="font-size:0.78rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.03em;">' +
      escapeHtml(t("d_fitnessDailyTotals", "Daily totals")) + " — " + escapeHtml(fmtDate(latest.key)) + "</div>" +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">' +
      macroPill("Energy", Math.round(latest.energy) + " kcal", "#f59e0b") +
      macroPill("Protein", Math.round(latest.protein) + " g", "#16a34a") +
      macroPill("Carbs", Math.round(latest.carbohydrates) + " g", "#2563eb") +
      macroPill("Fat", Math.round(latest.fat) + " g", "#dc2626") +
      "</div></div>";

    // Calories-over-time chart (oldest -> newest).
    var chartPoints = dayList.slice().reverse().map(function (d) {
      var ts = Date.parse(d.key);
      return { x: ts, y: Math.round(d.energy) };
    });
    if (chartPoints.length >= 2) {
      html += '<div style="margin-top:10px;">' +
        '<div style="font-size:0.78rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.03em;margin-bottom:4px;">' +
        escapeHtml(t("d_fitnessNutritionEnergy", "Energy per day")) + "</div>" +
        renderLineChart(chartPoints, {
          label: t("d_fitnessNutritionEnergy", "Energy per day"),
          color: "#f59e0b",
        }) +
        "</div>";
    }

    // Macro breakdown bar across all logged days.
    var pSum = total.protein, cSum = total.carbohydrates, fSum = total.fat;
    var macroSum = pSum + cSum + fSum;
    if (macroSum > 0) {
      var pPct = (pSum / macroSum) * 100;
      var cPct = (cSum / macroSum) * 100;
      var fPct = (fSum / macroSum) * 100;
      html +=
        '<div style="margin-top:10px;">' +
        '<div style="font-size:0.78rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.03em;margin-bottom:4px;">' +
        escapeHtml(t("d_fitnessNutritionMacros", "Macro breakdown")) + "</div>" +
        '<div style="display:flex;height:12px;border-radius:999px;overflow:hidden;">' +
        '<div style="width:' + pPct.toFixed(1) + '%;background:#16a34a;"></div>' +
        '<div style="width:' + cPct.toFixed(1) + '%;background:#2563eb;"></div>' +
        '<div style="width:' + fPct.toFixed(1) + '%;background:#dc2626;"></div>' +
        "</div>" +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:5px;font-size:0.78rem;">' +
        '<span style="color:#16a34a;">■ ' + escapeHtml(t("d_macroProtein", "Protein")) + " " + pPct.toFixed(0) + "%</span>" +
        '<span style="color:#2563eb;">■ ' + escapeHtml(t("d_macroCarbs", "Carbs")) + " " + cPct.toFixed(0) + "%</span>" +
        '<span style="color:#dc2626;">■ ' + escapeHtml(t("d_macroFat", "Fat")) + " " + fPct.toFixed(0) + "%</span>" +
        "</div></div>";
    }

    // Per-day detail list.
    html += '<div style="font-weight:700;font-size:0.95rem;margin:12px 0 6px;">' +
      escapeHtml(t("d_fitnessNutritionHistory", "Daily diary")) + "</div>";

    dayList.forEach(function (d) {
      html +=
        '<div style="padding:10px 12px;border-radius:10px;border:1px solid rgba(128,128,128,0.2);margin-bottom:8px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;">' +
        '<span style="font-weight:700;">' + escapeHtml(fmtDate(d.key)) + "</span>" +
        '<span style="font-size:0.8rem;">' +
        Math.round(d.energy) + " kcal · " + Math.round(d.protein) + "g P · " +
        Math.round(d.carbohydrates) + "g C · " + Math.round(d.fat) + "g F</span>" +
        "</div>";
      d.items.forEach(function (r) {
        html +=
          '<div style="display:flex;justify-content:space-between;font-size:0.82rem;opacity:0.75;margin-top:3px;">' +
          '<span>' + escapeHtml(r.name) + (r.amount ? " <span style='opacity:0.6;'>" + escapeHtml(r.amount) + " " + escapeHtml(r.unitName) + "</span>" : "") + "</span>" +
          '<span>' + Math.round(r.energy) + " kcal</span>" +
          "</div>";
      });
      html += "</div>";
    });

    body.innerHTML = html;
  }

  function macroPill(label, value, color) {
    return (
      '<div style="flex:1;min-width:70px;text-align:center;padding:8px 4px;border-radius:8px;background:' + color + '1a;border:1px solid ' + color + '55;">' +
      '<div style="font-size:0.68rem;opacity:0.7;text-transform:uppercase;letter-spacing:0.03em;">' + escapeHtml(label) + "</div>" +
      '<div style="font-weight:800;font-size:0.95rem;">' + escapeHtml(value) + "</div>" +
      "</div>"
    );
  }

  // ---- Gallery -----------------------------------------------------------
  async function loadGallery(body) {
    var imgs = await wgerGet("/gallery/", { ordering: "-date", limit: 30 });
    var list = (imgs && imgs.results) || [];
    if (!list.length) {
      body.innerHTML =
        '<div class="module-empty"><i class="fa-solid fa-images"></i><p>' +
        escapeHtml(t("d_fitnessNoGallery", "No progress photos yet.")) +
        "</p></div>";
      return;
    }

    var idx = 0;
    body.innerHTML =
      '<div style="position:relative;display:flex;align-items:center;gap:8px;">' +
      '<button id="fitPrev" style="flex-shrink:0;width:36px;height:36px;border-radius:50%;border:1px solid #cbd5e1;background:transparent;cursor:pointer;font-size:1.3rem;">‹</button>' +
      '<div id="fitGalleryView" style="flex:1;min-width:0;text-align:center;"></div>' +
      '<button id="fitNext" style="flex-shrink:0;width:36px;height:36px;border-radius:50%;border:1px solid #cbd5e1;background:transparent;cursor:pointer;font-size:1.3rem;">›</button>' +
      "</div>";

    var view = body.querySelector("#fitGalleryView");
    function renderOne() {
      var img = list[idx];
      if (!img) { view.innerHTML = ""; return; }
      var url = resolveMedia(img.image || "");
      var date = img.date || "";
      var desc = img.description || "";
      view.innerHTML =
        '<img src="' + escapeHtml(url) + '" alt="" loading="lazy" style="max-width:100%;max-height:300px;border-radius:8px;display:inline-block;object-fit:contain;background:#f1f5f9;" onerror="this.style.display=\'none\'">' +
        (date ? '<div style="font-size:0.8rem;opacity:0.65;margin-top:4px;">' + escapeHtml(fmtDate(date)) + "</div>" : "") +
        (desc ? '<div style="font-size:0.8rem;opacity:0.7;margin-top:2px;">' + escapeHtml(desc) + "</div>" : "") +
        '<div style="font-size:0.75rem;opacity:0.5;margin-top:2px;">' + (idx + 1) + " / " + list.length + "</div>";
    }
    body.querySelector("#fitPrev").addEventListener("click", function () {
      idx = (idx - 1 + list.length) % list.length; renderOne();
    });
    body.querySelector("#fitNext").addEventListener("click", function () {
      idx = (idx + 1) % list.length; renderOne();
    });
    renderOne();
  }

  // -------------------------------------------------------------------------
  // Initial load
  // -------------------------------------------------------------------------
  try {
    // Render the tabs first; loadTab() adds its own spinner inside the tab
    // body, so there's no separate top-level "Loading..." that lingers.
    renderTabsHeader();
    await loadTab(currentTab);
  } catch (err) {
    // Initial tab already handles its own errors via loadTab; guard anyway.
    showEmpty("fa-solid fa-triangle-exclamation", t("d_error", "Could not load fitness data."));
  }

  function refresh() {
    if (stopped) return;
    loadTab(currentTab);
  }

  pollTimer = setInterval(refresh, POLL_MS);

  return function () {
    stopped = true;
    if (pollTimer) clearInterval(pollTimer);
  };
}
