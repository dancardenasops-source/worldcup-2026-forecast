import { useState, useMemo, useEffect, useCallback } from "react";
import LIVE from "../data/worldcup.json";

/* Live data is fetched at runtime from the committed JSON on GitHub (public,
   CORS-open, no token). This way the every-10-min data commits show up without
   a Cloudflare rebuild — and the Refresh button forces an instant re-fetch.
   The baked-in import above is the first-paint value and offline fallback. */
const DATA_URL =
  "https://raw.githubusercontent.com/dancardenasops-source/worldcup-2026-forecast/main/src/data/worldcup.json";

/* =============================================================================
   FIFA WORLD CUP 2026 — STATISTICS & FORECAST DASHBOARD
   Title probabilities are a de-vigged consensus of three sportsbooks (FanDuel,
   BetMGM, DraftKings) and are hand-maintained — no results API carries odds.
   Forward-looking numbers are MODEL ESTIMATES, not predictions of fact.

   FACTUAL data (knockout results, group standings, Golden Boot) is refreshed
   automatically: a scheduled GitHub Action (scripts/fetch-data.mjs) pulls live
   numbers from football-data.org into src/data/worldcup.json, which is imported
   below as LIVE and overlaid on the baked-in June 29 snapshot. If LIVE is empty
   (first run, or the feed is down) the snapshot shows through unchanged.
   ============================================================================= */

/* ---- TEAMS: code -> {name, flag, group, finish, strength} -------------------
   `strength` = blended market-implied title weight (raw %, pre-normalization),
   averaged across FanDuel/BetMGM/DraftKings for teams with published title odds;
   longshots anchored to the same books' lower tiers. Applied identically to every
   team. No hand-tuning of host nations or popular sides. ------------------------ */
const TEAMS = {
  FRA: { name: "France", flag: "🇫🇷", group: "I", finish: "Winner", strength: 23.0 },
  ARG: { name: "Argentina", flag: "🇦🇷", group: "J", finish: "Winner", strength: 19.0 },
  ESP: { name: "Spain", flag: "🇪🇸", group: "H", finish: "Winner", strength: 12.5 },
  ENG: { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "L", finish: "Winner", strength: 12.0 },
  BRA: { name: "Brazil", flag: "🇧🇷", group: "C", finish: "Winner", strength: 8.0 },
  POR: { name: "Portugal", flag: "🇵🇹", group: "K", finish: "Runner-up", strength: 7.0 },
  NED: { name: "Netherlands", flag: "🇳🇱", group: "F", finish: "Winner", strength: 6.0 },
  GER: { name: "Germany", flag: "🇩🇪", group: "E", finish: "Winner", strength: 5.5 },
  COL: { name: "Colombia", flag: "🇨🇴", group: "K", finish: "Winner", strength: 3.0 },
  NOR: { name: "Norway", flag: "🇳🇴", group: "I", finish: "Runner-up", strength: 2.5 },
  USA: { name: "USA", flag: "🇺🇸", group: "D", finish: "Winner", strength: 2.2 },
  MEX: { name: "Mexico", flag: "🇲🇽", group: "A", finish: "Winner", strength: 2.2 },
  BEL: { name: "Belgium", flag: "🇧🇪", group: "G", finish: "Winner", strength: 2.2 },
  MAR: { name: "Morocco", flag: "🇲🇦", group: "C", finish: "Runner-up", strength: 2.0 },
  SUI: { name: "Switzerland", flag: "🇨🇭", group: "B", finish: "Winner", strength: 1.9 },
  CRO: { name: "Croatia", flag: "🇭🇷", group: "L", finish: "Runner-up", strength: 1.8 },
  JPN: { name: "Japan", flag: "🇯🇵", group: "F", finish: "Runner-up", strength: 1.5 },
  CIV: { name: "Ivory Coast", flag: "🇨🇮", group: "E", finish: "Runner-up", strength: 1.3 },
  SEN: { name: "Senegal", flag: "🇸🇳", group: "I", finish: "3rd place", strength: 1.3 },
  AUT: { name: "Austria", flag: "🇦🇹", group: "J", finish: "Runner-up", strength: 1.3 },
  CAN: { name: "Canada", flag: "🇨🇦", group: "B", finish: "Runner-up", strength: 1.2 },
  ECU: { name: "Ecuador", flag: "🇪🇨", group: "E", finish: "3rd place", strength: 1.1 },
  SWE: { name: "Sweden", flag: "🇸🇪", group: "F", finish: "3rd place", strength: 1.1 },
  EGY: { name: "Egypt", flag: "🇪🇬", group: "G", finish: "Runner-up", strength: 1.0 },
  PAR: { name: "Paraguay", flag: "🇵🇾", group: "D", finish: "3rd place", strength: 1.0 },
  AUS: { name: "Australia", flag: "🇦🇺", group: "D", finish: "Runner-up", strength: 0.9 },
  ALG: { name: "Algeria", flag: "🇩🇿", group: "J", finish: "3rd place", strength: 0.9 },
  GHA: { name: "Ghana", flag: "🇬🇭", group: "L", finish: "3rd place", strength: 0.7 },
  BIH: { name: "Bosnia & Herz.", flag: "🇧🇦", group: "B", finish: "3rd place", strength: 0.7 },
  CPV: { name: "Cape Verde", flag: "🇨🇻", group: "H", finish: "Runner-up", strength: 0.6 },
  COD: { name: "DR Congo", flag: "🇨🇩", group: "K", finish: "3rd place", strength: 0.6 },
  RSA: { name: "South Africa", flag: "🇿🇦", group: "A", finish: "Runner-up", strength: 0.6 },
};
const S = Object.fromEntries(Object.entries(TEAMS).map(([k, v]) => [k, v.strength]));

