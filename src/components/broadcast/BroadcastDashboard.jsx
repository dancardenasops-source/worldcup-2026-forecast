import { useState, useEffect, useMemo, useCallback } from "react";
import {
  LIVE, DATA_URL, deriveR32, deriveGroups, deriveScorers, buildModel, fmtUpdated, flagFor, nameFor, pct,
} from "../../lib/model.js";
import Bracket from "./Bracket.jsx";
import Forecast from "./Forecast.jsx";
import Groups from "./Groups.jsx";
import GoldenBoot from "./GoldenBoot.jsx";
import Methodology from "./Methodology.jsx";

const NAV = [["bracket", "Bracket"], ["forecast", "Forecast"], ["groups", "Groups"], ["leaders", "Leaders"]];

export default function BroadcastDashboard() {
  const [data, setData] = useState(LIVE);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | error
  const [methodOpen, setMethodOpen] = useState(false);

  const results = data?.results || {};
  const { R32, GROUPS, SCORERS, model } = useMemo(() => {
    const r32 = deriveR32(data);
    return { R32: r32, GROUPS: deriveGroups(data), SCORERS: deriveScorers(data), model: buildModel(r32, data?.results || {}) };
  }, [data]);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setStatus("loading");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store", signal: ctrl.signal });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      if (json && json.results) { setData(json); setStatus(silent ? "idle" : "ok"); }
      else throw new Error("bad payload");
    } catch { setStatus("error"); }
    finally { clearTimeout(timer); }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(() => { if (document.visibilityState === "visible") refresh(true); }, 60000);
    const onFocus = () => refresh(true);
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [refresh]);
  useEffect(() => {
    if (status !== "ok") return;
    const t = setTimeout(() => setStatus("idle"), 2500);
    return () => clearTimeout(t);
  }, [status]);

  const fav = model.top(model.champion);
  const played = R32.filter((m) => m.status === "done").length;
  const liveKey = Object.keys(results).find((k) => results[k]?.status === "live");
  const live = liveKey ? liveKey.split("|") : null;
  const nextUp = R32.find((m) => m.status === "upcoming");
  const updated = fmtUpdated(data?.updated);

  return (
    <div className="bc-app">
      <header className="bc-top">
        <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 0 }}>
          <span className="bc-brand">MUNDIAL<b>ANALYTICS</b></span>
          <nav className="bc-topnav" aria-label="Sections">
            {NAV.map(([id, label]) => <a key={id} href={`#${id}`} className="bc-tab">{label}</a>)}
            <button className="bc-tab" onClick={() => setMethodOpen(true)}>ⓘ Methodology</button>
          </nav>
        </div>
        <div className="bc-tools">
          {live && <span className="bc-pill live"><span className="bc-dot pulse" />Live</span>}
          <span className={`bc-upd${status === "error" ? " err" : ""}`}>{status === "error" ? "Feed offline" : `Upd ${updated}`}</span>
          <button className={`bc-refresh${status === "ok" ? " ok" : ""}`} onClick={() => refresh()} disabled={status === "loading"} aria-label="Refresh data">
            <span className={status === "loading" ? "bc-spin" : undefined} aria-hidden="true">↻</span>
            {status === "loading" ? "Updating" : status === "ok" ? "Updated" : "Refresh"}
          </button>
        </div>
      </header>

      <aside className="bc-side" aria-label="Primary navigation">
        <div className="bc-side-head">
          <div className="bc-caps" style={{ color: "var(--text)" }}>Tournament hub</div>
          <div className="bc-caps" style={{ fontSize: 10, marginTop: 2 }}>Knockout stage</div>
        </div>
        <nav className="bc-side-nav">
          {NAV.map(([id, label], i) => <a key={id} href={`#${id}`} aria-current={i === 0 ? "true" : undefined}>{label}</a>)}
        </nav>
        <div className="bc-side-foot">
          <div className="bc-caps" style={{ fontSize: 10, lineHeight: 1.5 }}>Model estimates, not predictions. Sources: FIFA, football-data.org.</div>
        </div>
      </aside>

      <main className="bc-main">
        <div className="bc-band">
          <div className="bc-band-in">
            <div>
              <span className="bc-pill live"><span className="bc-dot pulse" />Round of 32 live</span>
              <h1>Knockout forecast</h1>
              <div className="sub">Live simulation feed, FIFA World Cup 2026 (USA, Canada, Mexico).</div>
            </div>
            <div className="bc-stats">
              <div className="bc-stat bc-fav">
                <div className="k">Model favorite</div>
                <div className="v"><span className="bc-bug"><span style={{ color: "var(--gold)" }}>{flagFor(fav[0])} {nameFor(fav[0])}</span> {pct(fav[1])}</span></div>
              </div>
              <div className="bc-stat"><div className="k">Played</div><div className="v">{played} / 16</div></div>
              <div className="bc-stat">
                <div className="k">{live ? "Live now" : "Next up"}</div>
                <div className="v" style={{ color: live ? "var(--turquoise)" : "var(--text)" }}>
                  {live ? `${nameFor(live[0])} v ${nameFor(live[1])}` : nextUp ? `${nameFor(nextUp.home)} v ${nameFor(nextUp.away)}` : "TBD"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <section id="bracket" className="bc-section">
          <div className="bc-sec-label"><span className="bc-caps">Knockout pathway</span></div>
          <Bracket model={model} R32={R32} results={results} />
        </section>

        <section id="forecast" className="bc-section">
          <h2 className="bc-h2">Forecast</h2>
          <Forecast model={model} />
        </section>

        <section id="groups" className="bc-section">
          <h2 className="bc-h2">Group stages</h2>
          <Groups GROUPS={GROUPS} />
        </section>

        <section id="leaders" className="bc-section">
          <h2 className="bc-h2" style={{ borderLeftColor: "var(--gold)" }}>Golden boot race</h2>
          <GoldenBoot SCORERS={SCORERS} />
        </section>

        <footer className="bc-footer">
          Standings, results and the Golden Boot are reported facts, refreshed automatically from football-data.org.
          Title and advancement figures are model estimates from a de-vigged sportsbook consensus, not predictions.
        </footer>
      </main>

      {methodOpen && <Methodology onClose={() => setMethodOpen(false)} />}
    </div>
  );
}
