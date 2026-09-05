import { useState } from "react";
import { useMotionValue, useReducedMotion, animate } from "framer-motion";

/**
 * The one horizontal-drag gesture behind every spatial transition.
 *
 * A gesture writes a raw pointer target into a ref; a frame loop chases it and
 * is the only thing that touches the motion value. That split is the reason
 * this reads as direct manipulation: driving the visual straight from
 * `pointermove` advances it only on frames where a sample happens to land, and
 * the nav's gesture amplifies pointer travel several times over, so every gap
 * in the sample stream would show up as a visible step. (Same model as the
 * portfolio's opening-sequence scrub, and for the same measured reason.)
 *
 * One controller can be driven from more than one surface. The primary stage
 * shares a single instance between the card itself and the nav bar:
 *
 *   surfaceHandlers — 1:1, the card follows the finger exactly
 *   navHandlers     — amplified, so a short pull across the bar moves the whole
 *                     stage; the bar is a control for the same transition
 *                     rather than a second way of triggering it
 *
 * Either way the stage translates *during* the drag, the neighbour comes in
 * behind it, and release either completes the existing card-swipe or springs
 * back. Nothing here waits for release to start moving.
 */

/** Movement before the gesture decides horizontal or vertical. Vertical wins,
 * so page and textarea scrolling stay completely natural. */
const AXIS_LOCK_PX = 16;
const COMMIT_DISTANCE_FRAC = 0.24;
/** px/ms of pointer travel that commits regardless of distance. */
const COMMIT_VELOCITY = 0.5;
const EDGE_RESISTANCE = 0.32;
/** Pointer travel across the nav that equals one full stage width. */
const NAV_DRAG_RANGE_PX = 320;
/** Time constant (ms) for the per-frame chase toward the raw pointer target. */
const SCRUB_TAU_MS = 35;
/** A drag must not also fire the click that follows its own pointerup. */
const CLICK_SUPPRESS_MS = 320;

// A drag starts from the surface itself — never from a control or a scrollable
// field, where the gesture belongs to that element (a click, text selection, a
// native scroll).
export const NO_SWIPE =
  "button, a, input, textarea, select, [contenteditable], [role='tab'], [role='menuitem'], [role='option'], [role='switch'], [data-no-swipe]";

/** The narrower list for a surface made *of* controls — the nav bar. Buttons
 * there stay draggable or there is nothing left to grab; a tap still clicks
 * and only a horizontal drag becomes navigation. */
export const NO_SWIPE_CONTROLS =
  "input, textarea, select, [contenteditable], [role='menuitem'], [role='option'], [data-no-swipe]";

