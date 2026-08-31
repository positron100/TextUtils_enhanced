// The theme reveal plays the OPENING animation's exact mechanism: a real
// centred window element that grows via the shared `@keyframes intro-geo`
// (global.css). There is no View Transitions API and no clip-path — the same
// element, the same keyframes, the same per-segment easing as IntroReveal, so
// the two are literally the same animation replayed in a theme-switch context.
//
// How the reveal reads: the new theme is applied to the page underneath
// straight away; the overlay masks the rest of the viewport in the OUTGOING
// page colour, and the window uncovers the real (already re-themed) UI from the
// centre out. Drag-to-scrub maps drag progress onto this animation's
// currentTime (see useThemeToggleController).
//
// Guards preserved:
//  1. data-theme applied synchronously so the page underneath is the new theme
//  2. data-theme-transition suppresses the global colour transition
//  3. module-scoped guard so a second toggle tears the first one down cleanly

export function prefersReducedMotionNow() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

let activeReveal = null; // { cleanup }

function teardown() {
  activeReveal?.cleanup();
}

/**
 * @param {"light"|"dark"} next
 * @param {() => void} applyTheme   applies + persists the theme in React
 * @param {{paused?: boolean}} options
 * @returns {Promise<{animation: Animation} | null>}  null when there is no reveal
 */
export async function startThemeReveal(next, applyTheme, options = {}) {
  if (typeof document === "undefined") {
    applyTheme();
    return null;
  }

  const root = document.documentElement;
  teardown();

  // Read the outgoing page colour BEFORE the theme flips.
  const outgoingShade =
    getComputedStyle(root).getPropertyValue("--bg").trim() || "#000";

  applyTheme();
  root.setAttribute("data-theme", next);
  persist(next);

  if (prefersReducedMotionNow()) return null;

  root.setAttribute("data-theme-transition", next);

  const overlay = document.createElement("div");
  overlay.className = "theme-reveal";
  overlay.setAttribute("aria-hidden", "true");

  const windowEl = document.createElement("div");
  windowEl.className = "theme-reveal__window";
  windowEl.style.setProperty("--reveal-shade", outgoingShade);
  overlay.appendChild(windowEl);
  document.body.appendChild(overlay);

  // Force style resolution so the CSS animation is registered.
  void windowEl.offsetWidth;
  const animation = windowEl.getAnimations()[0] ?? null;

  if (!animation) {
    overlay.remove();
    root.removeAttribute("data-theme-transition");
    return null;
  }

  const record = { cleanup: null };
  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    clearTimeout(failsafe);
    overlay.remove();
    try {
      animation.cancel();
    } catch {
      /* already settled */
    }
    if (activeReveal === record) {
      root.removeAttribute("data-theme-transition");
      activeReveal = null;
    }
  };
  record.cleanup = cleanup;

  animation.finished.then(cleanup, cleanup);
  // If `finished` never settles (animation cancelled by a style recalc), don't
  // strand the overlay / the transition-suppression attribute.
  const failsafe = setTimeout(cleanup, 1600);

  if (options.paused) animation.pause();
  activeReveal = record;

  return { animation };
}

function persist(theme) {
  try {
    localStorage.setItem("textutils:theme", theme);
  } catch {
    /* private mode */
  }
}
