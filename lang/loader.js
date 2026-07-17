/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// ple/lang/loader.js — synchronously loads the right language file
(function () {
  var lang = "en";
  try {
    lang = localStorage.getItem("handiLang") || "en";
  } catch (e) {}

  // Synchronous load so LANG is available before modules init
  document.write('<script src="/lang/' + lang + '.js"><\/script>');

  // Expose for other scripts
  window.handiLang = lang;
  window.setHandiLang = function (code) {
    try {
      localStorage.setItem("handiLang", code);
    } catch (e) {}
    window.logEvent && window.logEvent(2, "language_change", { lang: code });
    location.reload();
  };

  // Translation helper — call t("key", "English fallback")
  window.t = function (key, english) {
    if (window.LANG && window.LANG[key] != null && window.LANG[key] !== "")
      return window.LANG[key];
    return english || key;
  };
})();
