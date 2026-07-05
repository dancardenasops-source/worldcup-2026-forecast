import MatchCard from "./MatchCard.jsx";
import { R16_PAIRS, QF_PAIRS, SF_PAIRS, STADIUMS, SCHEDULE, sOf, certain, pairKey, flagFor, nameFor, pct } from "../../lib/model.js";

/* Two-sided FIFA bracket that converges on the final. Played nodes (any round)
   show the real result; unplayed ones show the projected head-to-head. */
export default function Bracket({ model, R32, results }) {
  const { slotDist, r16, qf, sf, fin, top } = model;
  const bySlot = Object.fromEntries(R32.map((m) => [m.slot, m]));

  const r32Card = (slot, mirror) => {
    const m = bySlot[slot], d = slotDist[slot];
    const unresolved = m.status === "done" && !m.winner;
    return <MatchCard key={"s" + slot} home={m.home} away={m.away} status={m.status} winner={m.winner}
      score={m.score} date={m.date} city={m.venue} stadium={STADIUMS[m.venue]}
      pHome={unresolved ? null : d[m.home]} pAway={unresolved ? null : d[m.away]} mirror={mirror} />;
  };
  const nodeCard = (a, b, sched, key, mirror) => {
    const ca = certain(a), cb = certain(b);
    if (ca && cb) {
      const r = results[pairKey(ca, cb)];
      if (r && (r.status === "done" || r.status === "live"))
        return <MatchCard key={key} home={ca} away={cb} status={r.status} winner={r.winner || null}
          score={r.score} {...sched} pHome={r.winner === ca ? 1 : null} pAway={r.winner === cb ? 1 : null} mirror={mirror} />;
      const p = sOf(ca) / (sOf(ca) + sOf(cb));
      return <MatchCard key={key} home={ca} away={cb} pHome={p} pAway={1 - p} {...sched} mirror={mirror} />;
    }
    const a2 = top(a), b2 = top(b);
    const p = sOf(a2[0]) / (sOf(a2[0]) + sOf(b2[0]));
    return <MatchCard key={key} home={a2[0]} away={b2[0]} pHome={p} pAway={1 - p} {...sched} mirror={mirror} />;
  };
  const r16Card = (i, m) => nodeCard(slotDist[R16_PAIRS[i][0]], slotDist[R16_PAIRS[i][1]], SCHEDULE.r16[i], "r16" + i, m);
  const qfCard = (i, m) => nodeCard(r16[QF_PAIRS[i][0]], r16[QF_PAIRS[i][1]], SCHEDULE.qf[i], "qf" + i, m);
  const sfCard = (i, m) => nodeCard(qf[SF_PAIRS[i][0]], qf[SF_PAIRS[i][1]], SCHEDULE.sf[i], "sf" + i, m);

  const semiLoser = (a, b) => {
    const ca = certain(a), cb = certain(b);
    if (!ca || !cb) return null;
    const r = results[pairKey(ca, cb)];
    return r && r.status === "done" && r.winner ? (r.winner === ca ? cb : ca) : null;
  };
  const l1 = semiLoser(qf[SF_PAIRS[0][0]], qf[SF_PAIRS[0][1]]);
  const l2 = semiLoser(qf[SF_PAIRS[1][0]], qf[SF_PAIRS[1][1]]);
  const champ = top(fin);

  const leftR32 = [73, 75, 74, 77, 83, 84, 81, 82];
  const rightR32 = [76, 78, 79, 80, 86, 88, 85, 87];
  const Round = ({ title, children }) => (
    <div className="bc-round"><div className="lbl">{title}</div><div className="cards">{children}</div></div>
  );

  return (
    <div className="bc-scroll" tabIndex={0} aria-label="Knockout bracket, scrollable" style={{ overflowX: "auto", paddingBottom: 12 }}>
      <div className="bc-bracket">
        <Round title="Round of 32">{leftR32.map((s) => r32Card(s, false))}</Round>
        <Round title="Round of 16">{[0, 1, 2, 3].map((i) => r16Card(i, false))}</Round>
        <Round title="Quarterfinals">{[0, 1].map((i) => qfCard(i, false))}</Round>
        <Round title="Semifinals">{sfCard(0, false)}</Round>
        <div className="bc-round" style={{ minWidth: 210 }}>
          <div className="lbl">Final</div>
          <div className="cards" style={{ justifyContent: "center" }}>
            {nodeCard(sf[0], sf[1], SCHEDULE.final, "final", false)}
            <div className="bc-champ">
              <div className="lbl">{certain(fin) ? "Champion" : "Projected champion"}</div>
              <div className="flag">{flagFor(champ[0])}</div>
              <div className="nm">{nameFor(champ[0])}</div>
              <div className="p">{certain(fin) ? "World Cup 2026 champion" : `${pct(champ[1])} to lift the trophy`}</div>
            </div>
            <div>
              <div className="lbl" style={{ textAlign: "center", margin: "8px 0 6px" }}>Third place</div>
              {l1 && l2 ? nodeCard({ [l1]: 1 }, { [l2]: 1 }, SCHEDULE.third, "third", false) : (
                <div className="bc-third">
                  <div className="when bc-mono">{SCHEDULE.third.date} · {SCHEDULE.third.time}</div>
                  <div className="tbd">Losing semi-finalists</div>
                  <div className="when bc-mono">{SCHEDULE.third.stadium} · {SCHEDULE.third.city}</div>
                </div>
              )}
            </div>
          </div>
        </div>
        <Round title="Semifinals">{sfCard(1, true)}</Round>
        <Round title="Quarterfinals">{[2, 3].map((i) => qfCard(i, true))}</Round>
        <Round title="Round of 16">{[4, 5, 6, 7].map((i) => r16Card(i, true))}</Round>
        <Round title="Round of 32">{rightR32.map((s) => r32Card(s, true))}</Round>
      </div>
    </div>
  );
}
