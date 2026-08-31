import { m, useTransform } from "framer-motion";
import { useThemeToggleController } from "../hooks/useThemeToggleController.js";
import "./ThemeToggle.css";

const KNOB_TRAVEL_PX = 22;

/**
 * Click / tap / keyboard runs the full geometric theme reveal (same language as
 * the opening animation, from the viewport centre); dragging the knob scrubs
 * that same reveal. Reduced motion / persistence handled in the controller.
 */
export default function ThemeToggle({ theme, setTheme }) {
  const {
    darkness,
    handleClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  } = useThemeToggleController(theme, setTheme);

  const knobX = useTransform(darkness, [0, 1], [0, KNOB_TRAVEL_PX]);
  const sunOpacity = useTransform(darkness, [0, 0.5, 1], [1, 0, 0]);
  const sunRotate = useTransform(darkness, [0, 1], [0, 80]);
  const sunScale = useTransform(darkness, [0, 1], [1, 0.4]);
  const moonOpacity = useTransform(darkness, [0, 0.5, 1], [0, 0, 1]);
  const moonRotate = useTransform(darkness, [0, 1], [-80, 0]);
  const moonScale = useTransform(darkness, [0, 1], [0.4, 1]);

  return (
    <button
      type="button"
      className="theme-toggle"
      role="switch"
      aria-checked={theme === "dark"}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <span className="theme-toggle__track">
        <m.span className="theme-toggle__knob" style={{ x: knobX }}>
          <m.span
            className="theme-toggle__icon"
            style={{ opacity: sunOpacity, rotate: sunRotate, scale: sunScale }}
          >
            <SunIcon />
          </m.span>
          <m.span
            className="theme-toggle__icon"
            style={{ opacity: moonOpacity, rotate: moonRotate, scale: moonScale }}
          >
            <MoonIcon />
          </m.span>
        </m.span>
      </span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
    </svg>
  );
}
