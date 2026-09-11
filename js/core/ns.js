/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// js/core/ns.js
// Storage namespace helper — scopes localStorage keys (and IndexedDB names)
// per handi-pack so loading one pack (or the default dashboard) cannot
// overwrite another's settings/data on the shared origin.
//
// Namespace shape:  handi_<pack>_<salt>_<key>
//   - "handi"        fixed prefix so keys stay greppable and never collide
//                    with third-party code.
//   - <pack>         a stable, URL-file-safe identifier for the active pack
//                    ("default" when no pack link is loaded).
//   - <salt>         a random alphanumeric token, generated once and persisted
//                    so it stays stable across sessions (a regenerated salt
//                    would orphan all previously stored data).
//
// The salt itself and the pack-identity keys are deliberately stored UNPREFIXED:
// the salt must be readable before the namespace is known, and pack identity is
// what defines the namespace in the first place (chicken-and-egg).

(function () {
  "use strict";

  var SALT_KEY = "handi_ns_salt";
  var NS_KEY = "handi_ns"; // cache of the resolved namespace (for reads in modules)

  var _salt = null;
  var _namespace = null;

  function randomSalt(len) {
    var chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var out = "";
    if (window.crypto && crypto.getRandomValues) {
      var buf = new Uint8Array(len || 8);
      crypto.getRandomValues(buf);
      for (var i = 0; i < buf.length; i++) {
        out += chars.charAt(buf[i] % chars.length);
      }
    } else {
      for (var i = 0; i < (len || 8); i++) {
        out += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    return out;
  }

  function getSalt() {
    if (_salt) return _salt;
    try {
      _salt = localStorage.getItem(SALT_KEY);
    } catch (e) {
      _salt = null;
    }
    if (!_salt) {
      _salt = randomSalt(8);
      try {
        localStorage.setItem(SALT_KEY, _salt);
      } catch (e) {
        /* best effort */
      }
    }
    return _salt;
  }

  // Turn a human pack name (or fallback) into a URL/file-safe token.
  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // Resolve the active pack token, in priority order:
  //   1. URL ?handi-pack= (the pack link currently loading)
  //   2. persisted handiPackName (a previously-loaded pack)
  //   3. "default"
  // The HMAC `id` is omitted intentionally — it is a signature that varies with
  // the link's query params, so it is not a stable namespace token.
  function getPackToken() {
    try {
      var qs = new URLSearchParams(window.location.search);
      var fromUrl = qs.get("handi-pack");
      if (fromUrl) {
        var s = slugify(fromUrl);
        if (s) return s;
      }
    } catch (e) {}
    try {
      var name = localStorage.getItem("handiPackName");
      var s2 = slugify(name);
      if (s2) return s2;
    } catch (e) {}
    return "default";
  }

  function resolve() {
    if (_namespace) return _namespace;
    _namespace = "handi_" + getPackToken() + "_" + getSalt();
    return _namespace;
  }

  function raw(key) {
    return resolve() + "_" + key;
  }

  // Expose a global (used by plain scripts that can't import ES modules).
  window.handiNs = {
    get: function (key) {
      try {
        return localStorage.getItem(raw(key));
      } catch (e) {
        return null;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(raw(key), String(value));
        return true;
      } catch (e) {
        return false;
      }
    },
    remove: function (key) {
      try {
        localStorage.removeItem(raw(key));
      } catch (e) {}
    },
    raw: raw,
    key: function (key) {
      return raw(key);
    },
  };
})();
