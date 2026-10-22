# Lmgtfy Cloud

Lmgtfy Cloud is a playful “Let Me Google That For You” website. Create a shareable link that demonstrates how to search for a question, with an animated Google-style experience and optional prank templates.

<p align="center">
  <a href="https://andiarman.github.io/lmgtfy-cloud/"><strong>Visit the Lmgtfy Cloud website</strong></a>
</p>

## Features

- Animated, interactive search demonstration.
- Multiple templates: Google-style animation, CAPTCHA challenge, payment receipt, and typing speedrun.
- Choose a destination: Google Search, Google AI Mode, YouTube, or Pinterest.
- Shareable links with a long-link fallback.
- Responsive pages and assets served as a static site on GitHub Pages.

## Run locally

You need Python 3; no additional packages are required.

1. Open a terminal in the project directory.
2. Start the local preview server:

   ```bash
   python server.py
   ```

   On some systems, use `python3 server.py` instead.

3. Open [http://localhost:8083/](http://localhost:8083/) in your browser.
4. Stop the server with `Ctrl+C` when you are done.

The local preview server stores generated short links in memory. They stop working when the server is stopped.

## Deployment

The GitHub Actions workflow deploys the static files in `public/` to [GitHub Pages](https://andiarman.github.io/lmgtfy-cloud/) whenever changes are pushed to `main`. The hosted site creates shareable long links. The local preview server can also create short links, which are stored in memory and last only until the server stops.
