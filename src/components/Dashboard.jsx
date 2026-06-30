import { useState, useMemo } from "react";
import LIVE from "../data/worldcup.json";

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

/* Overlay live knockout results (keyed by sorted team-pair) onto the snapshot.
   A live entry replaces status/winner/score; missing entries keep the snapshot. */
const pairKey = (a, b) => [a, b].sort().join("|");
const R32 = R32_BASE.map((m) => {
  const live = LIVE.results?.[pairKey(m.home, m.away)];
  return live ? { ...m, status: live.status, winner: live.winner ?? null, score: live.score ?? m.score } : m;
});

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
const GROUPS = LIVE.groups && Object.keys(LIVE.groups).length ? LIVE.groups : GROUPS_BASE;
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
const SCORERS = LIVE.scorers && LIVE.scorers.length ? LIVE.scorers : SCORERS_BASE;

/* "Updated" label: the live fetch timestamp if we have one, else the snapshot date. */
const UPDATED_LABEL = LIVE.updated
  ? new Date(LIVE.updated).toLocaleString("en-US", {
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

function buildModel() {
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
   PRESENTATION
   ============================================================================= */
const C = {
  ink: "#0B1622", panel: "#13212F", panel2: "#1A2C3D", line: "#273C4F",
  text: "#EAF1F8", muted: "#8298AD", faint: "#5E7488",
  green: "#27D17F", greenDim: "#176B45", gold: "#F0B43C", red: "#E5604D", blue: "#5FA8E0",
};

const pct = (x) => {
  if (x == null) return "—";
  const v = x * 100;
  if (v >= 10) return v.toFixed(0) + "%";
  if (v >= 1) return v.toFixed(1) + "%";
  if (v >= 0.1) return v.toFixed(1) + "%";
  return "<0.1%";
};

function Bar({ value, max, color }) {
  const w = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ height: 8, background: "#0d1a26", borderRadius: 6, overflow: "hidden", flex: 1 }}>
      <div style={{ width: `${w}%`, height: "100%", background: color, borderRadius: 6, transition: "width .6s cubic-bezier(.2,.7,.2,1)" }} />
    </div>
  );
}

function TeamPill({ code, dim }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, opacity: dim ? 0.5 : 1 }}>
      <span style={{ fontSize: 15 }}>{flagFor(code)}</span>
      <span>{nameFor(code)}</span>
    </span>
  );
}

