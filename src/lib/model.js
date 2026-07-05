/* =============================================================================
   SHARED DATA + PROBABILITY MODEL
   Extracted so multiple views can reuse one source of truth. The math is the
   same strength-ratio model used across the site: P(A beats B) = Sa/(Sa+Sb),
   propagated analytically through the bracket, with played results locked.
   ============================================================================= */
import LIVE from "../data/worldcup.json";

export { LIVE };

/* Runtime source: the committed data on GitHub (public, CORS-open, cache-busted). */
export const DATA_URL =
  "https://raw.githubusercontent.com/dancardenasops-source/worldcup-2026-forecast/main/src/data/worldcup.json";

export const TEAMS = {
  FRA: { name: "France", flag: "🇫🇷", strength: 23.0 },
  ARG: { name: "Argentina", flag: "🇦🇷", strength: 19.0 },
  ESP: { name: "Spain", flag: "🇪🇸", strength: 12.5 },
  ENG: { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", strength: 12.0 },
  BRA: { name: "Brazil", flag: "🇧🇷", strength: 8.0 },
  POR: { name: "Portugal", flag: "🇵🇹", strength: 7.0 },
  NED: { name: "Netherlands", flag: "🇳🇱", strength: 6.0 },
  GER: { name: "Germany", flag: "🇩🇪", strength: 5.5 },
  COL: { name: "Colombia", flag: "🇨🇴", strength: 3.0 },
  NOR: { name: "Norway", flag: "🇳🇴", strength: 2.5 },
  USA: { name: "USA", flag: "🇺🇸", strength: 2.2 },
  MEX: { name: "Mexico", flag: "🇲🇽", strength: 2.2 },
  BEL: { name: "Belgium", flag: "🇧🇪", strength: 2.2 },
  MAR: { name: "Morocco", flag: "🇲🇦", strength: 2.0 },
  SUI: { name: "Switzerland", flag: "🇨🇭", strength: 1.9 },
  CRO: { name: "Croatia", flag: "🇭🇷", strength: 1.8 },
  JPN: { name: "Japan", flag: "🇯🇵", strength: 1.5 },
  CIV: { name: "Ivory Coast", flag: "🇨🇮", strength: 1.3 },
  SEN: { name: "Senegal", flag: "🇸🇳", strength: 1.3 },
  AUT: { name: "Austria", flag: "🇦🇹", strength: 1.3 },
  CAN: { name: "Canada", flag: "🇨🇦", strength: 1.2 },
  ECU: { name: "Ecuador", flag: "🇪🇨", strength: 1.1 },
  SWE: { name: "Sweden", flag: "🇸🇪", strength: 1.1 },
  EGY: { name: "Egypt", flag: "🇪🇬", strength: 1.0 },
  PAR: { name: "Paraguay", flag: "🇵🇾", strength: 1.0 },
  AUS: { name: "Australia", flag: "🇦🇺", strength: 0.9 },
  ALG: { name: "Algeria", flag: "🇩🇿", strength: 0.9 },
  GHA: { name: "Ghana", flag: "🇬🇭", strength: 0.7 },
  BIH: { name: "Bosnia & Herz.", flag: "🇧🇦", strength: 0.7 },
  CPV: { name: "Cape Verde", flag: "🇨🇻", strength: 0.6 },
  COD: { name: "DR Congo", flag: "🇨🇩", strength: 0.6 },
  RSA: { name: "South Africa", flag: "🇿🇦", strength: 0.6 },
};
const S = Object.fromEntries(Object.entries(TEAMS).map(([k, v]) => [k, v.strength]));
const sOf = (c) => S[c] || 0.5;

const GROUP_NAMES = {
  KOR: "South Korea", CZE: "Czechia", QAT: "Qatar", SCO: "Scotland", HAI: "Haiti",
  TUR: "Türkiye", CUW: "Curaçao", TUN: "Tunisia", IRN: "Iran", NZL: "New Zealand",
  KSA: "Saudi Arabia", URU: "Uruguay", IRQ: "Iraq", JOR: "Jordan", UZB: "Uzbekistan",
  PAN: "Panama",
};
export const flagFor = (c) => (TEAMS[c] ? TEAMS[c].flag : "⚽");
export const nameFor = (c) => (TEAMS[c] ? TEAMS[c].name : GROUP_NAMES[c] || c);

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

export const pairKey = (a, b) => [a, b].sort().join("|");
export function deriveR32(data) {
  return R32_BASE.map((m) => {
    const live = data?.results?.[pairKey(m.home, m.away)];
    return live ? { ...m, status: live.status, winner: live.winner ?? null, score: live.score ?? m.score } : m;
  });
}

export const R16_PAIRS = [
  [73, 75], [74, 77], [83, 84], [81, 82],
  [76, 78], [79, 80], [86, 88], [85, 87],
];
export const QF_PAIRS = [[0, 1], [2, 3], [4, 5], [6, 7]];
export const SF_PAIRS = [[0, 1], [2, 3]];

export const STADIUMS = {
  "Los Angeles": "SoFi Stadium", "Boston": "Gillette Stadium", "Monterrey": "Estadio BBVA",
  "Houston": "NRG Stadium", "East Rutherford": "MetLife Stadium", "Dallas": "AT&T Stadium",
  "Mexico City": "Estadio Azteca", "Atlanta": "Mercedes-Benz Stadium", "Santa Clara": "Levi's Stadium",
  "Seattle": "Lumen Field", "Toronto": "BMO Field", "Vancouver": "BC Place",
  "Miami": "Hard Rock Stadium", "Kansas City": "Arrowhead Stadium",
};
export const SCHEDULE = {
  r16: [
    { date: "Jul 4", time: "1:00 PM ET", city: "Houston", stadium: "NRG Stadium" },
    { date: "Jul 4", time: "5:00 PM ET", city: "Philadelphia", stadium: "Lincoln Financial Field" },
    { date: "Jul 6", time: "3:00 PM ET", city: "Arlington", stadium: "AT&T Stadium" },
    { date: "Jul 6", time: "8:00 PM ET", city: "Seattle", stadium: "Lumen Field" },
    { date: "Jul 5", time: "4:00 PM ET", city: "East Rutherford", stadium: "MetLife Stadium" },
    { date: "Jul 5", time: "8:00 PM ET", city: "Mexico City", stadium: "Estadio Azteca" },
    { date: "Jul 7", time: "12:00 PM ET", city: "Atlanta", stadium: "Mercedes-Benz Stadium" },
    { date: "Jul 7", time: "4:00 PM ET", city: "Vancouver", stadium: "BC Place" },
  ],
  qf: [
    { date: "Jul 9", time: "4:00 PM ET", city: "Foxborough", stadium: "Gillette Stadium" },
    { date: "Jul 10", time: "3:00 PM ET", city: "Inglewood", stadium: "SoFi Stadium" },
    { date: "Jul 11", time: "5:00 PM ET", city: "Miami", stadium: "Hard Rock Stadium" },
    { date: "Jul 11", time: "9:00 PM ET", city: "Kansas City", stadium: "Arrowhead Stadium" },
  ],
  sf: [
    { date: "Jul 14", time: "3:00 PM ET", city: "Arlington", stadium: "AT&T Stadium" },
    { date: "Jul 15", time: "3:00 PM ET", city: "Atlanta", stadium: "Mercedes-Benz Stadium" },
  ],
  third: { date: "Jul 18", time: "5:00 PM ET", city: "Miami", stadium: "Hard Rock Stadium" },
  final: { date: "Jul 19", time: "3:00 PM ET", city: "East Rutherford", stadium: "MetLife Stadium" },
};

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
export const deriveGroups = (data) => (data?.groups && Object.keys(data.groups).length ? data.groups : GROUPS_BASE);

const SCORERS_BASE = [
  { name: "Lionel Messi", team: "ARG", goals: 6, assists: 1 },
  { name: "Kylian Mbappé", team: "FRA", goals: 4, assists: 2 },
  { name: "Ousmane Dembélé", team: "FRA", goals: 4, assists: 0 },
  { name: "Vinícius Júnior", team: "BRA", goals: 4, assists: 1 },
  { name: "Erling Haaland", team: "NOR", goals: 4, assists: 0 },
  { name: "Deniz Undav", team: "GER", goals: 3, assists: 2 },
  { name: "Jonathan David", team: "CAN", goals: 3, assists: 0 },
];
export const deriveScorers = (data) => (data?.scorers && data.scorers.length ? data.scorers : SCORERS_BASE);

/* UTC so build-time and client render agree (no hydration mismatch). */
export const fmtUpdated = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short",
      })
    : "Jun 29, 2026";

