// POST /api/shorten  { q, d, t }  ->  { ok, code, url }
// Membuat kode pendek 5 karakter dan menyimpannya di KV.

const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'; // tanpa 0/O/1/I/l
const VALID_DEST = new Set(['google', 'aimode', 'youtube', 'pinterest']);

// Template yang didukung. 'google' = animasi Google lama (default).
const VALID_TPL = new Set(['google', 'captcha', 'receipt', 'force']);

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400); }

  const q = typeof body?.q === 'string' ? body.q.trim().slice(0, 500) : '';
  if (!q) return json({ ok: false, error: 'empty_query' }, 400);

  const d = VALID_DEST.has(body?.d) ? body.d : 'google';
  const t = VALID_TPL.has(body?.t) ? body.t : 'google';

  // Cari kode unik (hindari tabrakan)
  let code = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const buf = new Uint8Array(5);
    crypto.getRandomValues(buf);
    let candidate = '';
    for (let i = 0; i < 5; i++) candidate += ALPHABET[buf[i] % ALPHABET.length];
    const existing = await env.LINKS.get(candidate);
    if (existing === null) { code = candidate; break; }
  }
  if (!code) return json({ ok: false, error: 'too_many_collisions' }, 500);

  await env.LINKS.put(code, JSON.stringify({ q, d, t, ts: Date.now() }));

  const url = new URL('/' + code, request.url).href;
  return json({ ok: true, code, url });
}

export function onRequest() {
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