/* ---- ROUND OF 32: 16 matches (official slots 73–88). The fixtures, slots,
   dates and venues are fixed; status/winner/score start from the June 29
   snapshot and are overlaid with live data below. -------------------------- */
const R32_BASE = [
  { slot: 73, home: "RSA", away: "CAN", date: "Jun 28", venue: "Los Angeles", status: "done", winner: "CAN", score: "1–1 (3–4 pens)" },
  { slot: 74, home: "GER", away: "PAR", date: "Jun 29", venue: "Boston", status: "done", winner: "PAR", score: "1–1 (2–4 pens)" },
  { slot: 75, home: "NED", away: "MAR", date: "Jun 29", venue: "Monterrey", status: "live", winner: null, score: "in progress" },
  { slot: 76, home: "BRA", away: "JPN", date: "Jun 29", venue: "Houston", status: "done", winner: "BRA", score: "2–1" },
  { slot: 77, home: "FRA", away: "SWE", date: "Jun 30", venue: "East Rutherford", status: "upcoming", winner: null },
  { slot: 78, home: "CIV", away: "NOR", date: "Jun 30", venue: "Dallas", status: "upcoming", winner: null },
  { slot: 79, home: "MEX", away: "ECU", date: "Jun 30", venue: "Mexico City", status: "upcoming", winner: null },
  { slot: 80, home: "ENG", away: "COD", date: "Jul 1", venue: "Atlanta", status: "upcoming", winner: null },
  { slot: 81, home: "USA", away: "BIH", date: "Jul 1", venue: "Santa Clara", status: "upcoming", winner: null },
  { slot: 82, home: "BEL", away: "SEN", date: "Jul 1", venue: "Seattle", status: "upcoming", winner: null },
  { slot: 83, home: "POR", away: "CRO", date: "Jul 2", venue: "Toronto", status: "upcoming", winner: null },
  { slot: 84, home: "ESP", away: "AUT", date: "Jul 2", venue: "Los Angeles", status: "upcoming", winner: null },
  { slot: 85, home: "SUI", away: "ALG", date: "Jul 2", venue: "Vancouver", status: "upcoming", winner: null },
  { slot: 86, home: "ARG", away: "CPV", date: "Jul 3", venue: "Miami", status: "upcoming", winner: null },
  { slot: 87, home: "COL", away: "GHA", date: "Jul 3", venue: "Kansas City", status: "upcoming", winner: null },
  { slot: 88, home: "AUS", away: "EGY", date: "Jul 3", venue: "Dallas", status: "upcoming", winner: null },
];

/* Overlay a live-data object (worldcup.json shape) onto the fixed R32 fixtures.
   A live entry replaces status/winner/score; missing entries keep the snapshot. */
const pairKey = (a, b) => [a, b].sort().join("|");
function deriveR32(data) {
  return R32_BASE.map((m) => {
    const live = data?.results?.[pairKey(m.home, m.away)];
    return live ? { ...m, status: live.status, winner: live.winner ?? null, score: live.score ?? m.score } : m;
  });
}

/* Bracket wiring (winner-of). R16 pairings confirmed via Yahoo Sports; QF/SF/Final
   follow the fixed FIFA bracket. */
const R16_PAIRS = [
  [73, 75], [76, 78], [74, 77], [81, 82], [79, 80], [83, 84], [85, 86], [87, 88],
];
const QF_PAIRS = [[0, 2], [1, 3], [4, 5], [6, 7]];
const SF_PAIRS = [[0, 1], [2, 3]];

