import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import GlassPill from "../ui/GlassPill.jsx";
import { duration, ease } from "../../lib/motion.js";
import "./ActionRail.css";

// The Write workspace's right-hand rail: Transform + Clean, sourced from the
// same command registry the palette uses. Transform is a small always-open
// grid; Clean is grouped into expandable sections so it never becomes a wall.

const TRANSFORM_ROWS = [
  ["uppercase", "lowercase", "title-case", "sentence-case"],
  ["camel-case", "pascal-case", "snake-case", "kebab-case", "constant-case"],
];

const CLEAN_GROUPS = ["Whitespace", "Duplicate lines", "Sort", "Characters", "Normalize"];
const DEFAULT_OPEN = ["Whitespace"];

export default function ActionRail({ commands, onRun, disabled = false }) {
  const [open, setOpen] = useState(() => new Set(DEFAULT_OPEN));
  const byId = Object.fromEntries(commands.map((c) => [c.id, c]));
  const clean = commands.filter((c) => c.category === "Clean");

  const toggle = (group) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });

  const pill = (command) => (
    <GlassPill
      key={command.id}
      magnetic={3}
      disabled={disabled}
      className="rail__pill"
      onClick={() => onRun(command)}
    >
      {command.label}
    </GlassPill>
  );

  return (
    <aside className="rail" aria-label="Transform and clean">
      <section className="rail__section">
        <h3 className="rail__heading">Transform</h3>
        {TRANSFORM_ROWS.map((row, i) => (
          <div className="rail__grid" key={i}>
            {row.map((id) => byId[id] && pill(byId[id]))}
          </div>
        ))}
      </section>

      <section className="rail__section">
        <h3 className="rail__heading">Clean</h3>
        {CLEAN_GROUPS.map((group) => {
          const items = clean.filter((c) => c.group === group);
          if (!items.length) return null;
          const isOpen = open.has(group);
          return (
            <div className="rail__group" key={group} data-open={isOpen || undefined}>
              <button
                type="button"
                className="rail__grouptoggle"
                aria-expanded={isOpen}
                onClick={() => toggle(group)}
              >
                <span>{group}</span>
                <Chevron open={isOpen} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <m.div
                    className="rail__groupbody"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: duration.surface, ease: ease.standard }}
                  >
                    <div className="rail__grid rail__grid--wide">{items.map(pill)}</div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </section>
    </aside>
  );
}

function Chevron({ open }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 180ms" }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
