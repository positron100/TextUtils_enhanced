import ActionButton from "./ActionButton.jsx";
import CopyButton from "./CopyButton.jsx";
import HistoryPanel from "../history/HistoryPanel.jsx";
import "./Toolbar.css";

/**
 * The editor's utility row — undo/redo, history, copy, clear. Transform and
 * Clean now live in the ActionRail; everything else is in the ⌘K palette.
 */
export default function Toolbar({
  onCopy,
  onClear,
  onUndo,
  onRedo,
  copyStatus = "idle",
  hasText = false,
  canUndo = false,
  canRedo = false,
  historyEntries = [],
  historyIndex = 0,
  historyOpen,
  onHistoryOpenChange,
  onRestoreHistory,
}) {
  return (
    <div className="toolbar" role="group" aria-label="Editor utilities">
      <div className="toolbar__row">
        <ActionButton onClick={onUndo} disabled={!canUndo} aria-label="Undo" className="action-btn--icon">
          <UndoIcon />
        </ActionButton>
        <ActionButton onClick={onRedo} disabled={!canRedo} aria-label="Redo" className="action-btn--icon">
          <RedoIcon />
        </ActionButton>
        <HistoryPanel
          entries={historyEntries}
          index={historyIndex}
          onRestore={onRestoreHistory}
          open={historyOpen}
          onOpenChange={onHistoryOpenChange}
        />
        <CopyButton status={copyStatus} disabled={!hasText} onClick={onCopy} />
        <ActionButton onClick={onClear} disabled={!hasText} aria-label="Clear all text">
          Clear
        </ActionButton>
      </div>
    </div>
  );
}

function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-1" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9a5 5 0 0 0 0 10h1" />
    </svg>
  );
}
