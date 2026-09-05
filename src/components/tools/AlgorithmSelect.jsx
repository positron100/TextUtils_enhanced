import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
// Straight from the registry, not from crypto/index.js: the registry is
// metadata only, while index.js pulls in @noble/ciphers.
import { ALGORITHMS } from "../../lib/developer/crypto/registry.js";
import { duration, ease } from "../../lib/motion.js";
import ScrollAffordance from "../ui/ScrollAffordance.jsx";
import "./AlgorithmSelect.css";

/**
 * A themed algorithm picker — a grouped, filterable command-style popover, not
 * a browser <select>. Glass surface, keyboard navigable, sections by family.
 */
export default function AlgorithmSelect({ value, onChange, algorithms = ALGORITHMS }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const current = algorithms.find((a) => a.id === value) ?? algorithms[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return algorithms.filter(
      (a) => !q || a.label.toLowerCase().includes(q) || a.group.toLowerCase().includes(q),
    );
  }, [query, algorithms]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const a of filtered) {
      if (!map.has(a.group)) map.set(a.group, []);
      map.get(a.group).push(a);
    }
    return [...map.entries()];
  }, [filtered]);

  useEffect(() => {
    if (!open) return undefined;
    setCursor(Math.max(0, filtered.findIndex((a) => a.id === value)));
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    const onClick = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, filtered, value]);

  const commit = (algo) => {
    onChange(algo.id);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      // Closing this popover is the whole action — without stopping here the
      // event reaches the app's global Escape handler and navigates out of the
      // Developer view as well.
      e.stopPropagation();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(filtered.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter" && filtered[cursor]) {
      e.preventDefault();
      commit(filtered[cursor]);
    }
  };

  return (
    <div className="algoselect" ref={rootRef}>
      <button
        type="button"
        className="algoselect__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="algoselect__value">
          {current.label}
          {current.recommended && <span className="algoselect__badge">recommended</span>}
        </span>
        <Chevron open={open} />
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            className="algoselect__pop"
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: duration.state, ease: ease.exit } }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onKeyDown={onKeyDown}
          >
            <input
              ref={inputRef}
              className="algoselect__search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter algorithms…"
              spellCheck="false"
              autoComplete="off"
            />
            <div className="algoselect__list" ref={listRef}>
              {groups.length === 0 && <p className="algoselect__empty">No match</p>}
              {groups.map(([group, items]) => (
                <div className="algoselect__group" key={group}>
                  <p className="algoselect__grouplabel">{group}</p>
                  {items.map((algo) => {
                    const flatIndex = filtered.indexOf(algo);
                    return (
                      <button
                        key={algo.id}
                        type="button"
                        role="option"
                        aria-selected={algo.id === value}
                        className="algoselect__option"
                        data-cursor={flatIndex === cursor || undefined}
                        onMouseEnter={() => setCursor(flatIndex)}
                        onClick={() => commit(algo)}
                      >
                        <span className="algoselect__optlabel">{algo.label}</span>
                        <span className="algoselect__opttags">
                          {algo.recommended && (
                            <span className="algoselect__badge">recommended</span>
                          )}
                          {algo.legacy && (
                            <span className="algoselect__badge algoselect__badge--legacy">legacy</span>
                          )}
                          {algo.id === value && <CheckIcon />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
              <ScrollAffordance targetRef={listRef} />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chevron({ open }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 160ms" }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
