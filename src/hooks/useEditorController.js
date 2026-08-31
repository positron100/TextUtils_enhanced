import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useHistory } from "./useHistory.js";

const CLEAR_FADE_MS = 130;
const TYPING_CHECKPOINT_MS = 500;

/**
 * Single source of truth for the editor text plus every action that mutates
 * it. Text updates are always synchronous — animation never gates them.
 *
 *  - typing            → live state + a coarse checkpoint after a 500ms pause
 *  - applyTransform(fn) → operates on the selection if there is one, else the
 *                         whole document; result is re-selected; explicit
 *                         checkpoint; `flash` bumps for the completion pulse
 *  - clear()           → brief fade, then empty + checkpoint
 *  - undo() / redo()   → walk the checkpoint stack, restoring text + selection
 */
export function useEditorController(reducedMotion) {
  const history = useHistory("");
  const [text, setTextState] = useState("");
  const [clearing, setClearing] = useState(false);
  const [flash, setFlash] = useState(0);
  // Drives the editor's card-swipe: `seq` bumps per action, `dir` is the travel
  // direction (+1 forward / -1 back), `from` is the text the outgoing card shows.
  const [sweep, setSweep] = useState({ seq: 0, dir: 1, from: "" });
  const bumpSweep = useCallback((dir, from) => {
    setSweep((s) => ({ seq: s.seq + 1, dir, from }));
  }, []);

  const textareaRef = useRef(null);
  const pendingSelection = useRef(null);
  const typingTimer = useRef(null);
  const clearTimer = useRef(null);

  // Restore selection after a text change caused by an action (not typing).
  useLayoutEffect(() => {
    const sel = pendingSelection.current;
    if (!sel) return;
    pendingSelection.current = null;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    try {
      el.setSelectionRange(sel.start, sel.end);
    } catch {
      /* ignore */
    }
  }, [text]);

  useEffect(
    () => () => {
      clearTimeout(typingTimer.current);
      clearTimeout(clearTimer.current);
    },
    [],
  );

  const cancelTyping = useCallback(() => {
    clearTimeout(typingTimer.current);
    typingTimer.current = null;
  }, []);

  // Commit the current live text as a "Typing" checkpoint if it has drifted
  // from the newest checkpoint. Called before any explicit action.
  const flushTyping = useCallback(() => {
    cancelTyping();
    if (text !== history.stack[history.index].text) {
      history.checkpoint(text, "Typing");
    }
  }, [text, history, cancelTyping]);

  const handleChange = useCallback(
    (value) => {
      if (clearTimer.current) {
        clearTimeout(clearTimer.current);
        clearTimer.current = null;
        setClearing(false);
      }
      setTextState(value);
      cancelTyping();
      typingTimer.current = setTimeout(() => {
        history.checkpoint(value, "Typing");
      }, TYPING_CHECKPOINT_MS);
    },
    [history, cancelTyping],
  );

  const applyTransform = useCallback(
    (fn, label) => {
      const el = textareaRef.current;
      const selStart = el?.selectionStart ?? 0;
      const selEnd = el?.selectionEnd ?? text.length;
      const hasSelection = selStart !== selEnd;

      let next;
      let after;
      if (hasSelection) {
        const segment = text.slice(selStart, selEnd);
        const out = fn(segment);
        next = text.slice(0, selStart) + out + text.slice(selEnd);
        after = { start: selStart, end: selStart + out.length };
      } else {
        const out = fn(text);
        next = out;
        const caret = out.length === text.length ? selStart : out.length;
        after = { start: caret, end: caret };
      }

      setFlash((n) => n + 1);
      if (next === text) return false;

      flushTyping();
      bumpSweep(1, text);
      setTextState(next);
      pendingSelection.current = after;
      history.checkpoint(next, label, after);
      return true;
    },
    [text, history, flushTyping, bumpSweep],
  );

  // Replace the whole text with an already-computed value (Find & Replace,
   // import, "use tool result"). Checkpointed like a transform.
  const commit = useCallback(
    (nextText, label, selection) => {
      if (nextText === text) return;
      flushTyping();
      bumpSweep(1, text);
      setTextState(nextText);
      pendingSelection.current = selection ?? null;
      history.checkpoint(nextText, label, selection);
      setFlash((n) => n + 1);
    },
    [text, flushTyping, history, bumpSweep],
  );

  const applyEntry = useCallback((entry) => {
    setTextState(entry.text);
    pendingSelection.current =
      entry.selection ?? { start: entry.text.length, end: entry.text.length };
  }, []);

  const finishClear = useCallback(() => {
    flushTyping();
    bumpSweep(1, text);
    setTextState("");
    setClearing(false);
    pendingSelection.current = { start: 0, end: 0 };
    history.checkpoint("", "Clear", { start: 0, end: 0 });
  }, [flushTyping, history, bumpSweep, text]);

  const clear = useCallback(() => {
    if (!text) return;
    if (reducedMotion) {
      finishClear();
      return;
    }
    setClearing(true);
    clearTimer.current = setTimeout(() => {
      clearTimer.current = null;
      finishClear();
    }, CLEAR_FADE_MS);
  }, [text, reducedMotion, finishClear]);

  const undo = useCallback(() => {
    const committedIndex = history.index;
    const committedText = history.stack[committedIndex].text;
    if (text !== committedText) {
      // Uncommitted typing: bank it (redoable), then land on the last checkpoint.
      cancelTyping();
      history.checkpoint(text, "Typing");
      bumpSweep(-1, text);
      history.stepTo(committedIndex);
      applyEntry(history.stack[committedIndex]);
    } else if (committedIndex > 0) {
      bumpSweep(-1, text);
      history.stepTo(committedIndex - 1);
      applyEntry(history.stack[committedIndex - 1]);
    }
  }, [text, history, cancelTyping, applyEntry, bumpSweep]);

  const redo = useCallback(() => {
    if (history.index < history.stack.length - 1) {
      const entry = history.stack[history.index + 1];
      bumpSweep(1, text);
      history.stepTo(history.index + 1);
      applyEntry(entry);
    }
  }, [history, applyEntry, bumpSweep, text]);

  const restoreCheckpoint = useCallback(
    (index) => {
      flushTyping();
      bumpSweep(index < history.index ? -1 : 1, text);
      history.stepTo(index);
      const entry = history.stack[Math.min(Math.max(index, 0), history.stack.length - 1)];
      applyEntry(entry);
    },
    [history, flushTyping, applyEntry, bumpSweep, text],
  );

  return {
    text,
    setText: handleChange,
    textareaRef,
    clearing,
    flash,
    sweep,
    applyTransform,
    commit,
    clear,
    undo,
    redo,
    canUndo: history.canUndo || text !== history.stack[history.index].text,
    canRedo: history.canRedo,
    historyEntries: history.stack,
    historyIndex: history.index,
    restoreCheckpoint,
  };
}
