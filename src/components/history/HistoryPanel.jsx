import { useEffect, useRef } from "react";
import Popover from "../ui/Popover.jsx";
import "./HistoryPanel.css";

const preview = (text) => {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (!oneLine) return "empty";
  return oneLine.length > 42 ? `${oneLine.slice(0, 42)}…` : oneLine;
};

/**
 * A compact timeline of history checkpoints. Click one to restore it (which is
 * itself undoable). Oldest → newest, current entry marked.
 */
export default function HistoryPanel({ entries, index, onRestore, open, onOpenChange }) {
  return (
    <Popover
      triggerLabel={null}
      menuLabel="History"
      triggerIcon={<ClockIcon />}
      triggerClassName="action-btn--icon"
      className="history-panel"
      open={open}
      onOpenChange={onOpenChange}
    >
      {(close) => (
        <HistoryList entries={entries} index={index} onRestore={onRestore} close={close} />
      )}
    </Popover>
  );
}

function HistoryList({ entries, index, onRestore, close }) {
  const currentRef = useRef(null);
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, []);

  return (
    <div className="popover__group">
      <p className="popover__grouplabel">History</p>
      {entries.map((entry, i) => (
        <button
          key={i}
          type="button"
          role="menuitem"
          tabIndex={-1}
          className="popover__item"
          aria-current={i === index ? "true" : undefined}
          ref={i === index ? currentRef : undefined}
          onClick={() => {
            close();
            onRestore(i);
          }}
        >
          <span className="history-panel__label">{entry.label}</span>
          <span className="popover__itemmeta">{preview(entry.text)}</span>
        </button>
      ))}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
