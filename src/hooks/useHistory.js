import { useCallback, useReducer } from "react";

const MAX = 100;

/**
 * A checkpoint stack for the editor text. Checkpoints are created explicitly
 * (transforms, clear) or coarsely while typing — never per keystroke. In
 * memory only; nothing is persisted.
 *
 * The live editor text is owned by useEditorController; this hook only stores
 * snapshots and tracks which one is "current" so undo/redo can walk them.
 */
function reducer(state, action) {
  switch (action.type) {
    case "checkpoint": {
      const { text, label, selection } = action;
      const kept = state.stack.slice(0, state.index + 1);
      if (kept[kept.length - 1]?.text === text) return state;
      let next = [...kept, { text, label, selection: selection ?? null }];
      const overflow = Math.max(0, next.length - MAX);
      if (overflow) next = next.slice(overflow);
      return { stack: next, index: next.length - 1 };
    }
    case "stepTo": {
      const index = Math.min(Math.max(action.index, 0), state.stack.length - 1);
      return index === state.index ? state : { ...state, index };
    }
    case "reset":
      return { stack: [{ text: action.text, label: "Start", selection: null }], index: 0 };
    default:
      return state;
  }
}

export function useHistory(initial = "") {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    stack: [{ text: initial, label: "Start", selection: null }],
    index: 0,
  }));

  const checkpoint = useCallback(
    (text, label, selection) => dispatch({ type: "checkpoint", text, label, selection }),
    [],
  );
  const stepTo = useCallback((index) => dispatch({ type: "stepTo", index }), []);
  const reset = useCallback((text) => dispatch({ type: "reset", text }), []);

  return {
    stack: state.stack,
    index: state.index,
    current: state.stack[state.index],
    canUndo: state.index > 0,
    canRedo: state.index < state.stack.length - 1,
    checkpoint,
    stepTo,
    reset,
  };
}
