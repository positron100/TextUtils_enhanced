import { forwardRef } from "react";
import { m } from "framer-motion";
import { useMagnetic } from "../../hooks/useMagnetic.js";
import { spring } from "../../lib/motion.js";
import "./GlassPill.css";

/**
 * The one interactive pill. Shared by primary nav, developer tabs, and the
 * Write action rail so every selectable control has the same feel:
 *   hover  — soft glass fill + a highlight that tracks the cursor + magnetic pull
 *   press  — slight sink
 *   active — stronger glass presence
 *   focus  — visible ring on :focus-visible only (never on mouse)
 *
 * Motion is deliberately small (magnetic 3–6px, no scale bounce).
 */
const GlassPill = forwardRef(function GlassPill(
  {
    children,
    onClick,
    active = false,
    magnetic = 4,
    disabled = false,
    className = "",
    as = "button",
    ...rest
  },
  forwardedRef,
) {
  const { ref, onMouseMove, onMouseLeave, style } = useMagnetic({ strength: magnetic, disabled });

  const setHighlight = (event) => {
    const el = event.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((event.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((event.clientY - r.top) / r.height) * 100}%`);
    onMouseMove(event);
  };

  const Tag = m[as] ?? m.button;

  return (
    <Tag
      ref={(node) => {
        ref.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      type={as === "button" ? "button" : undefined}
      className={`glasspill${active ? " is-active" : ""} ${className}`.trim()}
      data-active={active || undefined}
      disabled={as === "button" ? disabled : undefined}
      onClick={onClick}
      onMouseMove={setHighlight}
      onMouseLeave={onMouseLeave}
      style={style}
      whileTap={disabled ? undefined : { y: 1 }}
      transition={spring.snappy}
      {...rest}
    >
      <span className="glasspill__label">{children}</span>
    </Tag>
  );
});

export default GlassPill;
