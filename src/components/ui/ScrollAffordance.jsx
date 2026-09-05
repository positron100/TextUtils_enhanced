import { useEffect, useRef, useState } from "react";
import GlassPill from "./GlassPill.jsx";
import { useReducedMotion } from "../../hooks/useReducedMotion.js";
import "./ScrollAffordance.css";

/**
 * The one replacement for a visible scrollbar.
 *
 * Native scrolling is untouched — wheel, trackpad, touch, keyboard, PageUp /
 * PageDown / Home / End and assistive scrolling all still drive the container.
 * This adds a single glass control that appears only while it is useful:
 * ↓ while there is content below, ↑ once the bottom is reached and there is
 * content above, and nothing at all when the content fits.
 *
 * Two placements, one component:
 *   dock  — the default. Rendered as the LAST CHILD of the scroll container; a
 *           zero-height `position: sticky` host pins it to the bottom of the
 *           scrollport without taking a single pixel of layout, so no panel
 *           changes size or shifts when it appears.
 *   page  — `page`, for the document scroller: a fixed, safe-area-aware corner.
 *
 * It is a real <button> (GlassPill), so it inherits the project's magnetic
 * pull, liquid highlight, press physics, focus ring and reduced-motion
 * behaviour rather than reimplementing any of them.
 */
export default function ScrollAffordance({
  targetRef,
  page = false,
  as: Tag = "div",
  className = "",
  /** Fraction of the scrollport travelled per activation — a page, not a jump. */
  amount = 0.85,
  ...rest
}) {
  const reduced = useReducedMotion();
  const [{ up, down }, setState] = useState({ up: false, down: false });
  const elRef = useRef(null);

  useEffect(() => {
    const el = page ? document.scrollingElement || document.documentElement : targetRef?.current;
    if (!el) return undefined;
    elRef.current = el;
    const scroller = page ? window : el;

    const measure = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      // A hair of slack: sub-pixel layout should not leave a stranded arrow.
      const slack = 4;
      const next = {
        up: scrollTop > slack,
        down: scrollHeight - scrollTop - clientHeight > slack,
      };
      setState((prev) => (prev.up === next.up && prev.down === next.down ? prev : next));
    };

    // Coalesced to one measurement per frame: several of these fire together
    // and each one reads layout.
    let frame = null;
    const schedule = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        measure();
      });
    };

    measure();
    scroller.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    // Content added or removed is what changes whether there is anywhere left
    // to scroll. For the document a ResizeObserver is not enough on its own:
    // <html> and <body> are viewport-height boxes here, so they never resize
    // when the page below them grows — only the mutation tells us.
    const mo = new MutationObserver(schedule);
    mo.observe(el, { childList: true, subtree: true });

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ro.disconnect();
      mo.disconnect();
    };
  }, [page, targetRef]);

  // Down while there is anywhere below to go; up only once the bottom is
  // reached. Neither means the content fits, and nothing renders.
  const dir = down ? "down" : up ? "up" : null;

  const scroll = () => {
    const el = elRef.current;
    if (!el) return;
    const step = el.clientHeight * amount * (dir === "down" ? 1 : -1);
    const from = el.scrollTop;
    el.scrollBy({ top: step, behavior: reduced ? "auto" : "smooth" });
    if (reduced) return;
    // Some engines ignore `behavior: "smooth"` outright (headless and embedded
    // Chromium among them) and scroll nowhere at all. If nothing has moved by
    // the time a real smooth scroll would have started, place it directly —
    // a control that silently does nothing is the worse failure.
    window.setTimeout(() => {
      if (el.scrollTop === from) el.scrollTop = from + step;
    }, 60);
  };

  return (
    <Tag
      className={`scrollhint__dock${page ? " scrollhint__dock--page" : ""}${className ? ` ${className}` : ""}`}
      data-dir={dir ?? "none"}
      {...rest}
    >
      {/* The appearance is a CSS keyframe, not a presence animation: the pill
          carries the magnetic pull's own motion values, and driving enter/exit
          through framer as well left the control mounted at zero opacity. The
          arrow itself turns over in place when the direction changes. */}
      {dir && (
        <GlassPill
          className="scrollhint"
          magnetic={5}
          data-no-swipe
          onClick={scroll}
          aria-label={dir === "down" ? "Scroll down" : "Scroll up"}
        >
          <Chevron dir={dir} />
        </GlassPill>
      )}
    </Tag>
  );
}

function Chevron({ dir }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={dir === "up" ? { transform: "rotate(180deg)" } : undefined}
    >
      <path d="M6 9.5 12 15.5 18 9.5" />
    </svg>
  );
}
