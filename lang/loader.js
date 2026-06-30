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
    location.reload();
  };

  // Translation helper — call t("key", "English fallback")
  window.t = function (key, english) {
    if (window.LANG && window.LANG[key] != null && window.LANG[key] !== "")
      return window.LANG[key];
    return english || key;
  };
})();
