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

    var result = onFiles ? onFiles(files) : null;

    function done() {
      var el = document.getElementById("tl-overlay");
      if (el) el.remove();
      input.remove();
    }

    if (result && typeof result.then === "function") {
      result.then(done, function (e) {
        if (onError) onError(e.message || "Load failed");
        done();
      });
    } else {
      setTimeout(done, 800);
    }
  });

  document.body.appendChild(input);
  input.click();
};
