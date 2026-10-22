#!/usr/bin/env python3
"""
Server lokal untuk preview lmgtfy-cloud — meniru Cloudflare Pages Functions:
  - static file dari ./public
  - POST /api/shorten  -> kode 5 karakter (KV in-memory)
  - GET  /<code>       -> inject window.__SHORT__ ke file template yang sesuai

Jalankan:  python server.py   (port 8083)
"""
import json
import random
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).parent / "public"
PORT = 8083

ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"  # tanpa 0/O/1/I/l
VALID_DEST = {"google", "aimode", "youtube", "pinterest"}
VALID_TPL = {"google", "captcha", "receipt", "force"}

TEMPLATE_FILE = {
    "google": "/index.html",
    "captcha": "/t/captcha.html",
    "receipt": "/t/receipt.html",
    "force": "/t/force.html",
}

# KV in-memory (id -> json string)
LINKS = {}

CTYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
}


def code_pattern_ok(code: str) -> bool:
    return bool(re.fullmatch(r"[2-9a-z]{1,5}", code))


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    # ---------- helpers ----------
    def _send(self, body: bytes, ctype: str, status: int = 200, extra=None):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        try:
            self.wfile.write(body)
        except BrokenPipeError:
            pass

    def _send_json(self, obj, status=200):
        self._send(
            json.dumps(obj).encode("utf-8"),
            "application/json; charset=utf-8",
            status,
            {"Cache-Control": "no-store"},
        )

    def _serve_asset(self, rel: str):
        """Serve file statis dari ./public. rel sudah tanpa leading slash."""
        target = (ROOT / rel).resolve()
        # cegah path traversal
        if not str(target).startswith(str(ROOT.resolve())):
            return self._home()
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file():
            # URL bersih (Cloudflare Pages menyajikan /t/force -> t/force.html)
            alt = Path(str(target) + ".html")
            if alt.is_file():
                target = alt
        if not target.is_file():
            return self._home()
        data = target.read_bytes()
        ctype = CTYPES.get(target.suffix.lower(), "application/octet-stream")
        self._send(data, ctype, 200, {"Cache-Control": "no-store"})

    def _home(self):
        self._serve_asset("index.html")

    def _inject(self, rel: str, payload: dict):
        target = ROOT / rel.lstrip("/")
        if not target.is_file():
            return self._home()
        html = target.read_text(encoding="utf-8")
        blob = json.dumps(payload, ensure_ascii=False).replace("<", "\\u003c")
        inject = "<script>window.__SHORT__=%s;</script>" % blob
        if "</head>" in html:
            html = html.replace("</head>", inject + "</head>", 1)
        else:
            html = inject + html
        self._send(
            html.encode("utf-8"),
            "text/html; charset=utf-8",
            200,
            {"Cache-Control": "no-store"},
        )

    # ---------- GET ----------
    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        # /<code>  -> shortlink
        if re.fullmatch(r"/[^/.]+", path):
            code = path[1:].lower()
            if code_pattern_ok(code):
                raw = LINKS.get(code)
                if raw:
                    rec = json.loads(raw)
                    tpl = rec.get("t", "google")
                    rel = TEMPLATE_FILE.get(tpl, TEMPLATE_FILE["google"])
                    return self._inject(
                        rel,
                        {
                            "q": rec["q"],
                            "d": rec.get("d", "google"),
                            "t": tpl,
                            "code": code,
                        },
                    )
                return self._home()
            return self._home()

        # static
        rel = path.lstrip("/")
        if rel in ("", "."):
            rel = "index.html"
        return self._serve_asset(rel)

    # ---------- POST ----------
    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/shorten":
            return self._send_json({"ok": False, "error": "not_found"}, 404)

        length = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            return self._send_json({"ok": False, "error": "bad_json"}, 400)

        q = str(body.get("q") or "").strip()[:500]
        if not q:
            return self._send_json({"ok": False, "error": "empty_query"}, 400)

        d = body.get("d")
        if d not in VALID_DEST:
            d = "google"
        t = body.get("t")
        if t not in VALID_TPL:
            t = "google"

        code = None
        for _ in range(10):
            cand = "".join(random.choice(ALPHABET) for _ in range(5))
            if cand not in LINKS:
                code = cand
                break
        if not code:
            return self._send_json({"ok": False, "error": "too_many_collisions"}, 500)

        import time

        LINKS[code] = json.dumps({"q": q, "d": d, "t": t, "ts": int(time.time() * 1000)})
        host = self.headers.get("Host", "localhost:%d" % PORT)
        url = "http://%s/%s" % (host, code)
        return self._send_json({"ok": True, "code": code, "url": url})

    def do_HEAD(self):
        self.do_GET()


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print("Preview: http://localhost:%d/" % PORT)
    print("Ctrl+C untuk berhenti.")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nBerhenti.")