export function useSwipeNav({ onNavigate, canPrev, canNext, enabled = true }) {
  /** Stage translation in px. The single value every surface writes and the
   * stage renders from. */
  const x = useMotionValue(0);
  /** Signed 0..±1 travel toward the commit point, for the nav indicator. */
  const progress = useMotionValue(0);
  const reduce = useReducedMotion();
  const [drag, setDrag] = useState({ dragging: false, dir: 0 });

  const active = enabled && !reduce && !!onNavigate;

  const s = useLazyRef(() => ({
    start: null,
    axis: null,
    samples: [],
    width: 1,
    gain: 1,
    target: 0,
    frame: null,
    last: null,
    suppress: false,
    suppressTimer: 0,
    stageEl: null,
  }));

  /** The stage's own width — the distance one view travels. Registered by the
   * surface so the nav, which is a different size entirely, still commits and
   * translates in the stage's terms. */
  const registerStage = (el) => {
    if (el) s.stageEl = el;
  };
  const stageWidth = () => s.stageEl?.offsetWidth || window.innerWidth || 1;

  function startLoop() {
    if (s.frame !== null) return;
    s.last = null;
    const tick = (now) => {
      if (s.axis !== "h") {
        s.frame = null;
        return;
      }
      const dt = s.last === null ? 16 : now - s.last;
      s.last = now;
      const alpha = 1 - Math.exp(-dt / SCRUB_TAU_MS);
      let value = x.get() + (s.target - x.get()) * alpha;
      if (Math.abs(s.target - value) < 0.05) value = s.target;
      x.set(value);
      progress.set(
        Math.max(-1, Math.min(1, value / (s.width * COMMIT_DISTANCE_FRAC))),
      );
      s.frame = requestAnimationFrame(tick);
    };
    s.frame = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (s.frame !== null) cancelAnimationFrame(s.frame);
    s.frame = null;
  }

  /** px/ms over the recent window, stamped with one clock. `event.timeStamp`
   * is not guaranteed to share an origin across input sources. */
  function velocity() {
    const sm = s.samples;
    if (sm.length < 2) return 0;
    const dt = sm[sm.length - 1].t - sm[0].t;
    // Too short a window turns coalesced events into a meaningless spike.
    if (dt < 8) return 0;
    return (sm[sm.length - 1].x - sm[0].x) / dt;
  }

  function makeHandlers({ gain, ignore }) {
    function down(event) {
      if (!active) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.target.closest?.(ignore)) {
        s.start = null;
        return;
      }
      event.stopPropagation();
      s.start = { x: event.clientX, y: event.clientY };
      s.axis = null;
      s.samples = [{ x: event.clientX, t: performance.now() }];
      s.width = stageWidth();
      // The nav is far narrower than the stage it drives, so its pointer
      // travel is scaled into stage space.
      s.gain = gain === "nav" ? s.width / NAV_DRAG_RANGE_PX : 1;
      s.target = 0;
    }

    function move(event) {
      if (!active || !s.start) return;
      const dx = event.clientX - s.start.x;
      const dy = event.clientY - s.start.y;

      if (s.axis === null) {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
        s.axis = Math.abs(dx) > Math.abs(dy) * 1.5 ? "h" : "v";
        if (s.axis !== "h") return;
        s.suppress = true;
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* nice-to-have */
        }
        startLoop();
      }
      if (s.axis !== "h") return;

      let next = dx * s.gain;
      const blocked = (next > 0 && !canPrev) || (next < 0 && !canNext);
      if (blocked) next *= EDGE_RESISTANCE;
      // This handler does no visual work; the frame loop owns it.
      s.target = next;

      const dir = next < 0 ? 1 : next > 0 ? -1 : 0;
      if (!blocked && dir !== 0) {
        setDrag((d) => (d.dragging && d.dir === dir ? d : { dragging: true, dir }));
      }
      s.samples.push({ x: event.clientX, t: performance.now() });
      if (s.samples.length > 6) s.samples.shift();
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
      stopLoop();
      setDrag({ dragging: false, dir: 0 });
      if (!wasH) {
        s.suppress = false;
        return;
      }

      // The click that follows this pointerup belongs to the drag, not to
      // whatever it started over. Cleared on a timer as well as on the click
      // itself, in case no click follows at all.
      s.suppress = true;
      window.clearTimeout(s.suppressTimer);
      s.suppressTimer = window.setTimeout(() => {
        s.suppress = false;
      }, CLICK_SUPPRESS_MS);

      const travelled = s.target;
      const v = velocity();
      const threshold = s.width * COMMIT_DISTANCE_FRAC;

      let dir = 0;
      if ((travelled < -threshold || v < -COMMIT_VELOCITY) && canNext) dir = 1;
      else if ((travelled > threshold || v > COMMIT_VELOCITY) && canPrev) dir = -1;

      progress.set(0);
      if (dir !== 0) {
        // Hand over without a seam. The incoming card enters one stage-width
        // to the side, which — with the track still displaced by the drag —
        // puts it exactly where the peek had reached, so the real view takes
        // over the peek's position rather than appearing somewhere else. Both
        // it and the track then settle to zero together, and the rest of the
        // movement is the ordinary card-swipe.
        onNavigate(dir);
        animate(x, 0, { type: "spring", stiffness: 420, damping: 42 });
      } else {
        animate(x, 0, { type: "spring", stiffness: 520, damping: 44 });
      }
    }

    function clickCapture(event) {
      if (!s.suppress) return;
      s.suppress = false;
      window.clearTimeout(s.suppressTimer);
      event.preventDefault();
      event.stopPropagation();
    }

    return active
      ? {
          onPointerDown: down,
          onPointerMove: move,
          onPointerUp: up,
          onPointerCancel: up,
          onClickCapture: clickCapture,
        }
      : {};
  }

  return {
    x,
    progress,
    dragging: drag.dragging,
    dragDir: drag.dir,
    registerStage,
    /** The surface follows the pointer exactly. */
    handlers: makeHandlers({ gain: 1, ignore: NO_SWIPE }),
    /** The nav bar drives the same stage over a shorter pull. */
    navHandlers: makeHandlers({ gain: "nav", ignore: NO_SWIPE_CONTROLS }),
  };
}

// A ref-like object created once per hook instance without a second import.
function useLazyRef(init) {
  const [obj] = useState(init);
  return obj;
}
