import { m } from "framer-motion";
import "./TypingPulse.css";

/**
 * Subtle free-writing speed readout. No accuracy is shown — there is no
 * reference text to score against (use the typing test for that).
 */
export default function TypingPulse({ stats, onStartTest }) {
  const { wpm, activeMs, typing, hasData } = stats;
  return (
    <div className="typingpulse">
      <div className="typingpulse__head">
        <span className="typingpulse__dot" data-on={typing || undefined} aria-hidden="true" />
        <span className="typingpulse__label">Typing speed</span>
        <button type="button" className="typingpulse__test" onClick={onStartTest}>
          Take the test
        </button>
      </div>
      {hasData ? (
        <div className="typingpulse__figs">
          <Fig value={wpm} unit="wpm" />
          <Fig value={formatMinutes(activeMs)} unit="active" />
        </div>
      ) : (
        <p className="typingpulse__hint">Start writing to see your pace. Estimate only — no accuracy without a reference.</p>
      )}
    </div>
  );
}

function Fig({ value, unit }) {
  return (
    <m.span className="typingpulse__fig" key={`${value}${unit}`}>
      <span className="typingpulse__val">{value}</span>
      <span className="typingpulse__unit">{unit}</span>
    </m.span>
  );
}

function formatMinutes(ms) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