/* ---------- BRACKET ---------- */
function MatchCard({ home, away, status, winner, score, date, venue, pHome, pAway, proj }) {
  const row = (code, p, isWin, isLose) => (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
      padding: "6px 9px", borderRadius: 6,
      background: isWin ? "rgba(39,209,127,0.12)" : "transparent",
      opacity: isLose ? 0.4 : 1,
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: isWin ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        <span style={{ fontSize: 14 }}>{flagFor(code)}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{nameFor(code)}</span>
      </span>
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: isWin ? C.green : C.muted }}>
        {p != null ? pct(p) : ""}
      </span>
    </div>
  );
  return (
    <div style={{
      width: 188, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 9,
      padding: 5, position: "relative",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 7px 4px", fontSize: 9.5, color: C.faint, letterSpacing: 0.4, textTransform: "uppercase" }}>
        <span>{proj ? "Projected" : `${date}`}</span>
        <span>{status === "live" ? <span style={{ color: C.gold }}>● Live</span> : status === "done" ? <span style={{ color: C.green }}>Final</span> : venue}</span>
      </div>
      {row(home, pHome, winner === home, winner && winner !== home)}
      {row(away, pAway, winner === away, winner && winner !== away)}
      {score && <div style={{ textAlign: "right", padding: "2px 8px 1px", fontSize: 10, color: C.faint, fontFamily: "'IBM Plex Mono',monospace" }}>{score}</div>}
    </div>
  );
}

function Bracket({ model }) {
  const { slotDist, r16, qf, sf, fin, top } = model;

  // Build a node label: most likely team + its reach prob, two candidates shown.
  const projMatch = (nodeA, nodeB) => {
    const a = top(nodeA), b = top(nodeB);
    return { home: a[0], away: b[0], pHome: a[1], pAway: b[1], proj: true, status: "upcoming" };
  };

  const Col = ({ title, children, gap }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: gap, justifyContent: "space-around", minWidth: 196 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, letterSpacing: 1.2, textTransform: "uppercase", textAlign: "center", paddingBottom: 2 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div>
      <p style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.5, margin: "0 0 12px" }}>
        Round of 32 is live. Completed results are locked; every later slot shows the model's
        most-likely occupant and its chance of reaching that round. Swipe horizontally to follow a path to the final.
      </p>
      <div style={{ overflowX: "auto", paddingBottom: 12, WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "flex", gap: 18, minWidth: 1080 }}>
          <Col title="Round of 32" gap={6}>
            {R32.map((m) => {
              const d = slotDist[m.slot];
              return <MatchCard key={m.slot} home={m.home} away={m.away} status={m.status}
                winner={m.winner} score={m.score} date={m.date} venue={m.venue}
                pHome={d[m.home]} pAway={d[m.away]} />;
            })}
          </Col>
          <Col title="Round of 16" gap={20}>
            {R16_PAIRS.map((pair, i) => {
              const mc = projMatch(slotDist[pair[0]], slotDist[pair[1]]);
              return <MatchCard key={i} {...mc} />;
            })}
          </Col>
          <Col title="Quarterfinals" gap={66}>
            {QF_PAIRS.map((pair, i) => <MatchCard key={i} {...projMatch(r16[pair[0]], r16[pair[1]])} />)}
          </Col>
          <Col title="Semifinals" gap={170}>
            {SF_PAIRS.map((pair, i) => <MatchCard key={i} {...projMatch(qf[pair[0]], qf[pair[1]])} />)}
          </Col>
          <Col title="Final" gap={6}>
            <MatchCard {...projMatch(sf[0], sf[1])} />
            <div style={{ marginTop: 10, textAlign: "center" }}>
              <div style={{ fontSize: 10.5, color: C.faint, letterSpacing: 1, textTransform: "uppercase" }}>Model favorite</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.gold, marginTop: 4 }}>
                {flagFor(top(fin)[0])} {nameFor(top(fin)[0])}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", color: C.muted, fontSize: 12 }}>{pct(top(fin)[1])} to win it all</div>
            </div>
          </Col>
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

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0 }}>
        <div style={{ marginBottom: 18 }}>
          <h3 style={hStyle}>Title probability</h3>
          <p style={{ color: C.muted, fontSize: 12.5, margin: "0 0 14px", lineHeight: 1.5 }}>
            De-vigged consensus of three sportsbooks, propagated through the live bracket. Bars sum to 100% across the field.
          </p>
          {rows.map((r) => (
            <div key={r.c} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
              <div style={{ width: 132, fontSize: 13, display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
                <span style={{ fontSize: 15 }}>{flagFor(r.c)}</span>{nameFor(r.c)}
              </div>
              <Bar value={r.champ} max={maxChamp} color={C.gold} />
              <div style={{ width: 46, textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: C.text }}>{pct(r.champ)}</div>
            </div>
          ))}
        </div>

        <div>
          <h3 style={hStyle}>Advancement by round</h3>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 460, fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: C.muted, textAlign: "right" }}>
                  <th style={{ ...thStyle, textAlign: "left" }}>Team</th>
                  <th style={thStyle}>R16</th><th style={thStyle}>QF</th><th style={thStyle}>SF</th>
                  <th style={thStyle}>Final</th><th style={{ ...thStyle, color: C.gold }}>Champ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.c} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={{ ...tdStyle, textAlign: "left" }}><span style={{ marginRight: 6 }}>{flagFor(r.c)}</span>{nameFor(r.c)}</td>
                    <td style={tdMono}>{pct(r.r16)}</td><td style={tdMono}>{pct(r.qf)}</td>
                    <td style={tdMono}>{pct(r.sf)}</td><td style={tdMono}>{pct(r.fin)}</td>
                    <td style={{ ...tdMono, color: C.gold, fontWeight: 700 }}>{pct(r.champ)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- GROUPS ---------- */
function Groups() {
  const tag = (s) => {
    if (s === "W") return { t: "1st", c: C.green };
    if (s === "RU") return { t: "2nd", c: C.green };
    if (s === "3rd") return { t: "3rd ✓", c: C.blue };
    return { t: "out", c: C.faint };
  };
  return (
    <div>
      <p style={{ color: C.muted, fontSize: 12.5, margin: "0 0 16px", lineHeight: 1.5 }}>
        Final standings, all 12 groups. Top two advance automatically; the eight best third-place teams (✓) also qualified. 32 of 48 reached the knockout stage.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {Object.entries(GROUPS).map(([g, rows]) => (
          <div key={g} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: C.gold, marginBottom: 8 }}>GROUP {g}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: C.faint, fontSize: 10.5 }}>
                  <th style={{ textAlign: "left", paddingBottom: 4, fontWeight: 600 }}>Team</th>
                  <th style={miniTh}>W</th><th style={miniTh}>D</th><th style={miniTh}>L</th>
                  <th style={miniTh}>GD</th><th style={miniTh}>Pts</th><th style={{ ...miniTh, width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const [code, w, d, l, gd, pts, st] = r;
                  const tg = tag(st);
                  return (
                    <tr key={code} style={{ borderTop: `1px solid ${C.line}`, opacity: st === "out" ? 0.5 : 1 }}>
                      <td style={{ padding: "5px 0", whiteSpace: "nowrap" }}>
                        <span style={{ marginRight: 5 }}>{flagFor(code)}</span>{nameFor(code)}
                      </td>
                      <td style={miniTd}>{w}</td><td style={miniTd}>{d}</td><td style={miniTd}>{l}</td>
                      <td style={miniTd}>{gd > 0 ? "+" + gd : gd}</td>
                      <td style={{ ...miniTd, fontWeight: 700, color: C.text }}>{pts}</td>
                      <td style={{ textAlign: "right", fontSize: 10, color: tg.c, fontWeight: 700 }}>{tg.t}</td>
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
function Leaders() {
  const maxG = SCORERS[0].goals;
  return (
    <div>
      <h3 style={hStyle}>Golden Boot race</h3>
      <p style={{ color: C.muted, fontSize: 12.5, margin: "0 0 14px", lineHeight: 1.5 }}>
        Top scorers after the group stage. Assists break ties. Messi (now the all-time World Cup scoring leader) holds a clear lead.
      </p>
      {SCORERS.map((s, i) => (
        <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 11, padding: "7px 0", borderTop: i ? `1px solid ${C.line}` : "none" }}>
          <div style={{ width: 18, color: C.faint, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12 }}>{i + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 15 }}>{flagFor(s.team)}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
            </div>
            <div style={{ marginTop: 5 }}><Bar value={s.goals} max={maxG} color={C.green} /></div>
          </div>
          <div style={{ textAlign: "right", minWidth: 64 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 17, fontWeight: 700 }}>{s.goals}</span>
            <span style={{ color: C.faint, fontSize: 11 }}> G</span>
            <div style={{ color: C.faint, fontSize: 10.5 }}>{s.assists} assist{s.assists === 1 ? "" : "s"}</div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 22, padding: "12px 14px", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, color: C.muted, fontSize: 12.5, lineHeight: 1.6 }}>
        <strong style={{ color: C.text }}>Tournament note:</strong> the group stage set a record pace, with a century of goals reached in just 33 matches. The expanded 48-team format means semifinalists will play eight games, the most in World Cup history.
      </div>
    </div>
  );
}

/* ---------- METHODOLOGY ---------- */
function Methodology({ onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(4,9,14,0.72)", zIndex: 50, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: 16, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620, width: "100%", marginTop: 40, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "22px 22px 26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontFamily: "'Archivo',sans-serif", fontSize: 19, fontWeight: 800 }}>Methodology & sources</h2>
          <button onClick={onClose} style={{ background: C.panel2, border: `1px solid ${C.line}`, color: C.text, borderRadius: 8, padding: "5px 11px", cursor: "pointer", fontSize: 13 }}>Close</button>
        </div>
        {[
          ["How probabilities are built", "Each team carries one strength weight, taken as the de-vigged average of its title odds across FanDuel, BetMGM and DraftKings (longshots anchored to the same books' lower tiers). The identical formula is applied to every team. No host nation or popular side is adjusted by hand."],
          ["Match model", "For any match, P(A beats B) = strength(A) ÷ (strength(A) + strength(B)). The same rule governs every fixture from the Round of 32 to the final."],
          ["Bracket propagation", "Probabilities are propagated analytically (not simulated) through the fixed bracket. Completed results are locked to 100%. Because the math is exact, every round's probabilities sum to 100% across surviving teams."],
          ["What is fact vs. estimate", "Group standings, the 16 Round-of-32 matchups, completed results and the Golden Boot table are reported facts. All R16-and-beyond occupants and every probability are MODEL ESTIMATES, not predictions."],
          ["Where conflicts existed", "Early FOX projections briefly listed Colombia–Croatia and Portugal–Ghana; the settled bracket (CBS, FOX, Yahoo) is Colombia–Ghana and Portugal–Croatia, used here."],
          ["Sources", "FIFA.com, Yahoo Sports, FOX Sports, NBC Sports, CBS Sports, ESPN, Wikipedia. Odds via FanDuel, BetMGM, DraftKings. Verified June 29, 2026."],
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

/* ---------- SHARED STYLES ---------- */
const hStyle = { fontFamily: "'Archivo',sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: 0.3, margin: "0 0 4px", color: C.text };
const thStyle = { padding: "0 0 8px", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" };
const tdStyle = { padding: "8px 0", textAlign: "right" };
const tdMono = { padding: "8px 0", textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", color: C.muted };
const miniTh = { textAlign: "right", paddingBottom: 4, fontWeight: 600, width: 26 };
const miniTd = { textAlign: "right", padding: "5px 0", fontFamily: "'IBM Plex Mono',monospace", color: C.muted };

/* =============================================================================
   APP
   ============================================================================= */
export default function Dashboard() {
  const model = useMemo(buildModel, []);
  const [tab, setTab] = useState("bracket");
  const [methodOpen, setMethodOpen] = useState(false);
  const champLeader = model.top(model.champion);

  const TABS = [
    ["bracket", "Bracket"], ["forecast", "Forecast"], ["groups", "Groups"], ["leaders", "Leaders"],
  ];

  return (
    <div style={{ background: C.ink, minHeight: "100vh", color: C.text, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { height: 9px; width: 9px; }
        ::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        button:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      {/* HEADER */}
      <div style={{ borderBottom: `1px solid ${C.line}`, background: `linear-gradient(180deg, #0E1C2B 0%, ${C.ink} 100%)`, position: "relative", overflow: "hidden" }}>
        {/* subtle pitch motif */}
        <div aria-hidden style={{ position: "absolute", right: -60, top: -40, width: 240, height: 240, border: `1px solid ${C.line}`, borderRadius: "50%", opacity: 0.5 }} />
        <div aria-hidden style={{ position: "absolute", right: 60, top: 0, bottom: 0, width: 1, background: C.line, opacity: 0.5 }} />
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 18px 16px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.gold, boxShadow: `0 0 9px ${C.gold}` }} />
            FIFA World Cup 2026 · USA · Canada · Mexico
          </div>
          <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 30, lineHeight: 1.05, margin: "10px 0 4px", letterSpacing: -0.5 }}>
            Knockout Stage Forecast
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "baseline", color: C.muted, fontSize: 13 }}>
            <span>Round of 32 · 32 teams remain</span>
            <span style={{ display: "flex", gap: 7, alignItems: "baseline" }}>
              Model favorite:
              <strong style={{ color: C.gold, fontSize: 14 }}>{flagFor(champLeader[0])} {nameFor(champLeader[0])} {pct(champLeader[1])}</strong>
            </span>
            <span>Updated {UPDATED_LABEL}</span>
          </div>

          {/* TABS */}
          <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
            {TABS.map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                background: tab === k ? C.gold : C.panel, color: tab === k ? "#1a1205" : C.text,
                border: `1px solid ${tab === k ? C.gold : C.line}`, borderRadius: 8,
                padding: "8px 15px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                fontFamily: "'Inter',sans-serif", transition: "background .15s",
              }}>{label}</button>
            ))}
            <button onClick={() => setMethodOpen(true)} style={{
              marginLeft: "auto", background: "transparent", color: C.muted, border: `1px solid ${C.line}`,
              borderRadius: 8, padding: "8px 13px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
            }}>ⓘ Methodology & sources</button>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "22px 18px 60px" }}>
        {tab === "bracket" && <Bracket model={model} />}
        {tab === "forecast" && <Forecast model={model} />}
        {tab === "groups" && <Groups />}
        {tab === "leaders" && <Leaders />}
      </div>

      {/* FOOTER NOTE */}
      <div style={{ borderTop: `1px solid ${C.line}`, padding: "16px 18px", textAlign: "center", color: C.faint, fontSize: 11.5, lineHeight: 1.6 }}>
        Standings, matchups and results are reported facts. All forward-looking figures are model estimates derived from a de-vigged consensus of three sportsbooks, not predictions of fact. Sources: FIFA, Yahoo, FOX, NBC, CBS, ESPN, Wikipedia.
      </div>

      {methodOpen && <Methodology onClose={() => setMethodOpen(false)} />}
    </div>
  );
}
