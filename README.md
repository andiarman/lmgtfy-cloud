# Lmgtfy Cloud

Let Me Google That For You with Google-style animations and prank templates.

## GitHub Pages

The static site is deployed from `public/` by the GitHub Actions workflow. Long links work on GitHub Pages, including the CAPTCHA, receipt, and speedrun templates.

GitHub Pages does not run the Cloudflare Pages Functions in `functions/`, so creating persistent short links through `/api/shorten` is unavailable there. The homepage falls back to a shareable long link. To enable short links, deploy this project to Cloudflare Pages and bind a KV namespace named `LINKS` as configured in `wrangler.jsonc`.

## Local preview

Run `python server.py` and open `http://localhost:8083/`. The preview server stores short links in memory; links disappear when the server stops.
