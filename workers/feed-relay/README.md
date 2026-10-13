# Feed Relay (Cloudflare Worker)

A free, self-hosted CORS + IP relay for RSS/Atom feeds.

**Why:** Codeberg and GitHub both 403 this app's cloud IP *and* omit
`Access-Control-Allow-Origin`, so neither the server nor the browser can read
their feeds. This Worker fetches from Cloudflare's IP (not blocked) and re-emits
the body with `Access-Control-Allow-Origin: *`, letting the browser consume the
feed directly — no paid proxy needed.

## Deploy (once)

```bash
# from this directory
npm install -g wrangler        # or: npx wrangler
wrangler login                 # opens Cloudflare auth in your browser
wrangler deploy
```

`wrangler deploy` prints a URL like:

```
https://handi-feed-relay.<your-subdomain>.workers.dev
```

## Use

```
GET https://handi-feed-relay.<your-subdomain>.workers.dev/?url=<url-encoded-feed>
```

Example:

```
https://handi-feed-relay.<your-subdomain>.workers.dev/?url=https%3A%2F%2Fcodeberg.org%2Fhandi.rss
```

## Wiring it into the app

Set the base URL in the server's `.env`:

```
FEED_RELAY_URL=https://handi-feed-relay.<your-subdomain>.workers.dev
```

Then the app falls back to `FEED_RELAY_URL/?url=...` whenever a direct fetch is
blocked, and the Codeberg modules call it directly from the browser (falling
back to the server `/api/feed` path if it isn't configured).

## Security notes

- Only `http(s)` URLs whose host ends in `.codeberg.org`, `.github.com`, or
  `.githubusercontent.com` **and** whose path looks like a feed (`.rss`,
  `.atom`, `.xml`, or `/feed`) are proxied. This is not an open proxy.
- The Worker adds CORS for everyone deliberately — feeds are public documents;
  expose it only at a URL you don't mind others using (rate limits apply).
