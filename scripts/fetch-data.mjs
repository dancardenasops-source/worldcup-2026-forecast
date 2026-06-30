/* =============================================================================
   FETCH LIVE WORLD CUP 2026 DATA  —  football-data.org (v4)
   Run by .github/workflows/update-data.yml on a schedule. Pulls knockout
   results, final group standings and the Golden Boot race, normalizes them to
   the dashboard's team codes, and writes src/data/worldcup.json.

   Design notes:
   - We DON'T touch the title-probability model. Betting odds (the `strength`
     weights) are not available from a results API, so those stay hand-set in
     Dashboard.jsx. This script only refreshes *factual* data.
   - We never clobber good data with garbage: if the matches request fails we
     abort without writing. Scorers/standings failing individually just leaves
     those sections to fall back to the baked-in snapshot in the dashboard.
   - Team codes: football-data's `tla` is FIFA-style and usually matches our
     codes 1:1. Mismatches are patched in TLA_OVERRIDES; anything we still can't
     map is reported in `unmatched` so it's easy to fix after a real run.
   ============================================================================= */

import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/worldcup.json");

const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
const BASE = "https://api.football-data.org/v4";
const COMP = "WC"; // FIFA World Cup

/* football-data tla -> dashboard code, only where they differ. Extend as needed
   once we see real responses (unmatched teams are logged). */
const TLA_OVERRIDES = {
  // e.g. "NETH": "NED",
};

/* Pairs of [home, away] dashboard codes for every Round-of-32 slot, so we can
   overlay live results without depending on the API's slot numbering. Sorted
   key is order-insensitive. Must stay in sync with R32 in Dashboard.jsx. */
const R32_PAIRS = [
  ["RSA", "CAN"], ["GER", "PAR"], ["NED", "MAR"], ["BRA", "JPN"],
  ["FRA", "SWE"], ["CIV", "NOR"], ["MEX", "ECU"], ["ENG", "COD"],
  ["USA", "BIH"], ["BEL", "SEN"], ["POR", "CRO"], ["ESP", "AUT"],
  ["SUI", "ALG"], ["ARG", "CPV"], ["COL", "GHA"], ["AUS", "EGY"],
];
const pairKey = (a, b) => [a, b].sort().join("|");

