import { useState } from "react";
import { useGhostType } from "../../hooks/useGhostType.js";
import "./Editor.css";

const PLACEHOLDER = "Start typing, or paste something here…";
const GHOST =
  "The quick brown fox jumps over the lazy dog. Transform, clean, count — the tools are on the right.";

export default function Editor({
  value,
  onChange,
  textareaRef,
  clearing = false,
  flash = 0,
  ghostActive = false,
  id = "editor",
}) {
  const [touched, setTouched] = useState(false);
  const showGhost = ghostActive && !touched && value.length === 0;
  const ghost = useGhostType(GHOST, showGhost);

  const stop = () => setTouched(true);

  return (
    <div className="editor" data-empty={value.length === 0} data-clearing={clearing}>
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
