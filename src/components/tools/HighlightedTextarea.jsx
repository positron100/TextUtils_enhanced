import { useMemo, useRef } from "react";
import "./HighlightedTextarea.css";

/**
 * A real <textarea> with a synchronized highlight layer behind it. The textarea
 * renders transparent text (real caret + selection kept); the backdrop renders
 * the same text with <mark>s over `ranges`. Both share identical box metrics so
 * they line up exactly.
 */
export default function HighlightedTextarea({
  value,
  onChange,
  ranges = [],
  placeholder,
  id,
  rows = 8,
}) {
  const areaRef = useRef(null);
  const backdropRef = useRef(null);

  const segments = useMemo(() => splitByRanges(value, ranges), [value, ranges]);

  const syncScroll = () => {
    const a = areaRef.current;
    const b = backdropRef.current;
    if (a && b) {
      b.scrollTop = a.scrollTop;
      b.scrollLeft = a.scrollLeft;
    }
  };

  return (
    <div className="hltext">
      <div ref={backdropRef} className="hltext__backdrop" aria-hidden="true">
        {segments.map((s, i) =>
          s.mark ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>,
        )}
        {"​"}
      </div>
      <textarea
        ref={areaRef}
        id={id}
        className="hltext__area"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        placeholder={placeholder}
        spellCheck="false"
        autoComplete="off"
        rows={rows}
      />
    </div>
  );
}

function splitByRanges(text, ranges) {
  if (!ranges.length) return [{ text }];
  const sorted = [...ranges].filter((r) => r.end > r.start).sort((a, b) => a.start - b.start);
  const out = [];
  let pos = 0;
  for (const r of sorted) {
    if (r.start < pos) continue; // skip overlaps
    if (r.start > pos) out.push({ text: text.slice(pos, r.start) });
    out.push({ text: text.slice(r.start, r.end), mark: true });
    pos = r.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}