/* ---- FINAL GROUP STANDINGS (A–L) -------------------------------------------- */
const GROUPS_BASE = {
  A: [["MEX", 3, 0, 0, 6, 9, "W"], ["RSA", 1, 1, 1, -1, 4, "RU"], ["KOR", 1, 0, 2, -1, 3, "out"], ["CZE", 0, 1, 2, -4, 1, "out"]],
  B: [["SUI", 2, 1, 0, 4, 7, "W"], ["CAN", 1, 1, 1, 5, 4, "RU"], ["BIH", 1, 1, 1, -1, 4, "3rd"], ["QAT", 0, 1, 2, -8, 1, "out"]],
  C: [["BRA", 2, 1, 0, 6, 7, "W"], ["MAR", 2, 1, 0, 3, 7, "RU"], ["SCO", 1, 0, 2, -3, 3, "out"], ["HAI", 0, 0, 3, -6, 0, "out"]],
  D: [["USA", 2, 0, 1, 4, 6, "W"], ["AUS", 1, 1, 1, 0, 4, "RU"], ["PAR", 1, 1, 1, -2, 4, "3rd"], ["TUR", 1, 0, 2, -2, 3, "out"]],
  E: [["GER", 2, 0, 1, 6, 6, "W"], ["CIV", 2, 0, 1, 2, 6, "RU"], ["ECU", 1, 1, 1, 0, 4, "3rd"], ["CUW", 0, 1, 2, -8, 1, "out"]],
  F: [["NED", 2, 1, 0, 6, 7, "W"], ["JPN", 1, 2, 0, 4, 5, "RU"], ["SWE", 1, 1, 1, 0, 4, "3rd"], ["TUN", 0, 0, 3, -10, 0, "out"]],
  G: [["BEL", 1, 2, 0, 4, 5, "W"], ["EGY", 1, 2, 0, 2, 5, "RU"], ["IRN", 0, 3, 0, 0, 3, "out"], ["NZL", 0, 1, 2, -6, 1, "out"]],
  H: [["ESP", 2, 1, 0, 3, 7, "W"], ["CPV", 1, 1, 1, 0, 4, "RU"], ["KSA", 0, 2, 1, -1, 2, "out"], ["URU", 0, 2, 1, -2, 2, "out"]],
  I: [["FRA", 3, 0, 0, 7, 9, "W"], ["NOR", 2, 0, 1, 5, 6, "RU"], ["SEN", 1, 0, 2, -2, 3, "3rd"], ["IRQ", 0, 0, 3, -10, 0, "out"]],
  J: [["ARG", 3, 0, 0, 8, 9, "W"], ["AUT", 1, 1, 1, 0, 4, "RU"], ["ALG", 1, 1, 1, -3, 4, "3rd"], ["JOR", 0, 0, 3, -5, 0, "out"]],
  K: [["COL", 2, 1, 0, 4, 7, "W"], ["POR", 2, 1, 0, 5, 7, "RU"], ["COD", 1, 1, 1, 0, 4, "3rd"], ["UZB", 0, 1, 2, -9, 1, "out"]],
  L: [["ENG", 2, 1, 0, 5, 7, "W"], ["CRO", 2, 0, 1, 3, 6, "RU"], ["GHA", 1, 1, 1, -1, 4, "3rd"], ["PAN", 0, 0, 3, -7, 0, "out"]],
};
/* Live standings replace the whole table when present; else fall back. */
const deriveGroups = (data) => (data?.groups && Object.keys(data.groups).length ? data.groups : GROUPS_BASE);
const GROUP_NAMES = {
  KOR: "South Korea", CZE: "Czechia", QAT: "Qatar", SCO: "Scotland", HAI: "Haiti",
  TUR: "Türkiye", CUW: "Curaçao", TUN: "Tunisia", IRN: "Iran", NZL: "New Zealand",
  KSA: "Saudi Arabia", URU: "Uruguay", IRQ: "Iraq", JOR: "Jordan", UZB: "Uzbekistan",
  PAN: "Panama",
};
const flagFor = (c) => (TEAMS[c] ? TEAMS[c].flag : "⚽");
const nameFor = (c) => (TEAMS[c] ? TEAMS[c].name : GROUP_NAMES[c] || c);

/* ---- TOP SCORERS (Golden Boot, after group stage) --------------------------- */
const SCORERS_BASE = [
  { name: "Lionel Messi", team: "ARG", goals: 6, assists: 1 },
  { name: "Kylian Mbappé", team: "FRA", goals: 4, assists: 2 },
  { name: "Ousmane Dembélé", team: "FRA", goals: 4, assists: 0 },
  { name: "Vinícius Júnior", team: "BRA", goals: 4, assists: 1 },
  { name: "Erling Haaland", team: "NOR", goals: 4, assists: 0 },
  { name: "Deniz Undav", team: "GER", goals: 3, assists: 2 },
  { name: "Jonathan David", team: "CAN", goals: 3, assists: 0 },
];
const deriveScorers = (data) => (data?.scorers && data.scorers.length ? data.scorers : SCORERS_BASE);

/* "Updated" label from an ISO timestamp; the snapshot date if we have none. */
const fmtUpdated = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
      })
    : "Jun 29, 2026";

/* =============================================================================
   PROBABILITY MODEL — strength-ratio match model, propagated through the bracket.
   P(A beats B) = S_A / (S_A + S_B). Same formula for every match. Completed
   results are locked (winner = 100%). All distributions are exact (analytic),
   so each round's probabilities sum to 100% across surviving teams.
   ============================================================================= */
function matchDist(a, b) {
  const out = {};
  for (const ta in a) for (const tb in b) {
    const p = a[ta] * b[tb];
    const pa = S[ta] / (S[ta] + S[tb]);
    out[ta] = (out[ta] || 0) + p * pa;
    out[tb] = (out[tb] || 0) + p * (1 - pa);
  }
  return out;
}
const merge = (nodes) => {
  const out = {};
  nodes.forEach((n) => { for (const t in n) out[t] = (out[t] || 0) + n[t]; });
  return out;
};

function buildModel(R32) {
  const slotDist = {};
  R32.forEach((m) => {
    if (m.winner) slotDist[m.slot] = { [m.winner]: 1 };
    else {
      const ph = S[m.home] / (S[m.home] + S[m.away]);
      slotDist[m.slot] = { [m.home]: ph, [m.away]: 1 - ph };
    }
  });
  const r16 = R16_PAIRS.map(([x, y]) => matchDist(slotDist[x], slotDist[y]));
  const qf = QF_PAIRS.map(([x, y]) => matchDist(r16[x], r16[y]));
  const sf = SF_PAIRS.map(([x, y]) => matchDist(qf[x], qf[y]));
  const fin = matchDist(sf[0], sf[1]);

  const reachR16 = merge(R32.map((m) => slotDist[m.slot]));
  const reachQF = merge(r16);
  const reachSF = merge(qf);
  const reachFinal = merge(sf);
  const champion = fin;

  // most-likely occupant of each slot/node (for bracket labels)
  const top = (d) => Object.entries(d).sort((a, b) => b[1] - a[1])[0];
  return { slotDist, r16, qf, sf, fin, reachR16, reachQF, reachSF, reachFinal, champion, top };
}

