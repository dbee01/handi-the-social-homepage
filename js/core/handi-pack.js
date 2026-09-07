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
//   &text-font=...&header-font=...&flipboard-user=...&background-image=...&...
//   &elements=gallery,chat,social&weather-location=...&radio=...&...
//   &sports=loi,premier-league   (league selection for the sports module)
//
// This script runs early (before theme CSS), writes the mapped values into
// localStorage (handiSettings, handiMasterModules, handiCustomTheme,
// handiBgDataUrl, handiPackModules and pack metadata), then redirects to a
// clean URL so the normal app bootstrap picks everything up.
//
// handiPackModules (JSON array) is the list of module ids the pack turns on.
// It is only written when the pack carries a valid admin signature, so an
// admin-built link unlocks exactly the elements it included — every other
// premium module stays locked for free users.

(async function () {
  "use strict";

  try {
    var qs = new URLSearchParams(window.location.search);
    var hasPack = qs.has("handi-pack") || qs.has("elements") || qs.has("colors");
    if (!hasPack) return;

    // Pack id stamp secrets. The public builder (builder.html) signs with
    // PACK_SECRET; the admin builder (builder-admin.html) signs with
    // PACK_SECRET_ADMIN. A valid admin signature unlocks premium modules
    // for free users (settings / selector / dashboard honour handiPackAdmin).
    var PACK_SECRET = "handihomepage-handi-pack-v1";
    var PACK_SECRET_ADMIN = "handihomepage-handi-pack-admin-v1";

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

    // Parse "Name: number" contact lines from a pack parameter.
    function parseContactLines(str) {
      return (str || "")
        .split(/\r?\n/)
        .map(function (line) {
          line = (line || "").trim();
          if (!line) return null;
          var i = line.indexOf(":");
          if (i <= 0) return { name: line, number: line };
          return {
            name: line.slice(0, i).trim(),
            number: line.slice(i + 1).trim(),
          };
        })
        .filter(Boolean);
    }

    // Verify the pack id stamp: recompute the HMAC over the sorted query
    // (minus id) with both secrets. An admin-secret match proves the link
    // came from builder-admin.html and premium modules may be unlocked.
    // Returns true when the admin signature matched (and only then does the
    // pack get to grant premium modules).
    async function stampPackId(qs) {
      var packId = qs.get("id");
      if (!packId || !window.crypto || !crypto.subtle) return false;
      var matchedAdmin = false;
      try {
        var canonical = new URLSearchParams(qs);
        canonical.delete("id");
        canonical.sort();
        var canonicalStr = canonical.toString();
        var enc = new TextEncoder();
        var candidates = [
          { secret: PACK_SECRET_ADMIN, flag: "handiPackAdmin" },
          { secret: PACK_SECRET, flag: "handiPackVerified" },
        ];
        for (var i = 0; i < candidates.length; i++) {
          var key = await crypto.subtle.importKey(
            "raw",
            enc.encode(candidates[i].secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
          );
          var sig = await crypto.subtle.sign(
            "HMAC",
            key,
            enc.encode(canonicalStr)
          );
          var hex = Array.from(new Uint8Array(sig))
            .map(function (b) { return b.toString(16).padStart(2, "0"); })
            .join("");
          if (hex === packId) {
            try { localStorage.setItem(candidates[i].flag, "1"); } catch (e) {}
            if (candidates[i].flag === "handiPackAdmin") {
              matchedAdmin = true;
              try { localStorage.setItem("handiPackVerified", "1"); } catch (e) {}
            }
          }
        }
      } catch (e) { /* verification is best-effort */ }
      return matchedAdmin;
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

    // Flipboard: accept both the original flipboard-* names and the shorter
    // flip / flip-profile names. The `flip` param is always a topic — it is
    // written to the topic slot only; the flip module passes a full URL
    // through verbatim (no flipboard.com prefix added) and only prefixes
    // bare topic words. `flipboard-user` is a profile (e.g. a bare username
    // or @user) and maps to the same slot as flipboard-profile.
    if ((v = qs.get("flipboard-topic"))) ensure("flip").topicUrl = v;
    if ((v = qs.get("flipboard-profile"))) ensure("flip").profileUrl = v;
    if ((v = qs.get("flipboard-user"))) ensure("flip").profileUrl = v;
    if ((v = qs.get("flip"))) ensure("flip").topicUrl = v;
    if ((v = qs.get("flip-profile"))) ensure("flip").profileUrl = v;

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
    // Raw HTML for the support element on the homepage (overrides the default
    // welcome block when present). A bare `support=1` is just the enable flag
    // and must never be rendered as HTML.
    if ((v = qs.get("support")) && v !== "1") ensure("support").html = v;
    if (supportImage || supportTitle || supportDesc || supportLink) {
      var support = ensure("support");
      // Drop any stale raw-HTML override (e.g. a pre-fix visit stored the
      // bare support=1 flag as html) so the configured resource renders.
      delete support.html;
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
    if ((v = qs.get("podcasts") || qs.get("cast"))) ensure("cast").streamUrl = v;

    // Newsletter — RSS feed URL for the newsletter module (no default feed;
    // the module shows a configure prompt until one is set). Enables the
    // module just like the other feed params.
    if ((v = qs.get("newsletter"))) {
      ensure("newsletter").feedUrl = v;
    }

    // Radio stream or feed URL, optionally labelled "Station Name:url". The
    // name is kept in settings.radio.streamName so the Radio module can label
    // the row instead of the generic "Live Stream". The raw URL is also kept
    // in its own key so the Radio module knows this URL came from a handi-pack
    // link (only those are parsed as station feeds — see
    // modules/radio/radio.module.js).
    if ((v = qs.get("radio"))) {
      var radioUrl = v;
      var radioName = "";
      // Split "Name:https://…" at the last colon before the scheme so names
      // containing colons still work and bare URLs pass through untouched.
      var schemeColon = v.indexOf("://");
      var sep = schemeColon > 0 ? v.lastIndexOf(":", schemeColon - 1) : -1;
      if (sep > 0) {
        radioName = v.slice(0, sep).trim();
        radioUrl = v.slice(sep + 1).trim();
      }
      ensure("radio").streamUrl = radioUrl;
      if (radioName) ensure("radio").streamName = radioName;
      try { localStorage.setItem("handiRadioPackFeed", radioUrl); } catch (e) {}
    }

    // Alternative: separate radio-url / radio-name parameters. The URL may
    // arrive with a stray leading colon (":https://…") from pack builders
    // that joined "name:url" — strip it if present.
    if ((v = qs.get("radio-url"))) {
      v = v.replace(/^:\s*/, "").trim();
      ensure("radio").streamUrl = v;
      try { localStorage.setItem("handiRadioPackFeed", v); } catch (e) {}
    }
    if ((v = qs.get("radio-name"))) {
      ensure("radio").streamName = v;
    }

    // Sports — live football. Value is a comma-separated league selection:
    // API-Football league ids ("sports=357,358") or friendly slugs
    // ("sports=loi,premier-league"). A bare "sports=1" / "sports=" just
    // enables the module with its default (League of Ireland).
    var SPORTS_LEAGUE_ALIASES = {
      "league-of-ireland-premier-division": "357",
      "league-of-ireland-first-division": "358",
      "league-of-ireland": "357,358",
      loi: "357,358",
      "champions-league": "2",
      "uefa-champions-league": "2",
      "europa-league": "3",
      "uefa-europa-league": "3",
      "premier-league": "39",
      "efl-championship": "40",
      championship: "40",
      "serie-a": "135",
      "la-liga": "140",
      bundesliga: "78",
      "ligue-1": "61",
      eredivisie: "88",
      "primeira-liga": "94",
      "scottish-premiership": "179",
      "super-lig": "203",
      mls: "253",
      "brasileirao-serie-a": "71",
      "liga-profesional-argentina": "128",
      "liga-mx": "262",
      "k-league-1": "292",
      "j1-league": "98",
      allsvenskan: "113",
      "saudi-pro-league": "307",
    };
    if (qs.has("sports")) {
      var sportsIds = [];
      String(qs.get("sports") || "")
        .split(",")
        .forEach(function (tok) {
          tok = (tok || "").trim().toLowerCase().replace(/\s+/g, "-");
          if (!tok || tok === "1") return;
          if (/^\d+$/.test(tok)) {
            if (sportsIds.indexOf(tok) === -1) sportsIds.push(tok);
            return;
          }
          var mapped = SPORTS_LEAGUE_ALIASES[tok];
          if (mapped) {
            mapped.split(",").forEach(function (id) {
              if (sportsIds.indexOf(id) === -1) sportsIds.push(id);
            });
          }
        });
      if (sportsIds.length) ensure("sports").leagueIds = sportsIds.join(",");
    }

    // Premium modules (admin-signed packs): bus, calendar, phone, emergency.
    if ((v = qs.get("bus-routes"))) {
      var bus = ensure("live_bus");
      bus.routeIds = v;
      bus.stopIds = v;
    }
    if ((v = qs.get("calendar"))) ensure("calendar").url = v;
    if ((v = qs.get("phone-contacts"))) {
      ensure("phone").contacts = parseContactLines(v);
    }
    if ((v = qs.get("emergency-contacts"))) {
      ensure("emergency_alert").contacts = parseContactLines(v);
    }
    if ((v = qs.get("sports"))) {
      ensure("sports").leagues = v;
    }

    writeJson("handiSettings", settings);

    // ---------------------------------------------------------------------
    // MMR (which modules are shown) from the `elements` list, plus any
    // module that is configured by a dedicated pack parameter (e.g. `podcasts`
    // enables the cast module even if `elements` forgot to list it).
    // ---------------------------------------------------------------------
    var elementsRaw = qs.get("elements");
    var autoModules = [];
    // Module ids the pack turns on. Only persisted (as "handiPackModules")
    // when the pack is admin-signed, so premium unlocks are limited to the
    // exact elements the pack included.
    var grantedModules = null;
    if (qs.get("radio") || qs.get("radio-url")) autoModules.push("radio");
    if (qs.get("news")) autoModules.push("news");
    if (
      qs.get("flipboard-topic") ||
      qs.get("flipboard-profile") ||
      qs.get("flipboard-user") ||
      qs.get("flip") ||
      qs.get("flip-profile")
    )
      autoModules.push("flip");
    if (qs.get("social-server") || qs.get("social-hashtag") || qs.get("social-profile"))
      autoModules.push("social");
    if (qs.get("matrix-server") || qs.get("chat-rooms"))
      autoModules.push("chat");
    if (
      qs.get("support-image") ||
      qs.get("support-image-title") ||
      qs.get("support-description") ||
      qs.get("support-link-url") ||
      qs.get("support")
    )
      autoModules.push("support");
    if (qs.get("gallery")) autoModules.push("gallery");
    if (qs.get("music")) autoModules.push("music");
    if (qs.get("podcasts") || qs.get("cast")) autoModules.push("cast");
    if (qs.has("newsletter")) autoModules.push("newsletter");
    if (qs.get("bus-routes")) autoModules.push("live_bus");
    if (qs.get("calendar")) autoModules.push("calendar");
    if (qs.get("phone-contacts")) autoModules.push("phone");
    if (qs.get("emergency-contacts")) autoModules.push("emergency_alert");
    if (qs.get("sports")) autoModules.push("sports");
    if (qs.has("sports")) autoModules.push("sports");

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
        "newsletter",
        "phone",
        "live_bus",
        "emergency_alert",
        "support",
        "sports",
      ];
      var idMap = {
        bus: "live_bus",
        emergency: "emergency_alert",
        podcasts: "cast",
        flipboard: "flip",
      };

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
      grantedModules = Object.keys(next).filter(function (id) {
        return next[id] === 1;
      });
    }

    // ---------------------------------------------------------------------
    // Theme (colors + fonts) and background image
    // ---------------------------------------------------------------------
    var colorsRaw = qs.get("colors");
    var fontRaw = qs.get("font");
    var textFont = qs.get("text-font");
    var headerFont = qs.get("header-font");
    if (colorsRaw || fontRaw || textFont || headerFont) {
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
      if (textFont) css += "  --text-font: " + textFont + ";\n";
      if (headerFont) css += "  --header-font: " + headerFont + ";\n";
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
    // Admin-signed pack grants: unlock premium access to ONLY the modules it
    // actually includes. Persist that grant list so settings / selector /
    // dashboard can keep every other premium module locked. A non-admin
    // (or unsigned) pack revokes any previous grant list.
    // ---------------------------------------------------------------------
    var adminVerified = await stampPackId(qs);
    if (adminVerified && grantedModules) {
      try {
        localStorage.setItem("handiPackModules", JSON.stringify(grantedModules));
      } catch (e) {}
    } else {
      try { localStorage.removeItem("handiPackModules"); } catch (e) {}
    }

    // NOTE: no reload / clean-URL redirect here. All pack state is written to
    // localStorage synchronously above, and the theme + module bootstrap reads
    // localStorage afterwards on this same page load — so a reload is not
    // needed. Keeping the pack URL also lets the server keep serving the
    // correct per-pack manifest / SEO tags on every load.
  } catch (e) {
    console.error("Handi Pack import failed:", e);
  }
})();
