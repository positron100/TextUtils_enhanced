import { useState } from "react";
import { useMotionValue, useReducedMotion, animate } from "framer-motion";

/**
 * Horizontal drag / swipe between adjacent surfaces. The current card tracks the
 * pointer along x; releasing past a distance or velocity threshold commits to
 * the neighbour, otherwise it springs back.
 *
 * Vertical intent wins: if the first meaningful movement is more vertical than
 * horizontal the gesture is abandoned so page / textarea scrolling stays
 * completely natural. Pointer events only (mouse + touch + pen).
 *
 * Exposes `dragging` / `dragDir` so a caller can peek the adjacent card.
 */
const AXIS_LOCK_PX = 16;
const COMMIT_DISTANCE_FRAC = 0.24;
const COMMIT_VELOCITY = 0.5; // px/ms
const EDGE_RESISTANCE = 0.32;

// A swipe starts from the surface itself — never from a control or a scrollable
// field, where the gesture belongs to that element (a click, text selection, a
// native scroll). This is what keeps a pill click from ever being navigation.
const NO_SWIPE =
  "button, a, input, textarea, select, [contenteditable], [role='tab'], [role='menuitem'], [role='option'], [role='switch'], [data-no-swipe]";

export function useSwipeNav({ onNavigate, canPrev, canNext, enabled = true }) {
  const x = useMotionValue(0);
  const reduce = useReducedMotion();
  const [drag, setDrag] = useState({ dragging: false, dir: 0 });

  const active = enabled && !reduce && !!onNavigate;

  // Plain refs held on the hook's own closure via a lazy object.
  const s = useLazyRef(() => ({ start: null, axis: null, samples: [], width: 1 }));

  function down(event) {
    if (!active) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest?.(NO_SWIPE)) {
      s.start = null;
      return;
    }
    event.stopPropagation();
    s.start = { x: event.clientX, y: event.clientY, t: event.timeStamp };
    s.axis = null;
    s.samples = [{ x: event.clientX, t: event.timeStamp }];
    s.width = event.currentTarget.offsetWidth || 1;
  }

  function move(event) {
    if (!active || !s.start) return;
    const dx = event.clientX - s.start.x;
    const dy = event.clientY - s.start.y;

    if (s.axis === null) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      s.axis = Math.abs(dx) > Math.abs(dy) * 1.5 ? "h" : "v";
      if (s.axis === "h") {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* nice-to-have */
        }
      }
    }
    if (s.axis !== "h") return;

    let next = dx;
    const blocked = (dx > 0 && !canPrev) || (dx < 0 && !canNext);
    if (blocked) next = dx * EDGE_RESISTANCE;
    x.set(next);
    const dir = next < 0 ? 1 : next > 0 ? -1 : 0;
    if (!blocked && dir !== 0) setDrag((d) => (d.dragging && d.dir === dir ? d : { dragging: true, dir }));
    s.samples.push({ x: event.clientX, t: event.timeStamp });
    if (s.samples.length > 5) s.samples.shift();
  }

  function up(event) {
    if (!s.start) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    const wasH = s.axis === "h";
    s.start = null;
    s.axis = null;
    setDrag({ dragging: false, dir: 0 });
    if (!wasH) return;

    const dx = x.get();
    const sm = s.samples;
    const v = sm.length >= 2 ? (sm[sm.length - 1].x - sm[0].x) / Math.max(1, sm[sm.length - 1].t - sm[0].t) : 0;
    const threshold = s.width * COMMIT_DISTANCE_FRAC;

    let dir = 0;
    if ((dx < -threshold || v < -COMMIT_VELOCITY) && canNext) dir = 1;
    else if ((dx > threshold || v > COMMIT_VELOCITY) && canPrev) dir = -1;

    if (dir !== 0) {
      animate(x, dir === 1 ? -s.width * 0.25 : s.width * 0.25, {
        type: "spring",
        stiffness: 420,
        damping: 42,
      }).then(() => x.set(0));
      onNavigate(dir);
    } else {
      animate(x, 0, { type: "spring", stiffness: 520, damping: 44 });
    }
  }

  return {
    x,
    dragging: drag.dragging,
    dragDir: drag.dir,
    handlers: active
      ? { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up }
      : {},
  };
}

// A ref-like object created once per hook instance without a second import.
function useLazyRef(init) {
  const [obj] = useState(init);
  return obj;
}
