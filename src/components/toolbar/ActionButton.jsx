import "./ActionButton.css";

/**
 * The one button primitive. Variants: "solid" (accent) | "ghost" (default).
 * Press/hover/focus states are all CSS — see ActionButton.css. Phase C layers
 * the tactile spring + icon motion on top of this same element.
 */
export default function ActionButton({
  children,
  onClick,
  variant = "ghost",
  type = "button",
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
  ...rest
}) {
  return (
    <button
      type={type}
      className={`action-btn action-btn--${variant} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      {...rest}
    >
      {children}
    </button>
  );
}
