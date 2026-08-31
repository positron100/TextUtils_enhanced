// Shared motion vocabulary for framer-motion surfaces. Durations in seconds.
// Mirrors the CSS token scale in tokens.css:
//   micro   ~0.10s  press / hover / icon
//   state   ~0.18s  feedback / selection
//   surface ~0.24s  popovers / nav / tool surface
//   entrance ~0.44s initial reveal only

export const duration = {
  micro: 0.1,
  state: 0.18,
  surface: 0.24,
  entrance: 0.44,
};

export const ease = {
  standard: [0.16, 1, 0.3, 1],
  entrance: [0.22, 1, 0.36, 1],
  exit: [0.4, 0, 1, 1],
};

export const spring = {
  /** Snappy — nav pills, icon bars, small controls. */
  snappy: { type: "spring", stiffness: 500, damping: 32, mass: 0.7 },
  /** Soft — panels, surfaces settling into place. */
  soft: { type: "spring", stiffness: 300, damping: 30, mass: 0.9 },
  /** Liquid indicator — a touch looser so width/height morphs read as fluid. */
  liquid: { type: "spring", stiffness: 380, damping: 30, mass: 0.8 },
};

export const hoverLift = { y: -2 };
export const pressScale = { scale: 0.96 };

/** Theme reveal timing (ms). The reveal itself runs the shared `@keyframes
 *  intro-geo` (global.css); this is the matching clock the drag-scrub maps
 *  progress onto. Keep in sync with that keyframe's `1s cubic-bezier(...)` and
 *  with IntroReveal (`DURATION_MS = 1000`). */
export const viewTransition = {
  durationMs: 1000,
  easing: "cubic-bezier(0.62, 0, 0.15, 1)",
};
