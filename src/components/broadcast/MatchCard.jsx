import { flagFor, nameFor, pct } from "../../lib/model.js";

/* One bracket node: two teams, win %, state pill, kickoff, venue, score. */
export default function MatchCard({ home, away, status, winner, score, date, time, city, stadium, pHome, pAway, mirror }) {
  const microW = pHome != null && pAway != null && pHome + pAway > 0 ? (pHome / (pHome + pAway)) * 100 : null;
  const when = date ? [date, time].filter(Boolean).join(" · ") : "Projected";
  const venue = score ? (stadium || "") : [stadium, city].filter(Boolean).join(" · ");
  const dir = mirror ? "row-reverse" : "row";

  const row = (code, p, isWin, isLose) => (
    <div className={`bc-row${isWin ? " win" : ""}${isLose ? " lose" : ""}`} style={{ flexDirection: dir }}>
      <span className="who" style={{ flexDirection: dir }}>
        <span className="flag">{flagFor(code)}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{nameFor(code)}</span>
      </span>
      <span className="p">{p != null ? pct(p) : ""}</span>
    </div>
  );

  return (
    <div className="bc-match">
      <div className="hd" style={{ flexDirection: dir }}>
        <span className="when">{when}</span>
        {status === "live" && <span className="bc-pill live"><span className="bc-dot pulse" />Live</span>}
        {status === "done" && <span className="bc-pill final">Final</span>}
      </div>
      {row(home, pHome, winner === home, winner && winner !== home)}
      {row(away, pAway, winner === away, winner && winner !== away)}
      {status !== "done" && microW != null && (
        <div className="bc-micro" style={{ display: "flex", justifyContent: mirror ? "flex-end" : "flex-start" }}>
          <i style={{ width: `${microW}%` }} />
        </div>
      )}
      {(venue || score) && (
        <div className="foot" style={{ flexDirection: dir }}>
          <span className="venue" style={{ textAlign: mirror ? "right" : "left" }}>{venue}</span>
          {score && <span className="score">{score}</span>}
        </div>
      )}
    </div>
  );
}
