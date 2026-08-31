import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { m, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity } from "framer-motion";

/**
 * One element that never unmounts and slides between the active items on
 * springs, stretching slightly in the direction it travels. Shared by the
 * primary nav and the developer tabs so every selector has one motion language.
 * Adapted (leaner) from the portfolio's LiquidIndicator.
 *
 * Geometry is read from the offsetLeft/offsetTop chain, not
 * getBoundingClientRect — every item is wrapped in a magnetic pull whose live
 * transform a rect read would fold in. Both axes are tracked, so the marker
 * sits exactly on the item regardless of the container's padding.
 */
const TRAVEL = { stiffness: 320, damping: 30, mass: 0.9 };
const SIZE = { stiffness: 380, damping: 34, mass: 0.8 };
const VELOCITY_FOR_MAX_STRETCH = 2600;
const MAX_STRETCH = 0.26;

export default function LiquidIndicator({ containerRef, getTarget, dependency, live = false, getOverride, className = "" }) {
  const reduceMotion = useReducedMotion();
  const placed = useRef(false);
  const getTargetRef = useRef(getTarget);
  getTargetRef.current = getTarget;
  const getOverrideRef = useRef(getOverride);
  getOverrideRef.current = getOverride;

  const x = useSpring(0, TRAVEL);
  const y = useSpring(0, TRAVEL);
  const width = useSpring(0, SIZE);
  const height = useSpring(0, SIZE);
  const opacity = useMotionValue(0);

  const velocityX = useVelocity(x);
  const stretch = useSpring(
    useTransform(velocityX, (v) =>
      reduceMotion ? 0 : Math.min(Math.abs(v) / VELOCITY_FOR_MAX_STRETCH, 1) * MAX_STRETCH,
    ),
    { stiffness: 260, damping: 26, mass: 0.6 },
  );
  const scaleX = useTransform(stretch, (s) => 1 + s);
  const scaleY = useTransform(stretch, (s) => 1 - s * 0.5);

  const measure = useCallback(() => {
    const target = getTargetRef.current();
    const container = containerRef.current;
    if (!target || !container) {
      opacity.set(0);
      return;
    }
    let ox = 0;
    let oy = 0;
    let node = target;
    while (node && node !== container) {
      ox += node.offsetLeft;
      oy += node.offsetTop;
      node = node.offsetParent;
    }
    const override = getOverrideRef.current?.();
    const nx = override?.x ?? ox;
    const ny = override?.y ?? oy;
    const nw = override?.width ?? target.offsetWidth;
    const nh = override?.height ?? target.offsetHeight;
    if (!nw || !nh) return;
    if (!placed.current || reduceMotion) {
      placed.current = true;
      x.jump(nx);
      y.jump(ny);
      width.jump(nw);
      height.jump(nh);
    } else {
      x.set(nx);
      y.set(ny);
      width.set(nw);
      height.set(nh);
    }
    opacity.set(1);
  }, [containerRef, reduceMotion, x, y, width, height, opacity]);

  useLayoutEffect(() => {
    measure();
  }, [measure, dependency]);

  useEffect(() => {
    if (!live) return undefined;
    let frame = requestAnimationFrame(function tick() {
      measure();
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [live, measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <m.span
      aria-hidden="true"
      className={className}
      style={{ x, y, width, height, opacity, scaleX, scaleY, position: "absolute", top: 0, left: 0 }}
    />
  );
}
