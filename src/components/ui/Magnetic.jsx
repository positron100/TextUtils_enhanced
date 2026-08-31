import { m } from "framer-motion";
import { useMagnetic } from "../../hooks/useMagnetic.js";

/** Thin wrapper over useMagnetic for children that just need the pull. */
export default function Magnetic({ children, strength = 12, disabled = false, className = "inline-flex" }) {
  const { ref, onMouseMove, onMouseLeave, style } = useMagnetic({ strength, disabled });
  return (
    <m.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={style}
      className={className}
    >
      {children}
    </m.div>
  );
}
