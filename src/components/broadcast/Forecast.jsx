import { TEAMS, flagFor, nameFor, pct } from "../../lib/model.js";

const clamp = (p) => Math.max(0, Math.min(1, p));
const tintCoral = (p) => `color-mix(in srgb, var(--coral) ${Math.round(clamp(p) * 82)}%, transparent)`;
const tintGold = (p) => `color-mix(in srgb, var(--gold) ${Math.round(clamp(p) * 90)}%, transparent)`;

/* Title-probability leaderboard + advancement heatmap, from the shared model. */
export default function Forecast({ model }) {
  const { champion, reachFinal, reachSF, reachQF, reachR16 } = model;
  const rows = Object.keys(TEAMS)
    .map((c) => ({ c, champ: champion[c] || 0, fin: reachFinal[c] || 0, sf: reachSF[c] || 0, qf: reachQF[c] || 0, r16: reachR16[c] || 0 }))
    .filter((r) => r.r16 > 0.0005)
    .sort((a, b) => b.champ - a.champ);
  const maxChamp = rows[0]?.champ || 1;

  return (
    <div className="bc-grid2">
      <div className="bc-panel">
        <h3>Title probability</h3>
        {rows.map((r, i) => (
          <div className="bc-lb" key={r.c}>
            <div className="top">
              <span className="nm"><span className="rk">{i + 1}</span><span style={{ fontSize: 17 }}>{flagFor(r.c)}</span>{nameFor(r.c)}</span>
              <span className={`val${i === 0 ? " lead" : ""}`}>{pct(r.champ)}</span>
            </div>
            <div className="bc-lbar"><i style={{ width: `${(r.champ / maxChamp) * 100}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="bc-panel">
        <h3>Advancement heatmap</h3>
        <div className="bc-tablewrap bc-scroll" tabIndex={0} aria-label="Advancement probability table, scrollable">
          <table className="bc-table">
            <thead>
              <tr>
                <th className="tm" scope="col">Team</th>
                <th scope="col">R16</th><th scope="col">QF</th><th scope="col">SF</th><th scope="col">Final</th>
                <th className="champ" scope="col">Champ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const cell = (v, k) => <td key={k} style={{ background: tintCoral(v), color: v > 0.5 ? "var(--bg)" : "var(--text)" }}>{pct(v)}</td>;
                const cr = r.champ / maxChamp;
                return (
                  <tr key={r.c}>
                    <td className="tm"><span style={{ marginRight: 7 }}>{flagFor(r.c)}</span>{nameFor(r.c)}</td>
                    {cell(r.r16, "a")}{cell(r.qf, "b")}{cell(r.sf, "c")}{cell(r.fin, "d")}
                    <td style={{ background: tintGold(cr), color: cr > 0.5 ? "var(--bg)" : "var(--gold)", fontWeight: 600 }}>{pct(r.champ)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
