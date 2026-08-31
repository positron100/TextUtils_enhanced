// One motion language for every spatial surface transition in the app —
// primary views, developer tabs, developer results, editor transformations,
// developer input clear, typing modes. The incoming card was "already beside"
// the current one and slides onto the stage; the outgoing one leaves.
//
// `direction`: +1 forward through an ordered set, -1 back.

export const spatialVariants = {
  enter: (dir) => ({ x: dir >= 0 ? "100%" : "-100%", opacity: 0.7 }),
  center: { x: "0%", opacity: 1 },
  exit: (dir) => ({ x: dir >= 0 ? "-100%" : "100%", opacity: 0.7 }),
};

/** Primary view stage — noticeable but brisk. No bounce. */
export const spatialSpring = { type: "spring", stiffness: 260, damping: 34, mass: 0.95 };

/** Medium tier — developer tools / results / input clear / typing modes /
 *  the editor card-swipe. A touch slower so the physical pass registers. */
export const spatialSpringMedium = { type: "spring", stiffness: 190, damping: 30, mass: 1 };

/** Opacity is a supporting effect only. */
export const spatialOpacity = { duration: 0.18, ease: [0.4, 0, 1, 1] };

export const spatialTransition = { x: spatialSpring, opacity: spatialOpacity };
