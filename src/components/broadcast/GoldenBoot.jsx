import { flagFor } from "../../lib/model.js";

/* Top scorers with goal bars. */
export default function GoldenBoot({ SCORERS }) {
  const maxG = SCORERS[0]?.goals || 1;
  return (
    <div className="bc-boot">
      {SCORERS.map((s, i) => (
        <div className="bc-boot-row" key={s.name}>
          <div className={`rk${i === 0 ? " lead" : ""}`}>{String(i + 1).padStart(2, "0")}</div>
          <div style={{ minWidth: 0 }}>
            <div className="nm">
              <span className="flag">{flagFor(s.team)}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
              <span className="bc-caps" style={{ marginLeft: 4 }}>{s.team}</span>
            </div>
            <div className="bar"><i style={{ width: `${(s.goals / maxG) * 100}%` }} /></div>
          </div>
          <div className="g"><b>{s.goals}</b> <span className="bc-caps">G</span><div className="bc-caps" style={{ marginTop: 2 }}>{s.assists} ast</div></div>
        </div>
      ))}
    </div>
  );
}
