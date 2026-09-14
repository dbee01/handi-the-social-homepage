/*
 * Copyright (c) 2026 Handi Homepage
 * Standardised file load utility — used by settings and dashboard modules
 *
 * Usage:
 *   triggerLoad({ accept: "image/*", multiple: true, onFiles: (files) => { ... } })
 *   triggerLoad({ accept: "audio/*", multiple: true, onFiles: (files) => { ... } })
 *
 * Each file object: { name, file, url (ObjectURL), size }
 */

window.triggerLoad = function (opts) {
  var accept = opts.accept || "*/*";
  var multiple = opts.multiple !== false;
  var onFiles = opts.onFiles;
  var onError = opts.onError;
  var maxSizeMB = opts.maxSizeMB || 0;

  var input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.multiple = multiple;
  input.style.display = "none";

  input.addEventListener("change", function () {
    var raw = Array.from(input.files || []);
    if (!raw.length) { input.remove(); return; }

    if (maxSizeMB > 0) {
      for (var i = 0; i < raw.length; i++) {
        if (raw[i].size > maxSizeMB * 1024 * 1024) {
          if (onError) onError("File too large: " + raw[i].name);
          input.remove();
          return;
        }
      }
    }

    // Inject keyframes once
    if (!document.getElementById("triggerLoad-style")) {
      var s = document.createElement("style");
      s.id = "triggerLoad-style";
      s.textContent = "@keyframes tl-spin{to{transform:rotate(360deg)}}";
      document.head.appendChild(s);
    }

    // Build overlay directly on body. Two modes: the classic spinner (default)
    // and a progress bar (opts.progress) used by the Cast podcast uploads,
    // where the onFiles callback reports bytes written via opts.setProgress.
    var showProgress = !!opts.progress;
    var overlay = document.createElement("div");
    overlay.id = "tl-overlay";
    overlay.setAttribute("style",
      "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483647;" +
      "display:flex;align-items:center;justify-content:center");
    if (showProgress) {
      overlay.innerHTML =
        "<div style=\"background:#fff;border-radius:18px;padding:28px 36px;" +
        "text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.3);font-family:sans-serif;min-width:300px;max-width:90vw\">" +
        "<p style=\"margin:0 0 12px;font-size:1rem;font-weight:600;color:#1e293b\">Saving your files…</p>" +
        "<div style=\"width:100%;height:14px;background:#e2e8f0;border-radius:999px;overflow:hidden;\">" +
        "<div id=\"tl-fill\" style=\"width:0%;height:100%;background:#0047cc;border-radius:999px;transition:width .3s ease;\"></div>" +
        "</div>" +
        "<p id=\"tl-status\" style=\"margin:10px 0 0;font-size:.85rem;color:#475569;overflow-wrap:anywhere;\"></p>" +
        "</div>";
    } else {
      overlay.innerHTML =
        "<div style=\"background:#fff;border-radius:18px;padding:40px 56px;" +
        "text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.3);font-family:sans-serif\">" +
        "<div style=\"width:44px;height:44px;border:5px solid #e2e8f0;" +
        "border-top-color:#0047cc;border-radius:50%;margin:0 auto 18px;" +
        "animation:tl-spin .7s linear infinite\"></div>" +
        "<p style=\"margin:0;font-size:1.1rem;font-weight:600;color:#1e293b\">" +
        "Loading " + raw.length + " file" + (raw.length > 1 ? "s" : "") + "…</p></div>";
    }
    document.body.appendChild(overlay);

    // Force layout so overlay paints
    overlay.offsetHeight;

    // Byte-accurate progress updater, exposed to the caller's onFiles so it
    // can tick the bar as each file finishes saving to IndexedDB.
    opts.setProgress = function (done, total, text) {
      if (!showProgress) return;
      var pct =
        total > 0
          ? Math.max(0, Math.min(100, Math.round((done / total) * 100)))
          : 0;
      var fill = overlay.querySelector("#tl-fill");
      if (fill) fill.style.width = pct + "%";
      var status = overlay.querySelector("#tl-status");
      if (status)
        status.textContent = (text ? text + " — " : "") + pct + "%";
    };

    var files = raw.map(function (f) {
      return { name: f.name, file: f, url: URL.createObjectURL(f), size: f.size };
    });

    function done() {
      var el = document.getElementById("tl-overlay");
      if (el) el.remove();
      input.remove();
    }

    // Yield to the browser first so the spinner is painted BEFORE the
    // (potentially slow) file-saving work starts; remove it only when done.
    setTimeout(function () {
      var result = onFiles ? onFiles(files) : null;
      if (result && typeof result.then === "function") {
        result.then(done, function (e) {
          if (onError) onError(e.message || "Load failed");
          done();
        });
      } else {
        setTimeout(done, 800);
      }
    }, 50);
  });

  document.body.appendChild(input);
  input.click();
};

