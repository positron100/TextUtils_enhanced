import { useCallback, useState } from "react";

/**
 * Whether the opening reveal should play. Plays on every load. Skipped only
 * under reduced motion — decided synchronously in the initializer, before the
 * first paint, so the overlay never mounts for a reduced-motion user and the
 * app is never shown early for everyone else.
 */
export function useIntroReveal() {
  const [done, setDone] = useState(() => {
    try {
      if (typeof window === "undefined") return true;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return true;
    }
  });

  const finish = useCallback(() => setDone(true), []);
  return { introDone: done, finishIntro: finish };
}
