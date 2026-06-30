# World Cup 2026 — Knockout Forecast

Interactive single-page dashboard for the 2026 FIFA World Cup knockout stage:
live bracket, de-vigged title probabilities, final group standings, and the
Golden Boot race.

Data snapshot: June 29, 2026 (Round of 32). Sources: FIFA, Yahoo, FOX, NBC,
CBS, ESPN, Wikipedia. Forward-looking figures are model estimates, not predictions.

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
