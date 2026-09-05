import "./SurfacePlaceholder.css";

/**
 * What a lazily-loaded surface shows while its chunk arrives. Not a spinner and
 * not the word "Loading" — the same glass panel the real surface will occupy,
 * with its blocks in place, so the layout is already correct when the code
 * lands and nothing shifts. It fades in only after a beat, so a chunk that
 * arrives quickly (the common case, same-origin and cached) never flashes
 * anything at all.
 */
export default function SurfacePlaceholder({ lines = 3, className = "" }) {
  return (
    <div
      className={`placeholder ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <span className="placeholder__bar placeholder__bar--title" />
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="placeholder__bar" />
      ))}
    </div>
  );
}
