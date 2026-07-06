import { useEffect, useRef } from "react";

const ITEMS = [
  ["How probabilities are built", "Each team carries one strength weight: the de-vigged average of its title odds across FanDuel, BetMGM and DraftKings (longshots anchored to the same books' lower tiers). The identical formula is applied to every team. No host nation or popular side is adjusted by hand."],
  ["Match model", "For any match, the chance A beats B is strength(A) divided by strength(A) plus strength(B). The same rule governs every fixture from the round of 32 to the final."],
  ["Bracket propagation", "Probabilities are propagated analytically (not simulated) through the fixed bracket. Completed results are locked to 100%. Because the math is exact, every round's probabilities sum to 100% across surviving teams."],
  ["Fact vs. estimate", "Group standings, the 16 round-of-32 matchups, completed results and the Golden Boot table are reported facts, refreshed automatically. Every round-of-16-and-beyond occupant and every probability is a model estimate, not a prediction."],
  ["Sources", "Results, standings and scorers via football-data.org. Odds via FanDuel, BetMGM and DraftKings. Background from FIFA, Yahoo Sports, FOX Sports, NBC Sports, CBS Sports, ESPN and Wikipedia."],
];

export default function Methodology({ onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="bc-modal" role="dialog" aria-modal="true" aria-label="Methodology and sources" onClick={onClose}>
      <div className="bc-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="bc-modal-head">
          <h2>Methodology and sources</h2>
          <button className="bc-modal-x" ref={closeRef} onClick={onClose}>Close</button>
        </div>
        {ITEMS.map(([t, b]) => (
          <div key={t} className="bc-modal-item">
            <div className="t">{t}</div>
            <div className="b">{b}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
