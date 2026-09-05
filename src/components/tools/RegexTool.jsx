import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useCopy } from "../../hooks/useCopy.js";
import { useRegexRun } from "../../hooks/useRegexRun.js";
import HighlightedTextarea from "./HighlightedTextarea.jsx";
import SpatialSurface from "../SpatialSurface.jsx";
import { ToolMessage } from "./ToolParts.jsx";
import ScrollAffordance from "../ui/ScrollAffordance.jsx";

const MAX_TEST_LENGTH = 50_000;
const FLAGS = [
  ["global", "g", "Global"],
  ["ignoreCase", "i", "Ignore case"],
  ["multiline", "m", "Multiline"],
  ["dotAll", "s", "Dot matches newline"],
];

export default function RegexTool({ editorText }) {
  const [pattern, setPattern] = useState("");
  const [test, setTest] = useState(editorText);
  const [flags, setFlags] = useState({ global: true, ignoreCase: false, multiline: false, dotAll: false });
  const [clearSeq, setClearSeq] = useState(0);
  const { status: copyStatus, copy } = useCopy();
  const patternId = useId();
  const fieldRef = useRef(null);
  const matchesRef = useRef(null);

  useEffect(() => {
    if (clearSeq) fieldRef.current?.querySelector("textarea")?.focus();
  }, [clearSeq]);

  const tooLong = test.length > MAX_TEST_LENGTH;
  // Matching runs in a worker (see useRegexRun) so a backtracking pattern
  // cannot take the page with it.
  const run = useRegexRun(tooLong ? "" : pattern, test, flags);
  const error = tooLong && pattern
    ? `Test string is capped at ${MAX_TEST_LENGTH.toLocaleString()} characters for live matching`
    : run.error;
  const matches = error ? [] : run.matches;
  const { count, truncated } = run;
  const ranges = useMemo(
    () => matches.map((m) => ({ start: m.index, end: m.index + m.text.length })),
    [matches],
  );

  const toggle = (key) => setFlags((f) => ({ ...f, [key]: !f[key] }));

  const matchesText = matches
    ? matches.map((m) => m.text).join("\n")
    : "";

  return (
    <div className="tool">
      <div className="tool__field">
        <label htmlFor={patternId} className="tool__label">
          Pattern
        </label>
        <div className="regex__pattern">
          <span className="regex__slash">/</span>
          <input
            id={patternId}
            className="regex__input"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="\d{4}-\d{2}-\d{2}"
            spellCheck="false"
            autoComplete="off"
          />
          <span className="regex__slash">/{flagString(flags)}</span>
        </div>
      </div>

      <div className="tool__controls" role="group" aria-label="Flags">
        {FLAGS.map(([key, letter, label]) => (
          <button
            key={key}
            type="button"
            className="tool__segment"
            aria-pressed={flags[key]}
            title={label}
            onClick={() => toggle(key)}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="tool__field">
        <div className="dev-surface__head">
          <span className="tool__label">Test string</span>
          <div className="dev-surface__actions">
            <button
              type="button"
              className="dev-surface__icon"
              aria-label={copyStatus === "copied" ? "Copied" : "Copy matches"}
              title={copyStatus === "copied" ? "Copied" : "Copy matches"}
              disabled={!matchesText}
              onClick={() => copy(matchesText)}
            >
              {copyStatus === "copied" ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button
              type="button"
              className="dev-surface__icon"
              aria-label="Clear"
              title="Clear"
              disabled={!pattern && !test}
              onClick={() => {
                setPattern("");
                setTest("");
                setClearSeq((s) => s + 1);
              }}
            >
              <ClearIcon />
            </button>
          </div>
        </div>
        <div ref={fieldRef}>
          <SpatialSurface nested trackKey={clearSeq} direction={-1}>
            <HighlightedTextarea value={test} onChange={setTest} ranges={ranges || []} placeholder="Text to match against" />
          </SpatialSurface>
        </div>
      </div>

      {error ? (
        <ToolMessage feedback={{ type: "error", text: error }} />
      ) : (
        pattern && (
          <p className="tool__message tool__message--status" role="status">
            {count} {count === 1 ? "match" : "matches"}
            {truncated ? " (showing first 1,000)" : ""}
          </p>
        )
      )}

      {matches && matches.length > 0 && (
        <ol className="regex__matches" ref={matchesRef}>
          {matches.slice(0, 100).map((m, i) => (
            <li key={i} className="regex__match">
              <code className="regex__matchtext">{m.text || "(empty)"}</code>
              <span className="regex__matchmeta">at {m.index}</span>
              {m.groups.length > 0 && (
                <span className="regex__groups">
                  {m.groups.map((g, gi) => (
                    <code key={gi} className="regex__group">
                      {gi + 1}: {g === null ? "∅" : g}
                    </code>
                  ))}
                </span>
              )}
            </li>
          ))}
          <ScrollAffordance targetRef={matchesRef} as="li" className="regex__scrollhint" />
        </ol>
      )}
    </div>
  );
}

function flagString(flags) {
  return FLAGS.filter(([k]) => flags[k]).map(([, letter]) => letter).join("");
}

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function ClearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}
