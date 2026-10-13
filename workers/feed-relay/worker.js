/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 *
 * workers/feed-relay/worker.js
 *
 * Free CORS + IP relay for RSS/Atom feeds.
 *
 * Codeberg (and GitHub) 403 this app's cloud IP on direct requests AND omit
 * `Access-Control-Allow-Origin`, so the browser can neither fetch the feed
 * nor read it cross-origin. This Cloudflare Worker solves both:
 *
 *   1. It fetches the target feed from Cloudflare's own IP ranges (which
 *      Codeberg does not block), sidestepping the datacenter-IP 403.
 *   2. It re-emits the response with `Access-Control-Allow-Origin: *`, so the
 *      browser can consume it directly with a plain `fetch()`.
 *
 * Usage (server-side via /api/feed, or directly from the browser):
 *
 *   GET /?url=https%3A%2F%2Fcodeberg.org%2Fhandi.rss
 *
 * Only http(s) URLs are proxied. All other requests get a short error.
 */

// Restrict to the feed formats we actually relay. Anything broader turns this
// into an open proxy, which Cloudflare and the target hosts will clamp down on.
const ALLOWED_EXT = /\.(rss|atom|xml)(\?|$)/i;
const ALLOWED_HOST_SUFFIXES = [
  ".codeberg.org",
  ".github.com",
  ".githubusercontent.com",
];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    // CORS preflight + the header every response carries.
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "method not allowed" }, 405, cors);
    }

    if (!target || !looksLikeFeed(target)) {
      return json(
        { error: "missing or disallowed ?url= (only http(s) RSS/Atom/XML feeds are proxied)" },
        400,
        cors,
      );
    }

    try {
      const upstream = await fetch(target, {
        method: request.method,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/atom+xml, application/rss+xml, application/xml, text/xml, */*",
        },
      });

      // Pass through the status/headers so callers can detect 403/404/etc.,
      // but stamp on the CORS allow so the browser can read everything.
      const headers = new Headers(upstream.headers);
      for (const [k, v] of Object.entries(cors)) headers.set(k, v);
      headers.set("X-Feed-Relay", "cloudflare");

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      });
    } catch (err) {
      return json({ error: "upstream fetch failed", detail: String(err) }, 502, cors);
    }
  },
};

function looksLikeFeed(target) {
  try {
    const u = new URL(target);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;

    const host = u.hostname.toLowerCase();
    const hostOk = ALLOWED_HOST_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s));
    if (!hostOk) return false;

    // Require an obvious feed path when the host isn't one we implicitly trust.
    return ALLOWED_EXT.test(u.pathname) || u.pathname.includes("/feed");
  } catch {
    return false;
  }
}

function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}
