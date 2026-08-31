import { useRef } from "react";
import { useMotionValue } from "framer-motion";
import { startThemeReveal, prefersReducedMotionNow } from "../lib/themeTransition.js";
import { viewTransition } from "../lib/motion.js";

// Ported from the portfolio's useThemeToggleController.ts.
//
// A plain click/tap/keyboard activation runs the full circular reveal. The
// same button also supports dragging — the drag distance scrubs the reveal's
// progress via animation.currentTime (no React re-renders per pointer move),
// and release plays it to completion or reverses it based on progress + flick
// velocity. `darkness` (0 light, 1 dark) tracks the smoothed visual progress
// for the knob position + sun/moon icons.

const DRAG_THRESHOLD_PX = 6;
const DRAG_RANGE_PX = 150;
const FLICK_VELOCITY_PX_MS = 0.55;
const SMOOTHING_TAU_MS = 40;

export function useThemeToggleController(theme, setTheme) {
  const darkness = useMotionValue(theme === "dark" ? 1 : 0);

  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const directionRef = useRef(1);
  const nextThemeRef = useRef("dark");
  const originalThemeRef = useRef(theme);
  const animationRef = useRef(null);
  const progressRef = useRef(0);
  const smoothedProgressRef = useRef(0);
  const scrubFrameRef = useRef(null);
  const samplesRef = useRef([]);
  const suppressClickRef = useRef(false);
  const themeFlippedRef = useRef(false);
  const revealSettledRef = useRef(false);
  const pendingReleaseRef = useRef(null);
  const gestureIdRef = useRef(0);

  function applyDarkness(progress) {
    darkness.set(directionRef.current === 1 ? progress : 1 - progress);
  }

  function startScrubLoop() {
    let lastTime = null;
    function tick(now) {
      if (!draggingRef.current) {
        scrubFrameRef.current = null;
        return;
      }
      const dt = lastTime === null ? 16 : now - lastTime;
      lastTime = now;
      const target = progressRef.current;
      const alpha = 1 - Math.exp(-dt / SMOOTHING_TAU_MS);
      let smoothed =
        smoothedProgressRef.current + (target - smoothedProgressRef.current) * alpha;
      if (Math.abs(target - smoothed) < 0.0015) smoothed = target;
      smoothedProgressRef.current = smoothed;
      applyDarkness(smoothed);
      if (animationRef.current) {
        animationRef.current.currentTime = smoothed * viewTransition.durationMs;
      }
      scrubFrameRef.current = requestAnimationFrame(tick);
    }
    if (scrubFrameRef.current === null) {
      scrubFrameRef.current = requestAnimationFrame(tick);
    }
  }

  function pollAnimation(animation) {
    function tick() {
      if (animation.playState !== "running") {
        applyDarkness(animation.playbackRate > 0 ? 1 : 0);
        return;
      }
      const t = typeof animation.currentTime === "number" ? animation.currentTime : 0;
      applyDarkness(Math.min(1, Math.max(0, t / viewTransition.durationMs)));
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function revertToOriginalTheme() {
    setTheme(originalThemeRef.current);
    document.documentElement.setAttribute("data-theme", originalThemeRef.current);
  }

  function finalizeWithoutAnimation(commit) {
    if (commit) {
      if (!themeFlippedRef.current) setTheme(nextThemeRef.current);
      darkness.set(nextThemeRef.current === "dark" ? 1 : 0);
    } else {
      if (themeFlippedRef.current) revertToOriginalTheme();
      darkness.set(originalThemeRef.current === "dark" ? 1 : 0);
    }
  }

  function applyDecisionToAnimation(animation, commit) {
    if (!commit) revertToOriginalTheme();
    animation.playbackRate = commit ? 1 : -1;
    animation.play();
    pollAnimation(animation);
  }

  function triggerFullTransition() {
    const next = theme === "dark" ? "light" : "dark";
    directionRef.current = next === "dark" ? 1 : -1;

    if (prefersReducedMotionNow()) {
      setTheme(next);
      darkness.set(next === "dark" ? 1 : 0);
      return;
    }

    void startThemeReveal(next, () => setTheme(next)).then((handle) => {
      if (!handle) {
        darkness.set(next === "dark" ? 1 : 0);
        return;
      }
      pollAnimation(handle.animation);
    });

    // Guarantee the theme actually changed even if the View Transition path
    // was interrupted by a rapid second activation.
    window.setTimeout(() => {
      if (document.documentElement.getAttribute("data-theme") !== next) {
        setTheme(next);
        document.documentElement.setAttribute("data-theme", next);
        darkness.set(next === "dark" ? 1 : 0);
      }
    }, 80);
  }

  function handlePointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    gestureIdRef.current += 1;
    draggingRef.current = false;
    startXRef.current = event.clientX;
    progressRef.current = 0;
    smoothedProgressRef.current = 0;
    samplesRef.current = [{ x: event.clientX, t: event.timeStamp }];
    originalThemeRef.current = theme;
    nextThemeRef.current = theme === "dark" ? "light" : "dark";
    directionRef.current = nextThemeRef.current === "dark" ? 1 : -1;
    animationRef.current = null;
    themeFlippedRef.current = false;
    revealSettledRef.current = false;
    pendingReleaseRef.current = null;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* nice-to-have */
    }
  }

  function handlePointerMove(event) {
    if (event.buttons === 0) return;
    const deltaX = event.clientX - startXRef.current;

    if (!draggingRef.current) {
      if (Math.abs(deltaX) < DRAG_THRESHOLD_PX) return;
      draggingRef.current = true;
      startScrubLoop();

      if (!prefersReducedMotionNow()) {
        themeFlippedRef.current = true;
        const gestureId = gestureIdRef.current;
        void startThemeReveal(
          nextThemeRef.current,
          () => setTheme(nextThemeRef.current),
          { paused: true },
        ).then((handle) => {
          if (gestureIdRef.current !== gestureId) return;
          revealSettledRef.current = true;
          if (!handle) {
            if (pendingReleaseRef.current !== null) {
              const commit = pendingReleaseRef.current;
              pendingReleaseRef.current = null;
              finalizeWithoutAnimation(commit);
            }
            return;
          }
          animationRef.current = handle.animation;
          animationRef.current.currentTime =
            smoothedProgressRef.current * viewTransition.durationMs;
          if (pendingReleaseRef.current !== null) {
            const commit = pendingReleaseRef.current;
            pendingReleaseRef.current = null;
            applyDecisionToAnimation(animationRef.current, commit);
          }
        });
      }
    }

    progressRef.current = Math.min(
      1,
      Math.max(0, (directionRef.current * deltaX) / DRAG_RANGE_PX),
    );
    samplesRef.current.push({ x: event.clientX, t: event.timeStamp });
    if (samplesRef.current.length > 6) samplesRef.current.shift();
  }

  function computeVelocity() {
    const samples = samplesRef.current;
    if (samples.length < 2) return 0;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = last.t - first.t;
    if (dt < 8) return 0;
    return (directionRef.current * (last.x - first.x)) / dt;
  }

  function commitOrCancel(commit) {
    if (animationRef.current) {
      applyDecisionToAnimation(animationRef.current, commit);
      return;
    }
    if (themeFlippedRef.current && !revealSettledRef.current) {
      pendingReleaseRef.current = commit;
      return;
    }
    finalizeWithoutAnimation(commit);
  }

  function endDrag(event) {
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    if (!draggingRef.current) {
      draggingRef.current = false;
      return;
    }
    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 400);

    const velocity = computeVelocity();
    let commit;
    if (velocity > FLICK_VELOCITY_PX_MS) commit = true;
    else if (velocity < -FLICK_VELOCITY_PX_MS) commit = false;
    else commit = progressRef.current >= 0.5;

    draggingRef.current = false;
    commitOrCancel(commit);
    animationRef.current = null;
  }

  function cancelDrag(event) {
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    if (!draggingRef.current) return;
    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 400);
    draggingRef.current = false;
    commitOrCancel(false);
    animationRef.current = null;
  }

  function handleClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    gestureIdRef.current += 1;
    triggerFullTransition();
  }

  return {
    darkness,
    handleClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: endDrag,
    handlePointerCancel: cancelDrag,
  };
}