export const pct = (x) => {
  if (x == null) return "n/a";
  const v = x * 100;
  if (v >= 10) return v.toFixed(0) + "%";
  if (v >= 1) return v.toFixed(1) + "%";
  if (v >= 0.1) return v.toFixed(1) + "%";
  return "<0.1%";
};

function matchDist(a, b) {
  const out = {};
  for (const ta in a) for (const tb in b) {
    const p = a[ta] * b[tb];
    const pa = sOf(ta) / (sOf(ta) + sOf(tb));
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
export const certain = (d) => { const k = Object.keys(d); return k.length === 1 ? k[0] : null; };

export function buildModel(R32, results = {}) {
  const resolve = (a, b) => {
    const ca = certain(a), cb = certain(b);
    if (ca && cb) {
      const r = results[pairKey(ca, cb)];
      if (r && r.winner) return { [r.winner]: 1 };
    }
    return matchDist(a, b);
  };
  const slotDist = {};
  R32.forEach((m) => {
    if (m.winner) slotDist[m.slot] = { [m.winner]: 1 };
    else {
      const ph = sOf(m.home) / (sOf(m.home) + sOf(m.away));
      slotDist[m.slot] = { [m.home]: ph, [m.away]: 1 - ph };
    }
  });
  const r16 = R16_PAIRS.map(([x, y]) => resolve(slotDist[x], slotDist[y]));
  const qf = QF_PAIRS.map(([x, y]) => resolve(r16[x], r16[y]));
  const sf = SF_PAIRS.map(([x, y]) => resolve(qf[x], qf[y]));
  const fin = resolve(sf[0], sf[1]);

  const reachR16 = merge(R32.map((m) => slotDist[m.slot]));
  const reachQF = merge(r16);
  const reachSF = merge(qf);
  const reachFinal = merge(sf);
  const top = (d) => Object.entries(d).sort((a, b) => b[1] - a[1])[0];
  return { slotDist, r16, qf, sf, fin, reachR16, reachQF, reachSF, reachFinal, champion: fin, top };
}

export { S, sOf };
