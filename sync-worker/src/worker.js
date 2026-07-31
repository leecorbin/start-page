/* start-page sync — a zero-knowledge Cloudflare Worker.
 *
 * It stores ONLY ciphertext under an opaque id, with a revision counter and an
 * optional TTL. It never sees your settings — the client encrypts everything
 * (AES-GCM, key derived from your sync code) before it ever leaves the device.
 *
 * KV binding: SYNC   (see wrangler.toml)
 * Routes:
 *   POST   /api/sync            { id, ciphertext, baseRev, ttl } -> { rev } | 409 { rev }
 *   GET    /api/sync/:id                                          -> { ciphertext, rev } | 404
 *   GET    /api/sync/:id/rev                                      -> { rev } | 404
 *   DELETE /api/sync/:id                                          -> { ok: true }
 */

const MAX_CIPHERTEXT = 200 * 1024;                 // generous cap; real blobs are a few KB
const ID_RE = /^[A-Za-z0-9_-]{16,128}$/;           // client sends a hash-derived, url-safe id

const CORS = {
  "Access-Control-Allow-Origin": "*",              // data is E2E-encrypted and id-gated; no cookies/auth
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    const parts = new URL(request.url).pathname.replace(/^\/+|\/+$/g, "").split("/");   // api / sync / :id? / rev?
    if (parts[0] !== "api" || parts[1] !== "sync") return json({ error: "not_found" }, 404);
    const id = parts[2];
    const key = id ? "s:" + id : null;

    // ---- POST /api/sync : create or update (compare-and-swap on rev) ----
    if (request.method === "POST" && !id) {
      let body;
      try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400); }
      const bid = body && body.id, ct = body && body.ciphertext;
      if (typeof bid !== "string" || !ID_RE.test(bid)) return json({ error: "bad_id" }, 400);
      if (typeof ct !== "string" || ct.length === 0) return json({ error: "bad_blob" }, 400);
      if (ct.length > MAX_CIPHERTEXT) return json({ error: "too_large" }, 413);

      const existing = await env.SYNC.get("s:" + bid);
      const curRev = existing ? (JSON.parse(existing).rev || 0) : 0;
      if (curRev && body.baseRev !== curRev) return json({ error: "conflict", rev: curRev }, 409);   // stale → pull first

      const rev = curRev + 1;
      const opts = {};
      const ttl = Number(body.ttl) || 0;             // 0 = permanent (until deleted); else sliding expiry (min 60s)
      if (ttl >= 60) opts.expirationTtl = ttl;
      await env.SYNC.put("s:" + bid, JSON.stringify({ ciphertext: ct, rev }), opts);
      return json({ rev });
    }

    // ---- GET /api/sync/:id/rev : cheap freshness check ----
    if (request.method === "GET" && id && parts[3] === "rev") {
      const v = await env.SYNC.get(key);
      return v ? json({ rev: JSON.parse(v).rev || 0 }) : json({ error: "not_found" }, 404);
    }

    // ---- GET /api/sync/:id : fetch the blob ----
    if (request.method === "GET" && id) {
      const v = await env.SYNC.get(key);
      if (!v) return json({ error: "not_found" }, 404);
      const { ciphertext, rev } = JSON.parse(v);
      return json({ ciphertext, rev: rev || 0 });
    }

    // ---- DELETE /api/sync/:id ----
    if (request.method === "DELETE" && id) {
      await env.SYNC.delete(key);
      return json({ ok: true });
    }

    return json({ error: "not_found" }, 404);
  },
};
