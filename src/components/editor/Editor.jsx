import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useGhostType } from "../../hooks/useGhostType.js";
import { buildHighlightSegments } from "../../lib/text/search.js";
import "./Editor.css";

const PLACEHOLDER = "Start typing, or paste something here…";
const GHOST =
  "The quick brown fox jumps over the lazy dog. Transform, clean, count — the tools are on the right.";

/**
 * `highlight` — { ranges, active } from Find & Replace, or null. When present a
 * mirror layer sits behind the textarea rendering the same text with the
 * matches marked; the textarea's own glyphs go transparent so the mirror shows
 * through, while the real caret, selection and spellcheck stay exactly where
 * they were. The two share every box metric (see Editor.css) so the glyphs land
 * on top of each other, and the mirror's scroll is slaved to the textarea's.
 * With no matches the mirror is not rendered at all: ordinary typing pays
 * nothing for this.
 */
export default function Editor({
  value,
  onChange,
  textareaRef,
  clearing = false,
  flash = 0,
  ghostActive = false,
  highlight = null,
  id = "editor",
}) {
  const [touched, setTouched] = useState(false);
  const backdropRef = useRef(null);
  const showGhost = ghostActive && !touched && value.length === 0;
  const ghost = useGhostType(GHOST, showGhost);

  const marking = !!highlight && highlight.ranges.length > 0;
  const segments = useMemo(
    () => (marking ? buildHighlightSegments(value, highlight.ranges, highlight.active) : null),
    [marking, value, highlight],
  );

  const syncScroll = () => {
    const a = textareaRef?.current;
    const b = backdropRef.current;
    if (a && b) {
      b.scrollTop = a.scrollTop;
      b.scrollLeft = a.scrollLeft;
    }
  };
  // Stepping to a match scrolls the textarea; the mirror has to follow in the
  // same frame or the highlight lags a paint behind the selection.
  useLayoutEffect(syncScroll);

  const stop = () => setTouched(true);

  return (
    <div
      className="editor"
      data-empty={value.length === 0}
      data-clearing={clearing}
      data-marking={marking || undefined}
    >
      {marking && (
        <div ref={backdropRef} className="editor__backdrop" aria-hidden="true">
          {segments.map((s, i) =>
            s.mark ? (
              <mark key={i} data-current={s.current || undefined}>
                {s.text}
              </mark>
            ) : (
              <span key={i}>{s.text}</span>
            ),
          )}
          {/* A trailing zero-width space so a text ending in a newline still
              gives the mirror that last line's height. */}
          {"​"}
        </div>
      )}
      <label htmlFor={id} className="editor__label sr-only">
        Your text
      </label>
      <textarea
        id={id}
        ref={textareaRef}
        className="editor__area"
        value={value}
        onChange={(e) => {
          stop();
          onChange(e.target.value);
        }}
        onFocus={stop}
        onScroll={syncScroll}
        placeholder={showGhost ? "" : PLACEHOLDER}
        spellCheck="true"
        autoComplete="off"
        rows={10}
      />
      {ghost && value.length === 0 && (
        <span className="editor__ghost" aria-hidden="true">
          {ghost}
          <span className="editor__ghostcaret" />
        </span>
      )}
      {/* One-shot completion pulse — remounts on each transform via `key`. */}
      {flash > 0 && <span key={flash} className="editor__pulse" aria-hidden="true" />}
    </div>
  );
}
