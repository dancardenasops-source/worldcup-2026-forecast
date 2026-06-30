# World Cup 2026 — Knockout Forecast

Interactive single-page dashboard for the 2026 FIFA World Cup knockout stage:
live bracket, de-vigged title probabilities, final group standings, and the
Golden Boot race.

Factual data (knockout results, group standings, Golden Boot) auto-updates from
[football-data.org](https://www.football-data.org/); title probabilities are a
hand-maintained de-vigged sportsbook consensus. Forward-looking figures are
model estimates, not predictions. Starting snapshot: June 29, 2026 (Round of 32).

## Live data pipeline
- `scripts/fetch-data.mjs` pulls World Cup results/standings/scorers from
  football-data.org and writes `src/data/worldcup.json`.
- `.github/workflows/update-data.yml` runs that script every 15 min (and on
  manual dispatch), committing changes — which triggers a Cloudflare rebuild.
- `Dashboard.jsx` imports the JSON and overlays it on a baked-in snapshot, so the
  site still renders if the feed is empty or down.

**Setup:** add a repository secret `FOOTBALL_DATA_TOKEN` (your football-data.org
API key) under Settings → Secrets and variables → Actions. Run locally with
`FOOTBALL_DATA_TOKEN=... node scripts/fetch-data.mjs`.

## Stack
- **Astro 7** (static output)
- **React 19** island (`client:load`) for the interactive dashboard
- No CSS framework — the component is self-styled

## Develop
```bash
npm install
npm run dev      # http://localhost:4321
```

## Build
```bash
npm run build    # outputs to ./dist
npm run preview  # serve the production build locally
```

## Deploy — Cloudflare Pages (Git-connected)
- Framework preset: **Astro**
- Build command: **npm run build**
- Build output directory: **dist**

Auto-deploys on every push to the connected branch.
