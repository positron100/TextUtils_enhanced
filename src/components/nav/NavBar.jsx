import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import ThemeToggle from "../ThemeToggle.jsx";
import GlassPill from "../ui/GlassPill.jsx";
import LiquidIndicator from "../ui/LiquidIndicator.jsx";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { duration, ease, spring } from "../../lib/motion.js";
import "./NavBar.css";

const MOD =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";

/** The one responsive breakpoint the nav already used. Below it the header is
 * a different composition — two rows, destinations behind the menu — so it is
 * a different tree, not the desktop tree with pieces hidden. */
const COMPACT_QUERY = "(max-width: 54rem)";

const VIEWS = [
  { id: "write", label: "Write" },
  { id: "developer", label: "Developer" },
  { id: "typing", label: "Typing Speed" },
  { id: "contact", label: "Contact" },
];

/**
 * Primary navigation: the four application views, plus the command palette and
 * theme. Transform / Clean are not sections — they live in the Write workspace
 * and in ⌘K. One liquid indicator glides behind the active view.
 */
export default function NavBar({
  theme,
  setTheme,
  activeView,
  onSwitchView,
  navDrag,
  onOpenPalette,
}) {
  const compact = useMediaQuery(COMPACT_QUERY);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const itemsRef = useRef(null);
  const itemRefs = useRef({});

  const index = VIEWS.findIndex((v) => v.id === activeView);

  // Not a gesture of its own: the bar drives the stage's controller, so the
  // cards move under the finger while the drag is happening and the release
  // completes the same card-swipe a click would.
  const swipe = navDrag;

  // While dragging, the indicator leaves the active pill and tracks toward the
  // neighbour by the gesture's own progress, so the bar is part of the movement
  // instead of catching up after it.
  const indicatorOverride = () => {
    const dir = swipe.dragDir;
    if (!dir) return null;
    const from = itemRefs.current[VIEWS[index]?.id];
    const to = itemRefs.current[VIEWS[index + dir]?.id];
    if (!from || !to || !from.offsetWidth) return null;
    const t = Math.min(1, Math.abs(swipe.progress.get()));
    const lerp = (a, b) => a + (b - a) * t;
    return {
      x: lerp(from.offsetLeft, to.offsetLeft),
      y: from.offsetTop,
      width: lerp(from.offsetWidth, to.offsetWidth),
      height: from.offsetHeight,
    };
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!compact) setMenuOpen(false);
  }, [compact]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointer = (e) => {
      if (!e.target.closest(".nav")) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const go = (id) => {
    setMenuOpen(false);
    onSwitchView(id);
  };

  return (
    <header className="nav" data-reveal-anchor>
      <div
        className="nav__bar"
        data-scrolled={scrolled || undefined}
        data-open={menuOpen || undefined}
        data-dragging={swipe.dragging || undefined}
        {...swipe.navHandlers}
      >
        <span className="nav__edge" aria-hidden="true" />

        {/* Row one on a phone: wordmark and the menu. On desktop it is simply
            the left end of the single row. */}
        <div className="nav__lead">
          <button type="button" className="nav__brand" onClick={() => go("write")}>
            TextUtils
          </button>
          {compact && (
            <button
              type="button"
              data-no-swipe
              className="nav__burger"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MenuGlyph open={menuOpen} />
            </button>
          )}
        </div>

        {!compact && (
          <nav className="nav__items" aria-label="Views" ref={itemsRef}>
            <LiquidIndicator
              containerRef={itemsRef}
              getTarget={() => itemRefs.current[activeView] ?? null}
              dependency={activeView}
              live={swipe.dragging}
              getOverride={indicatorOverride}
              className="nav__indicator"
            />
            {VIEWS.map((item) => (
              <GlassPill
                key={item.id}
                ref={(el) => {
                  itemRefs.current[item.id] = el;
                }}
                magnetic={6}
                active={activeView === item.id}
                aria-current={activeView === item.id ? "page" : undefined}
                onClick={() => go(item.id)}
              >
                {item.label}
              </GlassPill>
            ))}
          </nav>
        )}

        {/* Row two on a phone: the search control, full content width. Every
            member of this row opts out of the bar's drag — the search is a
            target you press, the theme toggle owns its own drag-to-scrub
            gesture. What stays draggable is the bar itself and the wordmark
            row, which is where the gesture was always aimed. */}
        <div className="nav__actions">
          <GlassPill
            className="nav__search"
            data-no-swipe
            magnetic={4}
            onClick={onOpenPalette}
            aria-label="Search actions"
          >
            <SearchIcon />
            <span className="nav__searchtext">Search actions</span>
            <kbd>{MOD} K</kbd>
          </GlassPill>
          {!compact && (
            <span data-no-swipe>
              <ThemeToggle theme={theme} setTheme={setTheme} />
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && compact && (
          <m.div
            className="nav__menu"
            initial={{ opacity: 0, scaleY: 0.7, y: -8 }}
            animate={{
              opacity: 1,
              scaleY: 1,
              y: 0,
              transition: {
                opacity: { duration: duration.state },
                scaleY: { type: "spring", stiffness: 520, damping: 20, mass: 0.9 },
                y: spring.snappy,
                staggerChildren: 0.04,
                delayChildren: 0.04,
              },
            }}
            exit={{ opacity: 0, scaleY: 0.7, y: -6, transition: { duration: duration.state, ease: ease.exit } }}
            style={{ transformOrigin: "top right" }}
          >
            <span className="nav__edge" aria-hidden="true" />
            {VIEWS.map((item) => (
              <m.button
                key={item.id}
                type="button"
                className="nav__menuitem"
                data-active={activeView === item.id || undefined}
                variants={menuItemVariants}
                onClick={() => go(item.id)}
              >
                {item.label}
              </m.button>
            ))}
            <m.div className="nav__menutheme" variants={menuItemVariants}>
              <span>Theme</span>
              <ThemeToggle theme={theme} setTheme={setTheme} />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}

const menuItemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: spring.snappy },
  exit: { opacity: 0, y: -4, transition: { duration: 0.1 } },
};

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function MenuGlyph({ open }) {
  return (
    <span className="nav__glyph" aria-hidden="true">
      <m.span animate={open ? { y: 5, rotate: 45 } : { y: 0, rotate: 0 }} transition={spring.snappy} />
      <m.span animate={open ? { opacity: 0, scaleX: 0.3 } : { opacity: 1, scaleX: 1 }} transition={{ duration: duration.micro }} />
      <m.span animate={open ? { y: -5, rotate: -45 } : { y: 0, rotate: 0 }} transition={spring.snappy} />
    </span>
  );
}