/* =============================================================================
   PRESENTATION — "floodlit matchday": a green-biased night-pitch ground, a single
   bold coral accent for energy/live state, gold reserved for the champion and the
   Golden Boot, and the advancement table rendered as a probability heatmap.
   ============================================================================= */
const C = {
  pitch: "#0B100E", panel: "#131A16", panel2: "#18221D", line: "#25322B",
  text: "#EFF4F1", muted: "#8A9A91", faint: "#5C6B63",
  coral: "#FF5A3C", coralDeep: "#C23A22", cyan: "#36E0D4", gold: "#F4C04E", good: "#3BD17A",
};
const FD = "'Oswald','Archivo Narrow',system-ui,sans-serif"; // display / broadcast
const FB = "'Inter',system-ui,-apple-system,sans-serif";      // body
const FM = "'IBM Plex Mono',ui-monospace,monospace";          // data

const pct = (x) => {
  if (x == null) return "—";
  const v = x * 100;
  if (v >= 10) return v.toFixed(0) + "%";
  if (v >= 1) return v.toFixed(1) + "%";
  if (v >= 0.1) return v.toFixed(1) + "%";
  return "<0.1%";
};
/* heatmap tints — p is 0..1 */
const tintCoral = (p) => `rgba(255,90,60,${(Math.max(0, Math.min(1, p)) * 0.82).toFixed(3)})`;
const tintGold = (p) => `rgba(244,192,78,${(Math.max(0, Math.min(1, p)) * 0.9).toFixed(3)})`;

/* ---------- shared bits ---------- */
const pillBase = {
  fontFamily: FM, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase",
  padding: "2px 7px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
};
function StatePill({ status, label }) {
  if (status === "live")
    return (
      <span style={{ ...pillBase, color: C.coral, border: `1px solid ${C.coralDeep}` }}>
        <span className="wc-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: C.coral }} />Live
      </span>
    );
  if (status === "done")
    return <span style={{ ...pillBase, color: C.good, border: "1px solid #1f5e3b" }}>Final</span>;
  return <span style={{ ...pillBase, color: C.faint, border: `1px solid ${C.line}` }}>{label || "Upcoming"}</span>;
}

function SecHead({ title, children }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
      <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", textTransform: "uppercase", margin: 0 }}>{title}</h2>
      <p style={{ margin: 0, color: C.muted, fontSize: 13, maxWidth: "58ch", lineHeight: 1.5 }}>{children}</p>
    </div>
  );
}

/* ---------- BRACKET ---------- */
function MatchCard({ home, away, status, winner, score, date, venue, pHome, pAway, proj, mirror }) {
  const microW = pHome != null && pAway != null && pHome + pAway > 0 ? (pHome / (pHome + pAway)) * 100 : null;
  const rowDir = mirror ? "row-reverse" : "row";
  const row = (code, p, isWin, isLose) => (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
      padding: "5px 7px", borderRadius: 7, flexDirection: rowDir,
      background: isWin ? "rgba(255,90,60,0.12)" : "transparent",
      opacity: isLose ? 0.42 : 1,
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: isWin ? 800 : 600, whiteSpace: "nowrap", overflow: "hidden", flexDirection: rowDir }}>
        <span style={{ fontSize: 15 }}>{flagFor(code)}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{nameFor(code)}</span>
      </span>
      <span style={{ fontFamily: FM, fontSize: 11.5, fontVariantNumeric: "tabular-nums", color: isWin ? C.coral : C.muted }}>
        {p != null ? pct(p) : ""}
      </span>
    </div>
  );
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px 6px", flexDirection: rowDir }}>
        <span style={{ fontFamily: FM, fontSize: 9.5, letterSpacing: 0.6, textTransform: "uppercase", color: C.faint }}>
          {proj ? "Projected" : date}
        </span>
        <StatePill status={status} label={proj ? date : venue} />
      </div>
      {row(home, pHome, winner === home, winner && winner !== home)}
      {row(away, pAway, winner === away, winner && winner !== away)}
      {status !== "done" && microW != null && (
        <div style={{ height: 4, borderRadius: 3, background: "#0b0f0d", overflow: "hidden", margin: "5px 7px 1px", display: "flex", justifyContent: mirror ? "flex-end" : "flex-start" }}>
          <div style={{ width: `${microW}%`, height: "100%", background: C.coral, borderRadius: 3, transition: "width .6s cubic-bezier(.2,.7,.2,1)" }} />
        </div>
      )}
      {score && (
        <div style={{ textAlign: mirror ? "left" : "right", fontFamily: FM, fontSize: 10, color: C.faint, padding: "3px 7px 0" }}>{score}</div>
      )}
    </div>
  );
}

