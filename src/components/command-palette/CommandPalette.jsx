import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CATEGORIES, commandSearchText } from "../../lib/commands.js";
import { fuzzyFilter } from "../../lib/fuzzy.js";
import "./CommandPalette.css";

const MOD =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌘"
    : "Ctrl";

/**
 * ⌘K command palette. Modal dialog, fuzzy search over the unified registry.
 * Empty query → Recent + category groups; a query → one flat ranked list.
 * Full keyboard control; recents kept in memory only.
 */
export default function CommandPalette({ commands, recentIds, onRun, onClose }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  useEffect(() => {
    const previously = document.activeElement;
    inputRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (previously instanceof HTMLElement) previously.focus();
    };
  }, []);

  const groups = useMemo(
    () => buildGroups(commands, recentIds, query),
    [commands, recentIds, query],
  );
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const runAt = (index) => {
    if (flat[index]) onRun(flat[index]);
  };

  const onKeyDown = (e) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(Math.max(0, flat.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        runAt(active);
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  };

  const optionId = (i) => `${listId}-opt-${i}`;

  return createPortal(
    <div className="cmdk" role="presentation">
      <div className="cmdk__backdrop" onClick={onClose} />
      <div className="cmdk__panel" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          ref={inputRef}
          className="cmdk__input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={flat.length ? optionId(active) : undefined}
          aria-label="Search actions"
          placeholder="Search actions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck="false"
        />

        <ul ref={listRef} className="cmdk__list" role="listbox" id={listId} aria-label="Actions">
          {flat.length === 0 && (
            <li className="cmdk__empty" role="presentation">
              No actions match “{query}”
            </li>
          )}
          {groups.map((group, gi) => (
            <li
              key={group.name ?? "results"}
              role="group"
              aria-label={group.name ?? "Results"}
              className="cmdk__grouprow"
            >
              {group.name && (
                <p className="cmdk__group" aria-hidden="true">
                  {group.name}
                </p>
              )}
              {group.items.map((command) => {
                const i = flatIndex(groups, gi, command);
                return (
                  <div
                    key={command.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    data-index={i}
                    className="cmdk__option"
                    data-active={i === active || undefined}
                    onMouseMove={() => setActive(i)}
                    onClick={() => runAt(i)}
                  >
                    <span className="cmdk__label">{command.label}</span>
                    {command.description && (
                      <span className="cmdk__desc">{command.description}</span>
                    )}
                    {command.shortcut && (
                      <kbd className="cmdk__kbd">
                        {MOD}
                        {command.shortcut}
                      </kbd>
                    )}
                  </div>
                );
              })}
            </li>
          ))}
        </ul>

        <p className="cmdk__foot" aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> run
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </p>
      </div>
    </div>,
    document.body,
  );
}

function flatIndex(groups, groupIndex, command) {
  let n = 0;
  for (let g = 0; g < groupIndex; g += 1) n += groups[g].items.length;
  return n + groups[groupIndex].items.indexOf(command);
}

function buildGroups(commands, recentIds, query) {
  if (query.trim()) {
    const ranked = fuzzyFilter(query, commands, commandSearchText).map((r) => r.item);
    return ranked.length ? [{ name: null, items: ranked.slice(0, 50) }] : [];
  }

  const byId = new Map(commands.map((c) => [c.id, c]));
  const recent = recentIds.map((id) => byId.get(id)).filter(Boolean).slice(0, 6);

  const groups = [];
  if (recent.length) groups.push({ name: "Recent", items: recent });
  for (const category of CATEGORIES) {
    const items = commands.filter((c) => c.category === category);
    if (items.length) groups.push({ name: category, items });
  }
  return groups;
}
