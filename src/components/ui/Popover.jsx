import { useEffect, useId, useRef, useState } from "react";
import ScrollAffordance from "./ScrollAffordance.jsx";
import "./Popover.css";

/**
 * Shared menu-popover: a trigger button plus a `role="menu"` panel. Handles
 * open state, click-outside / Escape / Tab dismissal, ↑/↓/Home/End roving over
 * `[role="menuitem"]`, focus-first on open, focus-return on close, and the
 * mobile bottom-sheet treatment. Content is passed as children.
 */
export default function Popover({
  triggerLabel,
  triggerIcon,
  menuLabel,
  disabled = false,
  className = "",
  triggerClassName = "",
  open: openProp,
  onOpenChange,
  children,
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next) => (onOpenChange ? onOpenChange(next) : setOpenState(next));
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();

    const onPointer = (e) => {
      if (
        !menuRef.current?.contains(e.target) &&
        !triggerRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const onKeyDown = (e) => {
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
    const i = items.indexOf(document.activeElement);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        items[(i + 1) % items.length]?.focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        items[(i - 1 + items.length) % items.length]?.focus();
        break;
      case "Home":
        e.preventDefault();
        items[0]?.focus();
        break;
      case "End":
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className={`popover ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className={`action-btn popover__trigger ${triggerClassName}`.trim()}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={menuLabel}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        {triggerLabel}
        {triggerIcon ?? <Chevron />}
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          className="popover__panel"
          role="menu"
          aria-label={menuLabel}
          onKeyDown={onKeyDown}
        >
          {typeof children === "function" ? children(() => close()) : children}
          <ScrollAffordance targetRef={menuRef} role="none" />
        </div>
      )}
    </div>
  );
}

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
