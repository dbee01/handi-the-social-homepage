/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// js/core/handi-pack.js
// Turns a "Handi Pack" URL into a fully-configured dashboard + MMR.
//
// A pack link looks like:
//   /?handi-pack=Name&description=...&colors=c1|c2|c3|c4|c5&font=f1|f2&...
//   &elements=gallery,chat,social&weather-location=...&radio=...&...
//
// This script runs early (before theme CSS), writes the mapped values into
// localStorage (handiSettings, handiMasterModules, handiCustomTheme,
// handiBgDataUrl, and pack metadata), then redirects to a clean URL so the
// normal app bootstrap picks everything up.

(function () {
  "use strict";

  try {
    var qs = new URLSearchParams(window.location.search);
    var hasPack = qs.has("handi-pack") || qs.has("elements") || qs.has("colors");
    if (!hasPack) return;

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------
    function readJson(key) {
      try {
        return JSON.parse(localStorage.getItem(key) || "{}");
      } catch (e) {
        return {};
      }
    }

    function writeJson(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    }

    var settings = readJson("handiSettings");

    function ensure(key) {
      if (!settings[key] || typeof settings[key] !== "object") settings[key] = {};
      return settings[key];
    }

    // ---------------------------------------------------------------------
    // Settings (per-module configuration)
    // ---------------------------------------------------------------------
    var v;

    // Language pre-selection for the dashboard (e.g. lang=ga). Saved before
    // /lang/loader.js runs so the redirected page loads the right language.
    if ((v = qs.get("lang"))) {
      v = v.trim().toLowerCase();
      var langCodes = [
        "ar", "cy", "de", "en", "es", "fr", "ga", "it", "nl", "pl", "pt",
      ];
      if (langCodes.indexOf(v) !== -1) {
        try {
          localStorage.setItem("handiLang", v);
        } catch (e) {}
      }
    }

    if ((v = qs.get("weather-location"))) {
      ensure("weather").location = v;
    }

    if ((v = qs.get("news"))) {
      ensure("news").rssUrl = v;
      try { localStorage.setItem("handiNewsFeed", v); } catch (e) {}
    }

    if ((v = qs.get("flipboard-topic"))) ensure("flip").topicUrl = v;
    if ((v = qs.get("flipboard-profile"))) ensure("flip").profileUrl = v;

    // Mastodon / social
    var socialServer = qs.get("social-server");
    var socialHashtag = qs.get("social-hashtag");
    var socialProfile = qs.get("social-profile");
    if (socialServer || socialHashtag || socialProfile) {
      var social = ensure("social");
      if (socialServer) {
        var srv = socialServer.trim();
        if (!/^https?:\/\//i.test(srv)) srv = "https://" + srv;
        social.instance = srv;
      }
      if (socialHashtag) {
        social.hashtag = socialHashtag;
        social.feedType = "hashtag";
      } else if (socialProfile) {
        var p = socialProfile.trim();
        try {
          var pu = new URL(p);
          p =
            "@" +
            pu.pathname.replace(/^\/+/, "").replace(/^@/, "") +
            "@" +
            pu.hostname;
        } catch (e) {}
        social.profile = p;
        social.feedType = "profile";
      }
    }

    // Matrix / chat
    var matrixServer = qs.get("matrix-server");
    var chatRooms = qs.get("chat-rooms");
    if (matrixServer || chatRooms) {
      var chat = ensure("chat");
      if (matrixServer) chat.homeserver = matrixServer;
      if (chatRooms) {
        chat.rooms = chatRooms
          .split(/\r?\n/)
          .map(function (s) { return s.trim(); })
          .filter(Boolean);
      }
    }

    // Support
    var supportImage = qs.get("support-image");
    var supportTitle = qs.get("support-image-title");
    var supportDesc = qs.get("support-description");
    var supportLink = qs.get("support-link-url");
    if (supportImage || supportTitle || supportDesc || supportLink) {
      var support = ensure("support");
      if (supportImage) {
        support.imageUrl = supportImage;
        support.mediaType = "image";
      }
      if (supportTitle) support.imageTitle = supportTitle;
      if (supportDesc) support.description = supportDesc;
      if (supportLink) support.linkUrl = supportLink;
    }

    // Gallery (Pixelfed), music / podcasts / radio streams
    if ((v = qs.get("gallery"))) ensure("gallery").pixelfedUrl = v;
    if ((v = qs.get("music"))) ensure("music").streamUrl = v;
    if ((v = qs.get("podcasts"))) ensure("cast").streamUrl = v;
    if ((v = qs.get("radio"))) ensure("radio").streamUrl = v;

    writeJson("handiSettings", settings);

    // ---------------------------------------------------------------------
    // MMR (which modules are shown) from the `elements` list, plus any
    // module that is configured by a dedicated pack parameter (e.g. `podcasts`
    // enables the cast module even if `elements` forgot to list it).
    // ---------------------------------------------------------------------
    var elementsRaw = qs.get("elements");
    var autoModules = [];
    if (qs.get("radio")) autoModules.push("radio");
    if (qs.get("news")) autoModules.push("news");
    if (qs.get("flipboard-topic") || qs.get("flipboard-profile"))
      autoModules.push("flip");
    if (qs.get("social-server") || qs.get("social-hashtag") || qs.get("social-profile"))
      autoModules.push("social");
    if (qs.get("matrix-server") || qs.get("chat-rooms"))
      autoModules.push("chat");
    if (
      qs.get("support-image") ||
      qs.get("support-image-title") ||
      qs.get("support-description") ||
      qs.get("support-link-url")
    )
      autoModules.push("support");
    if (qs.get("gallery")) autoModules.push("gallery");
    if (qs.get("music")) autoModules.push("music");
    if (qs.get("podcasts")) autoModules.push("cast");

    if (elementsRaw || autoModules.length) {
      // Keep this list in sync with js/core/module-registry.js.
      var knownIds = [
        "gallery",
        "music",
        "radio",
        "news",
        "social",
        "calendar",
        "chat",
        "task",
        "flip",
        "llm",
        "cast",
        "phone",
        "live_bus",
        "emergency_alert",
        "support",
      ];
      var idMap = { bus: "live_bus", emergency: "emergency_alert" };

      var mmr = readJson("handiMasterModules");
      // Include any module IDs we already know about so they get reset too.
      Object.keys(mmr).forEach(function (id) {
        if (knownIds.indexOf(id) === -1) knownIds.push(id);
      });

      // Build the MMR from scratch: everything off, then the pack's modules on.
      var next = {};
      knownIds.forEach(function (id) {
        next[id] = 0;
      });
      if (elementsRaw) {
        elementsRaw.split(",").forEach(function (el) {
          el = el.trim();
          if (!el) return;
          var key = idMap[el] || el;
          next[key] = 1;
        });
      }
      autoModules.forEach(function (id) {
        next[id] = 1;
      });
      writeJson("handiMasterModules", next);
    }

    // ---------------------------------------------------------------------
    // Theme (colors + fonts) and background image
    // ---------------------------------------------------------------------
    var colorsRaw = qs.get("colors");
    var fontRaw = qs.get("font");
    if (colorsRaw || fontRaw) {
      var css = ":root {\n";
      if (colorsRaw) {
        var c = colorsRaw.split("|").map(function (x) { return x.trim(); });
        // Order: primary, secondary, tertiary, text, background
        if (c[0]) {
          css += "  --primary: " + c[0] + ";\n";
          css += "  --primary-soft: " + c[0] + "15;\n";
          css += "  --primary-dark: " + c[0] + ";\n";
        }
        if (c[1]) css += "  --secondary: " + c[1] + ";\n";
        if (c[2]) css += "  --tertiary: " + c[2] + ";\n";
        if (c[3]) css += "  --text: " + c[3] + ";\n";
        if (c[4]) css += "  --bg: " + c[4] + ";\n  --surface: " + c[4] + ";\n";
      }
      if (fontRaw) {
        var f = fontRaw.split("|").map(function (x) { return x.trim(); });
        if (f[0]) css += "  --text-font: " + f[0] + ";\n";
        if (f[1]) css += "  --header-font: " + f[1] + ";\n";
      }
      css += "}\n";
      try { localStorage.setItem("handiCustomTheme", css); } catch (e) {}
    }

    var bgImage = qs.get("background-image");
    if (bgImage) {
      try { localStorage.setItem("handiBgDataUrl", bgImage); } catch (e) {}
    }

    // ---------------------------------------------------------------------
    // Pack metadata (used for header branding / title)
    // ---------------------------------------------------------------------
    try {
      // Prevent the first-visit redirect to /selector.html from hijacking a pack link.
      localStorage.setItem("handiPopupShown", "true");
      if (qs.get("handi-pack")) localStorage.setItem("handiPackName", qs.get("handi-pack"));
      if (qs.get("description")) localStorage.setItem("handiPackDescription", qs.get("description"));
      if (qs.get("id")) localStorage.setItem("handiPackId", qs.get("id"));
      if (qs.get("logo")) localStorage.setItem("handiPackLogo", qs.get("logo"));
      if (qs.get("homepage")) localStorage.setItem("handiPackHomepage", qs.get("homepage"));
    } catch (e) {}

    // ---------------------------------------------------------------------
    // Reload on a clean URL so theme CSS + module bootstrap see the new state
    // ---------------------------------------------------------------------
    window.location.replace(window.location.pathname || "/");
  } catch (e) {
    console.error("Handi Pack import failed:", e);
  }
})();
