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

    // Build spinner directly on body
    var overlay = document.createElement("div");
    overlay.id = "tl-overlay";
    overlay.setAttribute("style",
      "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483647;" +
      "display:flex;align-items:center;justify-content:center");
    overlay.innerHTML =
      "<div style=\"background:#fff;border-radius:18px;padding:40px 56px;" +
      "text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.3);font-family:sans-serif\">" +
      "<div style=\"width:44px;height:44px;border:5px solid #e2e8f0;" +
      "border-top-color:#0047cc;border-radius:50%;margin:0 auto 18px;" +
      "animation:tl-spin .7s linear infinite\"></div>" +
      "<p style=\"margin:0;font-size:1.1rem;font-weight:600;color:#1e293b\">" +
      "Loading " + raw.length + " file" + (raw.length > 1 ? "s" : "") + "…</p></div>";
    document.body.appendChild(overlay);

    // Force layout so overlay paints
    overlay.offsetHeight;

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
document.addEventListener("click", function (e) {
  var title = e.target.closest(".panel-title");
  if (!title) return;
  // Ignore clicks on interactive controls inside the title (help button,
  // lock toggle, etc.) so they keep their own behaviour.
  if (e.target.closest("button, a, input, select, textarea")) return;

  // The header is the title itself, or the header-row that wraps it.
  var header = title;
  var parent = title.parentElement;
  if (parent && /-header-row$/.test(parent.className || "")) {
    header = parent;
  }

  var siblings = [];
  var el = header.nextElementSibling;
  while (el) {
    siblings.push(el);
    el = el.nextElementSibling;
  }
  if (!siblings.length) return;

  var collapsed = siblings[0].style.display === "none";
  siblings.forEach(function (s) {
    s.style.display = collapsed ? "" : "none";
  });

  // Keep the masonry grid in sync with the new panel height.
  requestAnimationFrame(function () {
    if (window.refreshDashboardLayout) window.refreshDashboardLayout();
  });
});
