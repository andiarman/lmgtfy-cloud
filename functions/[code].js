// GET /:code  ->  HTML template yang sesuai, dengan data link
// disuntik ke window.__SHORT__. Fallback ke homepage bila kode tak ada.

// template -> file di root public/
const TEMPLATE_FILE = {
  google:  '/index.html',
  captcha: '/t/captcha.html',
  receipt: '/t/receipt.html',
  force:   '/t/force.html'
};

export async function onRequestGet(context) {
  const { request, env, params } = context;

  const code = String(params.code || '').toLowerCase();
  const goHome = () => env.ASSETS.fetch(new URL('/', request.url));

  // Request yang menyerupai file statis (punya ekstensi) langsung lempar ke aset.
  // Ini mencegah /favicon.ico dll tertelan route /:code.
  if (code.includes('.')) {
    return env.ASSETS.fetch(request);
  }

  // Hanya kode 1-5 karakter dari alfabet kita
  if (!/^[2-9a-z]{1,5}$/.test(code)) return goHome();

  const rec = await env.LINKS.get(code, 'json');
  if (!rec || typeof rec.q !== 'string' || !rec.q.trim()) return goHome();

  // Rekor lama mungkin belum punya field 't', atau 't' dipakai untuk timestamp.
  // Hanya terima nama template yang kita kenal, selain itu -> 'google'.
  const tpl = Object.prototype.hasOwnProperty.call(TEMPLATE_FILE, rec.t) ? rec.t : 'google';
  const tplFile = TEMPLATE_FILE[tpl];

  const asset = await env.ASSETS.fetch(new URL(tplFile, request.url));
  if (!asset.ok) return goHome();
  let html = await asset.text();

  const payload = JSON.stringify({
    q: rec.q,
    d: rec.d || 'google',
    t: tpl,
    code: code
  }).replace(/</g, '\\u003c');

  const inject = '<script>window.__SHORT__=' + payload + ';</script>';
  html = html.includes('</head>') ? html.replace('</head>', inject + '</head>') : inject + html;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

// Selain GET, arahkan ke homepage
export async function onRequest(context) {
  return context.env.ASSETS.fetch(new URL('/', context.request.url));
}