function Bracket({ model, R32 }) {
  const { slotDist, r16, qf, sf, fin, top } = model;
  // Projected card: show the two most-likely occupants and their HEAD-TO-HEAD win
  // probability (so it reads like the real-match cards and sums to 100%), rather
  // than their chance of reaching the slot — which is 100% once a team has clinched.
  const projMatch = (nodeA, nodeB) => {
    const a = top(nodeA), b = top(nodeB);
    const pa = S[a[0]] / (S[a[0]] + S[b[0]]);
    return { home: a[0], away: b[0], pHome: pa, pAway: 1 - pa, proj: true, status: "upcoming" };
  };
  const bySlot = Object.fromEntries(R32.map((m) => [m.slot, m]));
  const r32Card = (slot, mirror) => {
    const m = bySlot[slot], d = slotDist[slot];
    return <MatchCard key={"s" + slot} home={m.home} away={m.away} status={m.status} winner={m.winner}
      score={m.score} date={m.date} venue={m.venue} pHome={d[m.home]} pAway={d[m.away]} mirror={mirror} />;
  };
  const r16Card = (i, mirror) => <MatchCard key={"r16" + i} {...projMatch(slotDist[R16_PAIRS[i][0]], slotDist[R16_PAIRS[i][1]])} mirror={mirror} />;
  const qfCard = (i, mirror) => <MatchCard key={"qf" + i} {...projMatch(r16[QF_PAIRS[i][0]], r16[QF_PAIRS[i][1]])} mirror={mirror} />;
  const sfCard = (i, mirror) => <MatchCard key={"sf" + i} {...projMatch(qf[SF_PAIRS[i][0]], qf[SF_PAIRS[i][1]])} mirror={mirror} />;

  const Col = ({ title, children, justify }) => (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 190 }}>
      <div style={{ fontFamily: FD, fontSize: 11, fontWeight: 700, color: C.faint, letterSpacing: 1.4, textTransform: "uppercase", textAlign: "center", marginBottom: 10 }}>{title}</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: justify || "space-around", gap: 10 }}>{children}</div>
    </div>
  );
  const champ = top(fin);

  // Left half feeds semifinal 0, right half feeds semifinal 1. The card order in
  // each round keeps every match centered between the two that feed it, and the
  // right half is mirrored so both sides converge on the final in the center.
  const leftR32 = [73, 75, 74, 77, 76, 78, 81, 82];   // r16 slots 0,2,1,3
  const rightR32 = [79, 80, 83, 84, 85, 86, 87, 88];  // r16 slots 4,5,6,7

  return (
    <div>
      <SecHead title="The Bracket">
        Round of 32 is live. Finished games are locked; each later card shows the most-likely matchup
        and each side's chance of winning it. The two halves converge on the final.
      </SecHead>
      <div style={{ overflowX: "auto", paddingBottom: 12, WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "flex", gap: 12, minWidth: 1780, alignItems: "stretch" }}>
          <Col title="Round of 32">{leftR32.map((s) => r32Card(s, false))}</Col>
          <Col title="Round of 16">{[0, 2, 1, 3].map((i) => r16Card(i, false))}</Col>
          <Col title="Quarterfinals">{[0, 1].map((i) => qfCard(i, false))}</Col>
          <Col title="Semifinals">{sfCard(0, false)}</Col>
          <Col title="Final" justify="center">
            <MatchCard {...projMatch(sf[0], sf[1])} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "linear-gradient(160deg, rgba(244,192,78,0.12), transparent)", border: "1px solid #5a4a1e", borderRadius: 14, padding: "20px 14px", marginTop: 14 }}>
              <div style={{ fontFamily: FD, fontSize: 10, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: C.gold }}>Projected champion</div>
              <div style={{ fontSize: 40 }}>{flagFor(champ[0])}</div>
              <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 22, textTransform: "uppercase", letterSpacing: "-0.01em" }}>{nameFor(champ[0])}</div>
              <div style={{ fontFamily: FM, color: C.gold, fontSize: 14 }}>{pct(champ[1])} to lift the trophy</div>
            </div>
          </Col>
          <Col title="Semifinals">{sfCard(1, true)}</Col>
          <Col title="Quarterfinals">{[2, 3].map((i) => qfCard(i, true))}</Col>
          <Col title="Round of 16">{[4, 5, 6, 7].map((i) => r16Card(i, true))}</Col>
          <Col title="Round of 32">{rightR32.map((s) => r32Card(s, true))}</Col>
        </div>
      </div>
    </div>
  );
}

