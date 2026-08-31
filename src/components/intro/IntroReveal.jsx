import { useEffect } from "react";
import "./IntroReveal.css";

const DURATION_MS = 1000;

/**
 * The opening, built from geometry:
 *
 *   point → square → horizontal bar → full-width bar → vertical expansion → UI
 *
 * One element: a transparent window with a viewport-sized `box-shadow` in a
 * slightly darker page shade. Everything outside the window is covered;
 * growing the window uncovers the app (already rendered underneath). Width
 * leads, height follows. A pure CSS keyframe animation drives it — no
 * per-frame JS. Only mounted when it will play (see useIntroReveal — skipped
 * and never mounted under reduced motion).
 */
export default function IntroReveal({ onDone }) {
  useEffect(() => {
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const timer = window.setTimeout(onDone, DURATION_MS);
    return () => {
      window.clearTimeout(timer);
      root.style.overflow = prevOverflow;
    };
  }, [onDone]);

  return (
    <div className="intro" aria-hidden="true">
      <span className="intro__seed" />
      <div className="intro__window" />
    </div>
  );
}