// Clicking a panel title collapses/expands everything below it in that
// panel. Works for all modules: those where .panel-title is a direct
// sibling of the content, and those (music/cast/radio/emergency) where the
// title lives inside a *-header-row wrapper.
// Collapse state is persisted to the Collapsible Module Record (CMR) in
// localStorage (keyed by the dashboard item id) and re-applied on page load.

// Resolve the CMR key for a dashboard item: prefer its element id (which
// matches the module registry ids, e.g. "social", "llm"), falling back to
// data-module (e.g. "mastodon") when the id is absent.
function cmrKeyFor(item) {
  return item && (item.id || item.dataset.module || null);
}

// Modules that reserve a steady min-height (image + text) via a CSS
// `[data-module=...]` rule. When collapsed their body is hidden, so that
// reserved height must be released dynamically on the element (and restored
// on expand) — a static CSS override is not enough because the base value is
// breakpoint-dependent.
function reservesMinHeight(item) {
  if (!item) return false;
  var mod = item.dataset.module || item.id;
  return (
    mod === "mastodon" ||
    mod === "social" ||
    mod === "news" ||
    mod === "events" ||
    mod === "flip" ||
    mod === "newsletter" ||
    mod === "gallery"
  );
}

// Apply a single module's saved collapse state (true = collapsed).
function applyModuleCollapse(item, collapsed) {
  var title = item.querySelector(".panel-title");
  if (!title) return;
  // The header is the title itself, or the header-row that wraps it.
  var header = title;
  var parent = title.parentElement;
  if (parent && /-header-row$/.test(parent.className || "")) {
    header = parent;
  }
  // The module body is the second child of .module-content (e.g. .flip-content,
  // .gallery-content, .news-content, .music-content) — the element after the
  // title/header. On collapse set it to height:0; display:none and clear both
  // on expand.
  var content = item.querySelector(".module-content") || header.parentElement;
  if (content) {
    var body = content.children[1];
    // Defensive fallback: if the second child is (or wraps) the header, e.g. a
    // module that prepended a node, collapse every non-header child instead.
    var targets =
      body && body !== header && !body.contains(header)
        ? [body]
        : Array.prototype.filter.call(content.children, function (c) {
            return c !== header && !c.contains(header);
          });
    targets.forEach(function (b) {
      b.style.height = collapsed ? "0" : "";
      b.style.display = collapsed ? "none" : "";
    });
  }
  // Mark the panel so CSS/layout can target the collapsed state.
  item.classList.toggle("is-collapsed", collapsed);
  // Dynamically release/restore the reserved min-height on this element.
  if (reservesMinHeight(item)) {
    if (collapsed) {
      item.style.minHeight = "0";
      item.style.height = "auto";
    } else {
      item.style.minHeight = "";
      item.style.height = "";
    }
  }
}

// Apply saved CMR state across all dashboard items. Re-entrant and cheap:
// only sets inline display on collapsed modules, so it can be re-run every
// time the grid re-layouts (matching modules that re-render asynchronously).
function applyCMRState() {
  if (!window.handiNs || !window.getCMR) return;
  var cmr = window.getCMR();
  document.querySelectorAll(".dashboard-item").forEach(function (item) {
    var key = cmrKeyFor(item);
    if (!key) return;
    applyModuleCollapse(item, cmr[key] === 1);
  });
}

// Expose so layout.js can re-assert collapse state on every Packery re-layout.
window.applyCMRState = applyCMRState;

document.addEventListener("click", function (e) {
  var title = e.target.closest(".panel-title");
  if (!title) return;
  // The support panel is fixed/un-collapsible: leave it alone.
  var dashboardItem = title.closest(".dashboard-item");
  if (dashboardItem && dashboardItem.dataset.module === "support") return;
  // Ignore clicks on interactive controls inside the title (help button,
  // lock toggle, etc.) so they keep their own behaviour.
  if (e.target.closest("button, a, input, select, textarea")) return;

  // Determine the current collapsed state from the live class marker.
  var nowCollapsed = !dashboardItem.classList.contains("is-collapsed");

  // Apply display + class + height release together in one place, then persist.
  applyModuleCollapse(dashboardItem, nowCollapsed);
  var key = cmrKeyFor(dashboardItem);
  if (key && window.setModuleCollapsed) {
    window.setModuleCollapsed(key, nowCollapsed);
  }

  // Keep the masonry grid in sync with the new panel height.
  requestAnimationFrame(function () {
    if (window.refreshDashboardLayout) window.refreshDashboardLayout();
  });
});

// Apply saved collapse state once the dashboard items exist. Runs on
// DOMContentLoaded and again on window load / pageshow for modules that render
// late (or when the page is restored from the back/forward cache after
// navigating away to Settings and returning).
function applyCMRAndReflow() {
  applyCMRState();
  requestAnimationFrame(function () {
    if (window.refreshDashboardLayout) window.refreshDashboardLayout();
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applyCMRAndReflow);
} else {
  applyCMRAndReflow();
}
window.addEventListener("load", applyCMRAndReflow);
window.addEventListener("pageshow", applyCMRAndReflow);