async function api(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { "X-Auth-Token": TOKEN } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GET ${path} -> ${res.status} ${res.statusText} ${body.slice(0, 200)}`);
  }
  return res.json();
}

const unmatched = new Set();
function codeOf(team) {
  if (!team) return null;
  const tla = team.tla && team.tla.toUpperCase();
  if (tla && TLA_OVERRIDES[tla]) return TLA_OVERRIDES[tla];
  if (tla) return tla; // assume FIFA-style match
  unmatched.add(team.name || JSON.stringify(team));
  return null;
}

const STATUS = (s) =>
  s === "FINISHED" ? "done" : (s === "IN_PLAY" || s === "PAUSED") ? "live" : "upcoming";

function scoreString(score) {
  const ft = score?.fullTime;
  if (ft == null || ft.home == null || ft.away == null) return null;
  let s = `${ft.home}–${ft.away}`;
  const pen = score?.penalties;
  if (pen != null && pen.home != null && pen.away != null) {
    s += ` (${pen.home}–${pen.away} pens)`;
  }
  return s;
}

function winnerCode(m) {
  if (m.score?.winner === "HOME_TEAM") return codeOf(m.homeTeam);
  if (m.score?.winner === "AWAY_TEAM") return codeOf(m.awayTeam);
  return null; // draw or undecided
}

/* ---- knockout results, keyed by sorted team-pair --------------------------- */
function buildResults(matches) {
  const knockout = new Set(["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL", "THIRD_PLACE"]);
  const results = {};
  for (const m of matches) {
    if (!knockout.has(m.stage)) continue;
    const h = codeOf(m.homeTeam), a = codeOf(m.awayTeam);
    if (!h || !a) continue;
    results[pairKey(h, a)] = {
      status: STATUS(m.status),
      winner: winnerCode(m),
      score: m.status === "FINISHED" ? scoreString(m.score)
        : (m.status === "IN_PLAY" || m.status === "PAUSED") ? "in progress" : null,
    };
  }
  return results;
}

/* ---- final group standings, with advancement tags ------------------------- */
function buildGroups(standings) {
  const groups = {};
  const thirds = []; // {code, pts, gd, gf} across all groups, to pick 8 best
  for (const s of standings) {
    if (s.type !== "TOTAL" || !s.group) continue;
    const letter = s.group.replace(/^GROUP[_\s]*/i, "").toUpperCase();
    const rows = [];
    s.table.forEach((r, i) => {
      const code = codeOf(r.team);
      if (!code) return;
      const tag = i === 0 ? "W" : i === 1 ? "RU" : i === 2 ? "3rd?" : "out";
      if (i === 2) thirds.push({ letter, code, pts: r.points, gd: r.goalDifference, gf: r.goalsFor });
      rows.push([code, r.won, r.draw, r.lost, r.goalDifference, r.points, tag]);
    });
    groups[letter] = rows;
  }
  // 8 best third-placed teams qualify (FIFA tiebreak: pts, GD, GF).
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const qualified = new Set(thirds.slice(0, 8).map((t) => `${t.letter}:${t.code}`));
  for (const [letter, rows] of Object.entries(groups)) {
    rows.forEach((row) => {
      if (row[6] === "3rd?") row[6] = qualified.has(`${letter}:${row[0]}`) ? "3rd" : "out";
    });
  }
  return groups;
}

/* ---- Golden Boot race ----------------------------------------------------- */
function buildScorers(payload) {
  return (payload.scorers || []).slice(0, 8).map((s) => ({
    name: s.player?.name || "Unknown",
    team: codeOf(s.team) || "",
    goals: s.goals ?? 0,
    assists: s.assists ?? 0,
  }));
}

async function main() {
  if (!TOKEN) {
    console.error("FOOTBALL_DATA_TOKEN is not set — skipping fetch, leaving existing data untouched.");
    process.exit(0); // not a failure: the dashboard falls back to its baked-in snapshot
  }

  // Matches are required; if this fails we abort without writing.
  const matchesPayload = await api(`/competitions/${COMP}/matches`);
  const results = buildResults(matchesPayload.matches || []);

  // Standings + scorers are best-effort.
  let groups = null, scorers = null;
  try {
    groups = buildGroups((await api(`/competitions/${COMP}/standings`)).standings || []);
  } catch (e) { console.warn("standings unavailable:", e.message); }
  try {
    scorers = buildScorers(await api(`/competitions/${COMP}/scorers?limit=10`));
  } catch (e) { console.warn("scorers unavailable:", e.message); }

  const out = {
    updated: new Date().toISOString(),
    source: "football-data.org",
    results,
    ...(groups && Object.keys(groups).length ? { groups } : {}),
    ...(scorers && scorers.length ? { scorers } : {}),
    ...(unmatched.size ? { unmatched: [...unmatched] } : {}),
  };

  // Only write if something actually changed (keeps commit noise down).
  let prev = "";
  try { prev = await readFile(OUT, "utf8"); } catch {}
  const prevParsed = prev ? JSON.parse(prev) : {};
  const changed = JSON.stringify({ ...prevParsed, updated: 0 }) !== JSON.stringify({ ...out, updated: 0 });

  if (!changed) {
    console.log("No data changes since last run.");
    process.exit(0);
  }

  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${OUT}`);
  console.log(`  knockout results: ${Object.keys(results).length}`);
  console.log(`  groups: ${groups ? Object.keys(groups).length : "fallback"}`);
  console.log(`  scorers: ${scorers ? scorers.length : "fallback"}`);
  if (unmatched.size) console.warn(`  UNMATCHED TEAMS (fix TLA_OVERRIDES): ${[...unmatched].join(", ")}`);
}

main().catch((err) => {
  console.error("Fetch failed:", err.message);
  process.exit(1); // real failure -> workflow shows red, existing data kept
});
