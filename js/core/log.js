/*
 * Copyright (c) 2026 Handi Homepage
 * Client-side logging utility — sends events to server log.txt
 * Usage: logEvent(level, event, details)
 *   level: 1 = important, 2 = verbose
 */

(function () {
  // Anonymous session ID — persists for the browser session
  var sid = null;
  try {
    sid = sessionStorage.getItem("_hh_sid");
  } catch (e) {}
  if (!sid) {
    sid = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    try { sessionStorage.setItem("_hh_sid", sid); } catch (e) {}
  }

  window.logEvent = function (level, event, details) {
    try {
      fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: level || 1,
          event: event,
          details: details || {},
          sid: sid,
        }),
      }).catch(function () {
        // Silently fail — don't break the UI if server is unreachable
      });
    } catch (e) {}
  };
})();
