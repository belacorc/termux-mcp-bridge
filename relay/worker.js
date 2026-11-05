// Permanent link for termux-mcp-bridge (Cloudflare Worker, free plan).
// Looks up the phone's current quick-tunnel URL in your private ntfy topic and proxies requests to it.
// Your MCP link becomes: https://<worker>.<you>.workers.dev/mcp/<token>  (never changes)
// Setup: set the secret TOPIC (your ntfy topic, e.g. pb-xxxx) in the Worker settings.

let origin = null, at = 0;

async function lookup(env, force) {
  if (!force && origin && Date.now() - at < 10 * 60 * 1000) return origin;
  const r = await fetch(`https://ntfy.sh/${env.TOPIC}/json?poll=1&since=24h`, { cf: { cacheTtl: 0 } });
  const lines = (await r.text()).trim().split('\n').filter(Boolean);
  if (!lines.length) throw new Error('no link in topic');
  origin = new URL(JSON.parse(lines[lines.length - 1]).message).origin;
  at = Date.now();
  return origin;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!env.TOPIC) return new Response('TOPIC secret is not set', { status: 500 });
    if (!url.pathname.startsWith('/mcp/')) return new Response('not found', { status: 404 });
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer();
    const headers = new Headers();
    for (const h of ['content-type', 'accept', 'mcp-session-id', 'mcp-protocol-version', 'last-event-id'])
      if (req.headers.has(h)) headers.set(h, req.headers.get(h));
    for (const force of [false, true]) {
      try {
        const o = await lookup(env, force);
        const resp = await fetch(o + url.pathname + url.search, { method: req.method, headers, body });
        if (![502, 503, 530].includes(resp.status)) return resp;
      } catch (e) { /* tunnel gone or topic empty: retry with a fresh lookup */ }
    }
    return new Response(JSON.stringify({ error: 'phone is offline' }), { status: 503, headers: { 'content-type': 'application/json' } });
  },
};
