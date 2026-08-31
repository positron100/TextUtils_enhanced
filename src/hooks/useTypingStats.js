import { useCallback, useEffect, useRef, useState } from "react";
import { activeTypingMs, estimateWpm, IDLE_GAP_MS } from "../lib/text/typing.js";

/**
 * Free-writing typing telemetry. Call `onType()` from the editor's onChange.
 * There is no reference text here, so we only ever report *speed* — never
 * accuracy (see TypingTest for the accuracy model).
 *
 * Keystroke timestamps drive "active time" (idle gaps excluded); the running
 * character count drives the WPM estimate. A once-per-second tick keeps the
 * readout live while the panel is mounted.
 */
export function useTypingStats() {
  const stamps = useRef([]);
  const chars = useRef(0);
  const lastLen = useRef(0);
  const [, setTick] = useState(0);

  const onType = useCallback((value) => {
    const now = Date.now();
    stamps.current.push(now);
    if (stamps.current.length > 4000) stamps.current.shift();
    const added = value.length - lastLen.current;
    if (added > 0) chars.current += added;
    lastLen.current = value.length;
    setTick((t) => t + 1);
  }, []);

  const reset = useCallback(() => {
    stamps.current = [];
    chars.current = 0;
    lastLen.current = 0;
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const list = stamps.current;
  const activeMs = activeTypingMs(list);
  const last = list[list.length - 1] ?? 0;
  const typing = last > 0 && Date.now() - last < IDLE_GAP_MS;

  return {
    onType,
    reset,
    typing,
    hasData: list.length > 3,
    wpm: estimateWpm(chars.current, activeMs),
    activeMs,
    keystrokes: chars.current,
  };
}
