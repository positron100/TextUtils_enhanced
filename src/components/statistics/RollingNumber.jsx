import { useReducedMotion } from "../../hooks/useReducedMotion.js";
import "./RollingNumber.css";

/**
 * A digit that rolls to its new value on change — pure CSS transform on a
 * 0-9 strip, so it costs nothing per keystroke beyond a GPU-composited slide.
 * The whole thing is aria-hidden; StatBar owns the screen-reader announcement.
 */
export default function RollingNumber({ value }) {
  const reduced = useReducedMotion();
  const str = Math.max(0, Math.trunc(value)).toLocaleString("en-US");

  if (reduced) {
    return <span className="rolling-number">{str}</span>;
  }

  return (
    <span className="rolling-number" aria-hidden="true">
      {str.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <Digit key={i} value={Number(ch)} />
        ) : (
          <span key={i} className="rolling-number__sep">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

function Digit({ value }) {
  return (
    <span className="rolling-number__col">
      <span
        className="rolling-number__strip"
        style={{ transform: `translateY(${value * -10}%)` }}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span key={n} className="rolling-number__digit">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}