/* ---------- FORECAST ---------- */
function Forecast({ model }) {
  const { champion, reachFinal, reachSF, reachQF, reachR16 } = model;
  const rows = Object.keys(TEAMS)
    .map((c) => ({ c, champ: champion[c] || 0, fin: reachFinal[c] || 0, sf: reachSF[c] || 0, qf: reachQF[c] || 0, r16: reachR16[c] || 0 }))
    .filter((r) => r.r16 > 0.0005)
    .sort((a, b) => b.champ - a.champ);
  const maxChamp = rows[0].champ;

  const subHead = { fontFamily: FD, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: C.muted, marginBottom: 14 };
  const th = { fontFamily: FD, fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.muted, padding: "11px 12px", textAlign: "right", borderBottom: `1px solid ${C.line}` };
  const cellBase = { fontFamily: FM, fontSize: 12.5, fontVariantNumeric: "tabular-nums", padding: "11px 12px", textAlign: "right", borderRadius: 4 };

  return (
    <div>
      <SecHead title="Forecast">
        De-vigged consensus of three sportsbooks, propagated through the live bracket. The heatmap reads
        warm where a run is likely, dark where it isn't.
      </SecHead>
      <div className="wc-grid2" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 30, alignItems: "start" }}>
        {/* leaderboard */}
        <div>
          <h3 style={subHead}>Title probability</h3>
          {rows.map((r, i) => (
            <div key={r.c} style={{ padding: "9px 0", borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 14 }}>
                  <span style={{ width: 18, fontFamily: FM, fontSize: 12, color: C.faint }}>{i + 1}</span>
                  <span style={{ fontSize: 17 }}>{flagFor(r.c)}</span>{nameFor(r.c)}
                </span>
                <span style={{ fontFamily: FM, fontWeight: 600, fontSize: 15, fontVariantNumeric: "tabular-nums", color: i === 0 ? C.gold : C.text }}>{pct(r.champ)}</span>
              </div>
              <div style={{ height: 9, background: "#0b0f0d", borderRadius: 5, overflow: "hidden", marginTop: 7, marginLeft: 27 }}>
                <div style={{ width: `${(r.champ / maxChamp) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${C.coralDeep}, ${C.coral})`, borderRadius: 5, transition: "width .6s cubic-bezier(.2,.7,.2,1)" }} />
              </div>
            </div>
          ))}
        </div>

        {/* heatmap */}
        <div>
          <h3 style={subHead}>Advancement heatmap</h3>
          <div style={{ overflowX: "auto", border: `1px solid ${C.line}`, borderRadius: 12, WebkitOverflowScrolling: "touch" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 460 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>Team</th>
                  <th style={th}>R16</th><th style={th}>QF</th><th style={th}>SF</th><th style={th}>Final</th>
                  <th style={{ ...th, color: C.gold }}>Champ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const cell = (v) => (
                    <td style={{ ...cellBase, background: tintCoral(v), color: v > 0.5 ? C.pitch : C.text }}>{pct(v)}</td>
                  );
                  const champRel = r.champ / maxChamp;
                  return (
                    <tr key={r.c} style={{ borderTop: i ? "1px solid rgba(37,50,43,0.6)" : "none" }}>
                      <td style={{ ...cellBase, fontFamily: FB, fontWeight: 700, fontSize: 13, textAlign: "left", whiteSpace: "nowrap" }}>
                        <span style={{ marginRight: 7 }}>{flagFor(r.c)}</span>{nameFor(r.c)}
                      </td>
                      {cell(r.r16)}{cell(r.qf)}{cell(r.sf)}{cell(r.fin)}
                      <td style={{ ...cellBase, fontWeight: 700, background: tintGold(champRel), color: champRel > 0.5 ? C.pitch : C.gold }}>{pct(r.champ)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- GROUPS ---------- */
function Groups({ GROUPS }) {
  const tag = (s) => {
    if (s === "W") return { t: "1st", c: C.good, b: "#1f5e3b" };
    if (s === "RU") return { t: "2nd", c: C.good, b: "#1f5e3b" };
    if (s === "3rd") return { t: "3rd ✓", c: C.cyan, b: "#1d5651" };
    return { t: "out", c: C.faint, b: C.line };
  };
  const miniTh = { fontFamily: FM, fontSize: 10, color: C.faint, textTransform: "uppercase", textAlign: "right", paddingBottom: 5, width: 26 };
  const miniTd = { fontFamily: FM, fontSize: 12, color: C.muted, textAlign: "right", padding: "5px 0" };
  return (
    <div>
      <SecHead title="Groups">
        Final standings. Top two advance; the eight best third-place teams (✓) also qualified — 32 of 48
        reached the knockout stage.
      </SecHead>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {Object.entries(GROUPS).map(([g, rows]) => (
          <div key={g} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px 15px" }}>
            <div style={{ fontFamily: FD, fontSize: 13, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: C.coral, marginBottom: 8 }}>Group {g}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={{ ...miniTh, textAlign: "left", width: "auto" }}>Team</th>
                  <th style={miniTh}>W</th><th style={miniTh}>D</th><th style={miniTh}>L</th>
                  <th style={miniTh}>GD</th><th style={miniTh}>Pts</th><th style={{ ...miniTh, width: 44 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const [code, w, d, l, gd, pts, st] = r;
                  const tg = tag(st);
                  return (
                    <tr key={code} style={{ borderTop: `1px solid ${C.line}`, opacity: st === "out" ? 0.45 : 1 }}>
                      <td style={{ padding: "5px 0", whiteSpace: "nowrap" }}>
                        <span style={{ marginRight: 6 }}>{flagFor(code)}</span>{nameFor(code)}
                      </td>
                      <td style={miniTd}>{w}</td><td style={miniTd}>{d}</td><td style={miniTd}>{l}</td>
                      <td style={miniTd}>{gd > 0 ? "+" + gd : gd}</td>
                      <td style={{ ...miniTd, fontWeight: 700, color: C.text }}>{pts}</td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{ fontFamily: FM, fontSize: 9.5, padding: "1px 5px", borderRadius: 4, color: tg.c, border: `1px solid ${tg.b}` }}>{tg.t}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- LEADERS ---------- */
function Leaders({ SCORERS }) {
  const maxG = SCORERS[0].goals;
  return (
    <div>
      <SecHead title="Golden Boot">
        Top scorers after the group stage. Assists break ties — Messi, now the all-time World Cup scoring
        leader, holds a clear lead.
      </SecHead>
      <div style={{ maxWidth: 720 }}>
        {SCORERS.map((s, i) => (
          <div key={s.name} style={{ display: "grid", gridTemplateColumns: "22px 1fr auto", gap: 12, alignItems: "center", padding: "10px 0", borderTop: i ? `1px solid ${C.line}` : "none" }}>
            <div style={{ fontFamily: FM, color: C.faint, fontSize: 12 }}>{i + 1}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{flagFor(s.team)}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
              </div>
              <div style={{ height: 7, background: "#0b0f0d", borderRadius: 4, overflow: "hidden", marginTop: 7 }}>
                <div style={{ width: `${(s.goals / maxG) * 100}%`, height: "100%", background: `linear-gradient(90deg, #b88a25, ${C.gold})`, transition: "width .6s cubic-bezier(.2,.7,.2,1)" }} />
              </div>
            </div>
            <div style={{ textAlign: "right", fontFamily: FM, minWidth: 64 }}>
              <span style={{ fontSize: 19, fontWeight: 600 }}>{s.goals}</span>
              <span style={{ color: C.faint, fontSize: 11 }}> G</span>
              <div style={{ color: C.faint, fontSize: 10.5 }}>{s.assists} assist{s.assists === 1 ? "" : "s"}</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 22, padding: "13px 15px", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, color: C.muted, fontSize: 12.5, lineHeight: 1.6 }}>
          <strong style={{ color: C.text }}>Tournament note:</strong> the group stage set a record pace, with a century of goals reached in just 33 matches. The expanded 48-team format means semifinalists will play eight games, the most in World Cup history.
        </div>
      </div>
    </div>
  );
}

/* ---------- METHODOLOGY ---------- */
function Methodology({ onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(3,6,5,0.74)", zIndex: 50, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: 16, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620, width: "100%", marginTop: 40, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "22px 22px 26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontFamily: FD, fontSize: 20, fontWeight: 700, textTransform: "uppercase", letterSpacing: "-0.01em" }}>Methodology & sources</h2>
          <button onClick={onClose} style={{ background: C.panel2, border: `1px solid ${C.line}`, color: C.text, borderRadius: 8, padding: "5px 11px", cursor: "pointer", fontSize: 13, fontFamily: FB }}>Close</button>
        </div>
        {[
          ["How probabilities are built", "Each team carries one strength weight, taken as the de-vigged average of its title odds across FanDuel, BetMGM and DraftKings (longshots anchored to the same books' lower tiers). The identical formula is applied to every team. No host nation or popular side is adjusted by hand."],
          ["Match model", "For any match, P(A beats B) = strength(A) ÷ (strength(A) + strength(B)). The same rule governs every fixture from the Round of 32 to the final."],
          ["Bracket propagation", "Probabilities are propagated analytically (not simulated) through the fixed bracket. Completed results are locked to 100%. Because the math is exact, every round's probabilities sum to 100% across surviving teams."],
          ["What is fact vs. estimate", "Group standings, the 16 Round-of-32 matchups, completed results and the Golden Boot table are reported facts, refreshed automatically from football-data.org. All R16-and-beyond occupants and every probability are MODEL ESTIMATES, not predictions."],
          ["Sources", "FIFA.com, Yahoo Sports, FOX Sports, NBC Sports, CBS Sports, ESPN, Wikipedia. Odds via FanDuel, BetMGM, DraftKings. Live results via football-data.org."],
        ].map(([t, b]) => (
          <div key={t} style={{ marginBottom: 13 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 3 }}>{t}</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>{b}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =============================================================================
   APP
   ============================================================================= */
export default function Dashboard() {
  const [data, setData] = useState(LIVE);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | error
  const [tab, setTab] = useState("bracket");
  const [methodOpen, setMethodOpen] = useState(false);

  // Everything downstream recomputes whenever `data` changes.
  const { R32, GROUPS, SCORERS, model } = useMemo(() => {
    const r32 = deriveR32(data);
    return { R32: r32, GROUPS: deriveGroups(data), SCORERS: deriveScorers(data), model: buildModel(r32) };
  }, [data]);

  // Pull the latest committed data from GitHub (cache-busted). Falls back to the
  // current data on any failure, so the page never breaks.
  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.results) { setData(json); setStatus("ok"); }
      else throw new Error("bad payload");
    } catch (e) {
      setStatus("error");
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const fav = model.top(model.champion);
  const played = R32.filter((m) => m.status === "done").length;
  const live = R32.find((m) => m.status === "live");
  const nextUp = R32.find((m) => m.status === "upcoming");
  const updatedLabel = fmtUpdated(data?.updated);

  const TABS = [["bracket", "Bracket"], ["forecast", "Forecast"], ["groups", "Groups"], ["leaders", "Golden Boot"]];

  return (
    <div style={{ background: `radial-gradient(1200px 480px at 78% -10%, rgba(255,90,60,0.10), transparent 60%), ${C.pitch}`, minHeight: "100vh", color: C.text, fontFamily: FB }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { height: 9px; width: 9px; }
        ::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        button:focus-visible { outline: 2px solid ${C.coral}; outline-offset: 2px; }
        .wc-pulse { animation: wcpulse 1.4s infinite; }
        @keyframes wcpulse { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
        .wc-tab { font-family: ${FD}; font-weight: 600; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: ${C.muted}; background: transparent; border: 1px solid transparent; border-radius: 7px; padding: 8px 13px; cursor: pointer; transition: background .15s, color .15s; }
        .wc-tab:hover { color: ${C.text}; background: ${C.panel}; }
        .wc-tab:disabled { opacity: 0.55; cursor: default; }
        .wc-spin { animation: wcspin 0.8s linear infinite; }
        @keyframes wcspin { to { transform: rotate(360deg); } }
        @media (max-width: 880px) { .wc-hero { grid-template-columns: 1fr !important; } .wc-grid2 { grid-template-columns: 1fr !important; } }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
      `}</style>

      {/* HEADER BAR */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(11,16,14,0.82)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "13px 22px", maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ fontFamily: FD, fontWeight: 700, letterSpacing: "0.01em", fontSize: 19, textTransform: "uppercase" }}>
            MUNDIAL<span style={{ color: C.coral }}>ANALYTICS</span>
          </div>
          <nav style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            {TABS.map(([k, label]) => (
              <button key={k} className="wc-tab" onClick={() => setTab(k)}
                style={tab === k ? { color: C.pitch, background: C.coral, borderColor: C.coral } : undefined}>
                {label}
              </button>
            ))}
            <button className="wc-tab" onClick={() => setMethodOpen(true)} style={{ color: C.faint }}>ⓘ Method</button>
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: FM, fontSize: 11, color: status === "error" ? C.coral : C.faint, whiteSpace: "nowrap" }}>
              {status === "error" ? "FEED OFFLINE" : `UPD ${updatedLabel.toUpperCase()}`}
            </span>
            <button className="wc-tab" onClick={refresh} disabled={status === "loading"}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.cyan, border: `1px solid ${C.line}` }}>
              <span className={status === "loading" ? "wc-spin" : undefined} style={{ display: "inline-block", fontSize: 14, lineHeight: 1 }}>↻</span>
              {status === "loading" ? "Updating" : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <div style={{ position: "relative", overflow: "hidden", borderBottom: `1px solid ${C.line}` }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5 }}>
          <div style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", border: `1px solid ${C.line}`, right: -120, top: -150 }} />
          <div style={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", border: `1px solid ${C.line}`, right: 120, bottom: -420 }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, width: 1, background: C.line, right: "18%" }} />
        </div>
        <div className="wc-hero" style={{ position: "relative", maxWidth: 1240, margin: "0 auto", padding: "30px 22px 34px", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 28, alignItems: "end" }}>
          <div>
            <div style={{ fontFamily: FD, fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.coral, boxShadow: `0 0 12px ${C.coral}` }} />
              FIFA World Cup 2026 · USA · Canada · Mexico
            </div>
            <h1 style={{ fontFamily: FD, fontSize: "clamp(30px, 5vw, 50px)", fontWeight: 700, lineHeight: 0.98, letterSpacing: "-0.02em", textTransform: "uppercase", textWrap: "balance", margin: "12px 0 0" }}>
              Knockout <span style={{ color: C.coral }}>Forecast</span>
            </h1>
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 16 }}>
              {[
                ["Stage", "Round of 32"],
                ["Played", `${played} / 16`],
                [live ? "Live now" : "Next kickoff", live ? `${nameFor(live.home)}–${nameFor(live.away)}` : nextUp ? `${nameFor(nextUp.home)}–${nameFor(nextUp.away)} · ${nextUp.date}` : "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontFamily: FM, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: C.faint }}>{k}</div>
                  <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 17, marginTop: 2, color: live && k === "Live now" ? C.coral : C.text }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: `linear-gradient(160deg, ${C.panel2}, ${C.panel})`, border: `1px solid ${C.line}`, borderRadius: 16, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(${C.gold}, ${C.coral})` }} />
            <div style={{ fontFamily: FD, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.gold }}>★ Model favorite</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 2px" }}>
              <span style={{ fontSize: 38, lineHeight: 1 }}>{flagFor(fav[0])}</span>
              <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 30, letterSpacing: "-0.01em", textTransform: "uppercase" }}>{nameFor(fav[0])}</span>
            </div>
            <div style={{ fontFamily: FM, fontSize: 46, fontWeight: 600, color: C.gold, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {pct(fav[1])}<small style={{ fontSize: 16, color: C.muted, fontWeight: 500 }}> to win it all</small>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{pct(model.reachFinal[fav[0]])} to reach the final · {pct(model.reachSF[fav[0]])} to the semis.</div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "40px 22px 60px" }}>
        {tab === "bracket" && <Bracket model={model} R32={R32} />}
        {tab === "forecast" && <Forecast model={model} />}
        {tab === "groups" && <Groups GROUPS={GROUPS} />}
        {tab === "leaders" && <Leaders SCORERS={SCORERS} />}
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: `1px solid ${C.line}`, padding: "26px 22px 60px", textAlign: "center", color: C.faint, fontSize: 11.5, lineHeight: 1.6, maxWidth: 1240, margin: "0 auto" }}>
        Standings, results and the Golden Boot are reported facts, refreshed automatically from football-data.org.
        Title and advancement figures are model estimates from a de-vigged sportsbook consensus — not predictions of fact.
      </div>

      {methodOpen && <Methodology onClose={() => setMethodOpen(false)} />}
    </div>
  );
}
