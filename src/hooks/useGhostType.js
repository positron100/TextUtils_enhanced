import { useEffect, useRef, useState } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Types `text` out one character at a time while `active` is true — a ghost
 * preview, never the real value. Clears the instant `active` goes false, so
 * real typing always wins. `onDone` fires once the string is fully typed
 * (used to advance a sequence). Adapted from the portfolio's useTypingPreview.
 *
 * Deliberately just two hooks (state + effect) and no reduced-motion hook —
 * this renders inside framer's AnimatePresence measure pass, where an extra
 * conditional hook anywhere upstream is a hazard.
 */
export function useGhostType(text, active, { onDone, speed = 42 } = {}) {
  const [display, setDisplay] = useState("");
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!active || prefersReduced()) {
      setDisplay("");
      return undefined;
    }
    let cancelled = false;
    let timer;
    const step = (i) => {
      if (cancelled) return;
      setDisplay(text.slice(0, i));
      if (i < text.length) {
        timer = window.setTimeout(() => step(i + 1), speed + Math.random() * 34);
      } else {
        doneRef.current?.();
      }
    };
    timer = window.setTimeout(() => step(1), 320);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, text, speed]);

  return display;
}
