import { useEffect, useRef, useState } from "react";
import { useReducedMotion, useSpring } from "framer-motion";

const PULL_SPRING = { stiffness: 220, damping: 18, mass: 0.4 };

/**
 * The one magnetic interaction: an element drifts subtly toward the cursor
 * while the cursor is over it, and springs back when it leaves. Fine-pointer
 * only, inert under reduced motion and on touch.
 *
 * Ported from the portfolio's `useMagnetic` (framer springs kept; the
 * velocity-driven squash variant is dropped — not used in TextUtils).
 * The rect is measured once when the pointer arrives, not per move, so the
 * pull can't feed back into its own measurement.
 */
export function useMagnetic({ strength = 12, disabled = false } = {}) {
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const rectRef = useRef(null);

  const x = useSpring(0, PULL_SPRING);
  const y = useSpring(0, PULL_SPRING);

  useEffect(() => {
    setEnabled(!reduceMotion && window.matchMedia("(pointer: fine)").matches);
  }, [reduceMotion]);

  useEffect(() => {
    if (!disabled) return;
    x.set(0);
    y.set(0);
  }, [disabled, x, y]);

  useEffect(() => {
    const invalidate = () => {
      rectRef.current = null;
    };
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate);
    return () => {
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
    };
  }, []);

  function onMouseMove(event) {
    if (!enabled || disabled || !ref.current) return;
    const rect = (rectRef.current ??= ref.current.getBoundingClientRect());
    if (!rect.width || !rect.height) return;
    const relX = event.clientX - (rect.left + rect.width / 2);
    const relY = event.clientY - (rect.top + rect.height / 2);
    x.set((relX / (rect.width / 2)) * strength);
    y.set((relY / (rect.height / 2)) * strength);
  }

  function onMouseLeave() {
    rectRef.current = null;
    x.set(0);
    y.set(0);
  }

  const style = enabled ? { x, y } : undefined;

  return { ref, onMouseMove, onMouseLeave, style };
}
