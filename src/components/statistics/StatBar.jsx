import { useEffect, useState } from "react";
import RollingNumber from "./RollingNumber.jsx";
import { formatDuration } from "../../lib/text/statistics.js";
import "./StatBar.css";

/**
 * Every figure, always visible — the workspace has the width for it now, so
 * there is no More/Less toggle. Primary counts read large and tabular; the
 * derived timings sit quieter beneath. One debounced live region announces the
 * settled primary figures.
 */
const PRIMARY = [
  ["Words", "words"],
  ["Characters", "chars"],
  ["No spaces", "charsNoSpaces"],
  ["Sentences", "sentences"],
  ["Lines", "lines"],
];

export default function StatBar({ stats }) {
  const announcement = useDebounced(
    `${stats.words} ${stats.words === 1 ? "word" : "words"}, ${stats.chars} ${
      stats.chars === 1 ? "character" : "characters"
    }`,
    600,
  );

  return (
    <div className="statbar" role="group" aria-label="Text statistics">
      <div className="statbar__primary">
        {PRIMARY.map(([label, key]) => (
          <div className="stat" key={key}>
            <span className="stat__label">{label}</span>
            <RollingNumber value={stats[key]} />
          </div>
        ))}
      </div>

      <div className="statbar__secondary">
        <Quiet label="Paragraphs" value={String(stats.paragraphs)} />
        <Quiet label="Reading" value={formatDuration(stats.readingSeconds)} />
        <Quiet label="Speaking" value={formatDuration(stats.speakingSeconds)} />
      </div>

      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}

function Quiet({ label, value }) {
  return (
    <span className="statbar__quiet">
      <span className="statbar__quietlabel">{label}</span>
      <span className="statbar__quietval">{value}</span>
    </span>
  );
}

function useDebounced(value, delay) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return settled;
}
