import { flagFor, nameFor } from "../../lib/model.js";

const tag = (s) =>
  s === "W" ? { t: "1st", c: "var(--lime)", dot: "var(--lime)" }
  : s === "RU" ? { t: "2nd", c: "var(--lime)", dot: "var(--lime)" }
  : s === "3rd" ? { t: "3rd", c: "var(--turquoise)", dot: "var(--turquoise)" }
  : { t: "out", c: "var(--text-muted)", dot: "var(--coral)" };

/* Final group standings, sorted A to L regardless of feed order. */
export default function Groups({ GROUPS }) {
  return (
    <div className="bc-groups">
      {Object.entries(GROUPS).sort((a, b) => a[0].localeCompare(b[0])).map(([g, rows]) => (
        <div className="bc-gcard" key={g}>
          <div className="gh"><span className="g">Group {g}</span><span className="bc-caps" style={{ fontSize: 10 }}>Final</span></div>
          {rows.map((r) => {
            const [code, w, d, l, gd, pts, st] = r;
            const tg = tag(st);
            return (
              <div className={`bc-grow${st === "out" ? " out" : ""}`} key={code}>
                <span className="t">
                  <span className="qd" style={{ background: tg.dot }} />
                  <span style={{ fontSize: 15 }}>{flagFor(code)}</span>{nameFor(code)}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="bc-tag" style={{ color: tg.c, border: `1px solid ${tg.c}` }}>{tg.t}</span>
                  <span className="pts">{pts}</span>
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
