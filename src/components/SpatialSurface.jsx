import { AnimatePresence, m } from "framer-motion";
import { useSwipeNav } from "../hooks/useSwipeNav.js";
import { spatialVariants, spatialTransition, spatialSpringMedium } from "../lib/spatial.js";
import "./SpatialSurface.css";

/**
 * The shared spatial-transition surface. Whenever `trackKey` changes the new
 * card slides on from the direction of travel — a physical pass, not a
 * cross-fade. Reused for primary views, developer tabs, developer results and
 * typing modes so they all share one motion language.
 *
 * `nested` surfaces (one SpatialSurface inside another — the developer tools,
 * the typing modes) skip AnimatePresence and just animate the incoming card
 * in: nested AnimatePresence exit handling is unreliable, and the outgoing
 * content is gone the instant the new one is ready anyway.
 *
 * Optional `drag`: `{ onNavigate, canPrev, canNext }` makes the surface
 * swipeable; `renderPeek(dir)` draws the adjacent card while dragging.
 *
 * Optional `onSettled`: called once an incoming card has finished arriving —
 * however it was triggered (nav, drag, ⌘K). The command palette uses it to run
 * a command only after its view is actually on stage.
 */
export default function SpatialSurface({
  trackKey,
  direction = 0,
  drag,
  dragController,
  renderPeek,
  nested = false,
  className = "",
  cardClassName = "",
  label,
  onSettled,
  children,
}) {
  // A nested surface owns its gesture; the primary stage is handed one it
  // shares with the nav bar, so both drive the same translation.
  const own = useSwipeNav(drag ?? { onNavigate: null, canPrev: false, canNext: false });
  const ctrl = dragController ?? own;
  const { x, handlers, dragging, dragDir, registerStage } = ctrl;
  const enabled = !!(dragController || drag?.onNavigate);

  const card = (
    <m.div
      key={trackKey}
      custom={direction}
      variants={spatialVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={spatialTransition}
      onAnimationComplete={(definition) => {
        // Only the arrival, never the exit of the card being replaced.
        if (definition === "center") onSettled?.();
      }}
      className={`spatial__card ${cardClassName}`.trim()}
      aria-label={label}
    >
      {children}
    </m.div>
  );

  return (
    <div
      className={`spatial ${className}`.trim()}
      ref={registerStage}
      {...(enabled ? handlers : {})}
    >
      {enabled && renderPeek && dragging && dragDir !== 0 && (
        <m.div
          className="spatial__peek"
          style={{ x, left: dragDir > 0 ? "100%" : "-100%" }}
          aria-hidden="true"
        >
          {renderPeek(dragDir)}
        </m.div>
      )}
      <m.div className="spatial__track" style={enabled ? { x } : undefined}>
        {nested ? (
          <m.div
            key={trackKey}
            className={`spatial__card ${cardClassName}`.trim()}
            initial={{ x: direction >= 0 ? "22%" : "-22%", opacity: 0 }}
            animate={{ x: "0%", opacity: 1 }}
            transition={spatialSpringMedium}
            aria-label={label}
          >
            {children}
          </m.div>
        ) : (
          <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            {card}
          </AnimatePresence>
        )}
      </m.div>
    </div>
  );
}
