import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { useMagnetic } from "../../hooks/useMagnetic.js";
import { spring } from "../../lib/motion.js";
import SpatialSurface from "../SpatialSurface.jsx";

/**
 * Input | Output frame for the tools. `hint`, `config`, `controls` and
 * `message` span the full width; only the two editor surfaces sit in the
 * columns, so every tool — Hash included — shares the same geometry. Both
 * surfaces card-swipe: a new result slides in on `outputKey`, and clearing the
 * input slides a fresh empty surface in on `inputKey`.
 */
export function ToolLayout({
  hint,
  config,
  input,
  controls,
  message,
  output,
  outputKey,
  outputDir = 1,
  inputKey,
}) {
  const inputPaneRef = useRef(null);

  // After the input has been cleared (card-swiped), hand focus to the fresh
  // textarea so it stays immediately usable.
  useEffect(() => {
    if (!inputKey) return;
    inputPaneRef.current?.querySelector("textarea")?.focus();
  }, [inputKey]);

  return (
    <div className="tool">
      {hint}
      {config && <div className="tool__config">{config}</div>}
      <div className="tool__panes">
        <div className="tool__pane" ref={inputPaneRef}>
          <SpatialSurface nested trackKey={inputKey ?? "static"} direction={-1}>
            {input}
          </SpatialSurface>
        </div>
        <div className="tool__pane">
          <SpatialSurface nested trackKey={outputKey ?? "static"} direction={outputDir} cardClassName="tool__outcard">
            {output}
          </SpatialSurface>
        </div>
      </div>
      {controls && <div className="tool__controls">{controls}</div>}
      {message}
    </div>
  );
}

/**
 * The shared developer editor surface — a sibling of the Write editor: same
 * radius, border, elevation, padding and typography. Copy / Clear live as
 * compact magnetic icon actions in the header rather than a button row below.
 */
export function ToolField({
  label,
  value,
  onChange,
  readOnly = false,
  mono = false,
  placeholder,
  rows,
  onCopy,
  onClear,
}) {
  const id = useId();
  return (
    <div className="dev-surface">
      <div className="dev-surface__head">
        <label htmlFor={id} className="dev-surface__label">
          {label}
        </label>
        <div className="dev-surface__actions">
          {onCopy && <CopyAction onCopy={onCopy} disabled={!value} />}
          {onClear && (
            <IconAction label="Clear" onClick={onClear} disabled={!value}>
              <ClearIcon />
            </IconAction>
          )}
        </div>
      </div>
      <textarea
        id={id}
        className={`dev-surface__area${mono ? " dev-surface__area--mono" : ""}`}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        spellCheck="false"
        autoComplete="off"
        rows={rows}
      />
    </div>
  );
}

function IconAction({ children, label, onClick, disabled }) {
  const { ref, onMouseMove, onMouseLeave, style } = useMagnetic({ strength: 3, disabled });
  return (
    <m.button
      ref={ref}
      type="button"
      className="dev-surface__icon"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={style}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      transition={spring.snappy}
    >
      {children}
    </m.button>
  );
}

function CopyAction({ onCopy, disabled }) {
  const [done, setDone] = useState(false);
  const run = async () => {
    const ok = await onCopy();
    if (ok !== false) {
      setDone(true);
      window.setTimeout(() => setDone(false), 1400);
    }
  };
  return (
    <IconAction label={done ? "Copied" : "Copy"} onClick={run} disabled={disabled}>
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <m.span key="ok" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <CheckIcon />
          </m.span>
        ) : (
          <m.span key="copy" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <CopyIcon />
          </m.span>
        )}
      </AnimatePresence>
    </IconAction>
  );
}

/** Inline error / success line with a subtle entrance. */
export function ToolMessage({ feedback }) {
  if (!feedback) return null;
  return (
    <p
      className={`tool__message tool__message--${feedback.type}`}
      role={feedback.type === "error" ? "alert" : "status"}
    >
      {feedback.text}
    </p>
  );
}

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function ClearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}
