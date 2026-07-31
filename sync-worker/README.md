# start-page sync worker

A tiny [Cloudflare Worker](https://developers.cloudflare.com/workers/) + KV that
backs the start page's optional cloud sync. It is **zero-knowledge**: it only ever
stores ciphertext under an opaque id, plus a revision number and an optional TTL.
The client encrypts everything (AES-GCM, key derived from your sync code) before it
leaves the device, so the server — and anyone who can read it — never sees your
settings.

## The contract

```
POST   /api/sync         { id, ciphertext, baseRev, ttl }  -> { rev } | 409 { rev }
GET    /api/sync/:id                                        -> { ciphertext, rev } | 404
GET    /api/sync/:id/rev                                    -> { rev } | 404      (cheap freshness check)
DELETE /api/sync/:id                                        -> { ok: true }
```

- `id` — url-safe, derived client-side from your sync code (`SHA-256("id|" + code)`); the server never sees the code.
- `baseRev` — the rev you're replacing. If it no longer matches (another device pushed), you get **409** with the current `rev`; pull, then retry.
- `ttl` — seconds until expiry: `3600` (1h), `86400` (24h), or `0` = permanent (until deleted). Sliding — each push resets it.

## Deploy (first time)

You'll need a Cloudflare account and Node. From this folder:

```bash
npx wrangler login                       # opens the browser once
npx wrangler kv namespace create SYNC    # prints an id
```

Paste that id into [`wrangler.toml`](wrangler.toml) (`kv_namespaces[0].id`), then:

```bash
npx wrangler deploy
```

That gives you a `*.workers.dev` URL you can test against immediately.

### Custom subdomain (recommended)

So the client only ever knows `api.corbin.uk`:

1. In the Cloudflare dashboard for `corbin.uk`, add a proxied DNS record for `api` (an `AAAA` to `100::` is the usual placeholder for a Worker route).
2. Uncomment the `routes` block in `wrangler.toml` and `npx wrangler deploy` again.
3. Point the client at it — set `SYNC_API` in `index.html` to `https://api.corbin.uk/api`.

## Local testing

`npx wrangler dev` runs it locally with a KV simulator. The start page's sync
was also validated against a small Python stub of this exact contract (see the
project history) before this Worker existed, so the client and this Worker agree.

## Notes

- **CORS** is `*` — fine here because the data is E2E-encrypted and gated by a
  high-entropy id (no cookies, no auth to protect).
- The only abuse guard is a ciphertext **size cap** (~200KB; real blobs are a few
  KB). Cloudflare's dashboard can add rate-limiting rules if you ever want them.
- Someone would have to know your sync code to even derive your `id` — and even
  then they'd get ciphertext they can't read. A bad write would simply fail to
  decrypt on your device (and you'd re-push).

MIT, same as the rest of the project.
