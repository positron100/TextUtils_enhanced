import { useEffect, useMemo, useRef, useState } from "react";
import { buildSearchRegex, findMatches } from "../../lib/text/search.js";
import "./FindReplace.css";

/**
 * Inline find & replace attached to the top edge of the editor. Current-match
 * navigation selects the match in the real textarea (browser highlight);
 * replace / replace-all go through the editor's history via `onCommit`.
 */
export default function FindReplace({ open, text, textareaRef, onCommit, onClose }) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [active, setActive] = useState(0);
  const findRef = useRef(null);

  const matches = useMemo(
    () => findMatches(text, buildSearchRegex(query, { caseSensitive, wholeWord })),
    [text, query, caseSensitive, wholeWord],
  );

  useEffect(() => {
    if (open) {
      setActive(0);
      findRef.current?.focus();
      findRef.current?.select();
    }
  }, [open]);

  useEffect(() => {
    setActive((i) => (matches.length ? Math.min(i, matches.length - 1) : 0));
  }, [matches.length]);

  if (!open) return null;

  const selectMatch = (index) => {
    const m = matches[index];
    const el = textareaRef.current;
    if (!m || !el) return;
    el.focus();
    el.setSelectionRange(m.start, m.end);
    findRef.current?.focus();
  };

  const step = (delta) => {
    if (!matches.length) return;
    const next = (active + delta + matches.length) % matches.length;
    setActive(next);
    selectMatch(next);
  };

  const replaceCurrent = () => {
    const m = matches[active];
    if (!m) return;
    const next = text.slice(0, m.start) + replacement + text.slice(m.end);
    onCommit(next, "Replace", {
      start: m.start,
      end: m.start + replacement.length,
    });
  };

  const replaceAll = () => {
    const re = buildSearchRegex(query, { caseSensitive, wholeWord });
    if (!re || !matches.length) return;
    onCommit(text.replace(re, () => replacement), "Replace all", { start: 0, end: 0 });
  };

  const onFindKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      step(e.shiftKey ? -1 : 1);
    }
  };

  const count = query
    ? matches.length
      ? `${active + 1} / ${matches.length}`
      : "No results"
    : "";

  return (
    <div
      className="find-replace"
      role="search"
      aria-label="Find and replace"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div className="find-replace__row">
        <input
          ref={findRef}
          className="find-replace__input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onFindKeyDown}
          placeholder="Find"
          aria-label="Find"
          autoComplete="off"
          spellCheck="false"
        />
        <span className="find-replace__count" aria-live="polite">
          {count}
        </span>
        <div className="find-replace__toggles">
          <button
            type="button"
            className="find-replace__toggle"
            aria-pressed={caseSensitive}
            title="Match case"
            onClick={() => setCaseSensitive((v) => !v)}
          >
            Aa
          </button>
          <button
            type="button"
            className="find-replace__toggle"
            aria-pressed={wholeWord}
            title="Whole word"
            onClick={() => setWholeWord((v) => !v)}
          >
            &#8220;ab&#8221;
          </button>
        </div>
        <button
          type="button"
          className="find-replace__nav"
          onClick={() => step(-1)}
          disabled={!matches.length}
          aria-label="Previous match"
        >
          &#8593;
        </button>
        <button
          type="button"
          className="find-replace__nav"
          onClick={() => step(1)}
          disabled={!matches.length}
          aria-label="Next match"
        >
          &#8595;
        </button>
        <button
          type="button"
          className="find-replace__close"
          onClick={onClose}
          aria-label="Close find and replace"
        >
          &#215;
        </button>
      </div>

      <div className="find-replace__row">
        <input
          className="find-replace__input"
          type="text"
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          placeholder="Replace with"
          aria-label="Replace with"
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="button"
          className="find-replace__action"
          onClick={replaceCurrent}
          disabled={!matches.length}
        >
          Replace
        </button>
        <button
          type="button"
          className="find-replace__action"
          onClick={replaceAll}
          disabled={!matches.length}
        >
          All
        </button>
      </div>
    </div>
  );
}
