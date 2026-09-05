import {
  Suspense,
  lazy,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import NavBar from "./components/nav/NavBar.jsx";
import SpatialSurface from "./components/SpatialSurface.jsx";
import ViewPeek from "./components/ViewPeek.jsx";
import WriteView from "./components/views/WriteView.jsx";
import SurfacePlaceholder from "./components/ui/SurfacePlaceholder.jsx";
import ScrollAffordance from "./components/ui/ScrollAffordance.jsx";
import IntroReveal from "./components/intro/IntroReveal.jsx";
import { useTheme } from "./hooks/useTheme.js";
import { useCopy } from "./hooks/useCopy.js";
import { useReducedMotion } from "./hooks/useReducedMotion.js";
import { useEditorController } from "./hooks/useEditorController.js";
import { useRecentCommands } from "./hooks/useRecentCommands.js";
import { useIntroReveal } from "./hooks/useIntroReveal.js";
import { useSwipeNav } from "./hooks/useSwipeNav.js";
import { buildCommands } from "./lib/commands.js";
import { startThemeReveal } from "./lib/themeTransition.js";
import { computeStats } from "./lib/text/statistics.js";
import { exportText, importTextFile } from "./lib/textFile.js";

/**
 * Write is imported eagerly — it is the first thing anyone sees, and a
 * placeholder in its place would be a flash on every cold load. Everything
 * else is a chunk of its own, fetched when the stage first travels there. The
 * card-swipe covers the fetch: the incoming card holds the placeholder until
 * the chunk lands, so the transition never stalls and the layout never jumps.
 */
const DeveloperView = lazy(() => import("./components/views/DeveloperView.jsx"));
const TypingView = lazy(() => import("./components/views/TypingView.jsx"));
const ContactView = lazy(() => import("./components/views/ContactView.jsx"));
const CommandPalette = lazy(() => import("./components/command-palette/CommandPalette.jsx"));

const VIEWS = ["write", "developer", "typing", "contact"];
const VIEW_ORDER = Object.fromEntries(VIEWS.map((v, i) => [v, i]));

export default function App() {
  const reducedMotion = useReducedMotion();
  const { theme, setTheme } = useTheme();
  const { status: copyStatus, copy } = useCopy();
  const editor = useEditorController(reducedMotion);
  const { text, textareaRef } = editor;
  const { introDone, finishIntro } = useIntroReveal();

  const [activeView, setActiveView] = useState("write");
  const [direction, setDirection] = useState(0);
  const [activeTool, setActiveTool] = useState("json");
  const [findOpen, setFindOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const commands = useMemo(() => buildCommands(), []);
  const { recentIds, record } = useRecentCommands();
  // Statistics are a readout, not the thing being typed: at 100k characters
  // computing them inside the keystroke's own commit was most of that
  // keystroke's cost. Deferring lets React paint the character first and
  // recompute the counts in a follow-up render it can interrupt — the numbers
  // land a frame or two later under load and immediately at ordinary sizes.
  const deferredText = useDeferredValue(text);
  const stats = useMemo(() => computeStats(deferredText), [deferredText]);
  const hasText = text.length > 0;

  const [announcement, setAnnouncement] = useState("");
  const say = useCallback((msg) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(msg));
  }, []);

  const activeViewRef = useRef(activeView);
  activeViewRef.current = activeView;
  const switchView = useCallback((next) => {
    const cur = activeViewRef.current;
    if (cur === next) return;
    setDirection(Math.sign(VIEW_ORDER[next] - VIEW_ORDER[cur]) || 1);
    setActiveView(next);
  }, []);

  const navAdjacent = useCallback((dir) => {
    const cur = VIEW_ORDER[activeViewRef.current];
    const next = VIEWS[cur + dir];
    if (next) switchView(next);
  }, [switchView]);

  const viewIndex = VIEW_ORDER[activeView];
  // One gesture for the primary stage, shared by the stage itself and the nav
  // bar — dragging the bar moves the same cards, live, rather than triggering
  // a navigation on release.
  const stageDrag = useSwipeNav({
    onNavigate: navAdjacent,
    canPrev: viewIndex > 0,
    canNext: viewIndex < VIEWS.length - 1,
  });

  const runTransform = useCallback(
    (fn, label) => {
      const changed = editor.applyTransform(fn, label);
      say(changed ? `${label} applied` : "No change");
    },
    [editor, say],
  );

  const handleCopy = useCallback(async () => {
    const ok = await copy(text);
    say(ok ? "Copied to clipboard" : "Copy failed");
  }, [copy, text, say]);

  const handleClear = useCallback(() => {
    editor.clear();
    say("Text cleared");
  }, [editor, say]);

  // Export writes a Blob straight to the browser's download — no network, no
  // temporary file anywhere but the user's own machine.
  const handleExport = useCallback(
    (format) => {
      if (!text) return say("Nothing to export");
      exportText(text, format, format === "json" ? stats : null);
      say(`Exported as .${format}`);
    },
    [text, stats, say],
  );

  // Import replaces the editor through the ordinary commit path, so it lands as
  // exactly one undoable checkpoint — ⌘Z puts the previous text back.
  const handleImport = useCallback(async () => {
    const result = await importTextFile();
    if (!result) return; // cancelled
    if (result.error) return say(result.error);
    if (result.text === text) return say("That file matches the editor already");
    editor.commit(result.text, "Import", { start: 0, end: 0 });
    say("File imported — undo to go back");
  }, [editor, text, say]);

  const handleUndo = useCallback(() => {
    editor.undo();
    say("Undo");
  }, [editor, say]);
  const handleRedo = useCallback(() => {
    editor.redo();
    say("Redo");
  }, [editor, say]);

  const restoreHistory = useCallback(
    (index) => {
      editor.restoreCheckpoint(index);
      say("History state restored");
    },
    [editor, say],
  );

  const toggleThemeCentred = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    startThemeReveal(next, () => setTheme(next));
  }, [theme, setTheme]);

  const closeFind = useCallback(() => {
    setFindOpen(false);
    textareaRef.current?.focus();
  }, [textareaRef]);

  const openTool = useCallback(
    (id) => {
      setActiveTool(id);
      switchView("developer");
    },
    [switchView],
  );

  const commandCtx = useMemo(
    () => ({
      applyTransform: runTransform,
      openTool,
      openFind: () => {
        switchView("write");
        setFindOpen(true);
      },
      openHistory: () => {
        switchView("write");
        setHistoryOpen(true);
      },
      undo: handleUndo,
      redo: handleRedo,
      copyAll: handleCopy,
      clear: handleClear,
      exportText: handleExport,
      importFile: handleImport,
      toggleTheme: toggleThemeCentred,
    }),
    [
      runTransform,
      openTool,
      switchView,
      handleUndo,
      handleRedo,
      handleCopy,
      handleClear,
      handleExport,
      handleImport,
      toggleThemeCentred,
    ],
  );

  // A command chosen for another view waits here while the stage slides; the
  // surface hands it back once the incoming card has landed. A ref, not state:
  // nothing renders from it, and a second choice must replace the first rather
  // than queue behind it.
  const pendingCommand = useRef(null);

  const runCommand = useCallback(
    (command) => {
      setPaletteOpen(false);
      record(command.id);

      const target = command.targetView;
      if (target && target !== activeViewRef.current) {
        // Navigate first, run on arrival — the view slides into place and the
        // action happens there, rather than firing into a view being left.
        pendingCommand.current = command;
        switchView(target);
        return;
      }
      pendingCommand.current = null;
      command.run?.(commandCtx);
    },
    [commandCtx, record, switchView],
  );

  // Fired by the stage when an incoming view has finished arriving.
  const handleStageSettled = useCallback(() => {
    const command = pendingCommand.current;
    if (!command) return;
    pendingCommand.current = null;
    // The stage can also have been moved by a drag or the nav mid-flight; only
    // run if we actually landed where the command asked for.
    if (command.targetView && command.targetView !== activeViewRef.current) return;
    command.run?.(commandCtx);
  }, [commandCtx]);

  const runRailCommand = useCallback(
    (command) => {
      command.run?.(commandCtx);
      record(command.id);
    },
    [commandCtx, record],
  );

  useEffect(() => {
    const inForeignField = () => {
      const el = document.activeElement;
      if (!el || el === textareaRef.current) return false;
      const tag = el.tagName;
      return (
        (tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable) &&
        !el.closest(".find-replace")
      );
    };

    const onKey = (e) => {
      if (e.key === "Escape") {
        if (paletteOpen) return setPaletteOpen(false);
        if (findOpen) {
          setFindOpen(false);
          textareaRef.current?.focus();
          return;
        }
        if (activeViewRef.current !== "write") return switchView("write");
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();

      if (k === "k" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (k === "f" && !e.shiftKey && !e.altKey) {
        if (inForeignField()) return;
        e.preventDefault();
        switchView("write");
        setFindOpen(true);
        return;
      }
      if (inForeignField()) return;
      if (k === "z" && !e.altKey) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (k === "y" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleUndo, handleRedo, textareaRef, findOpen, paletteOpen, switchView]);

  const toolbarProps = {
    onCopy: handleCopy,
    onClear: handleClear,
    onUndo: handleUndo,
    onRedo: handleRedo,
    copyStatus,
    hasText,
    canUndo: editor.canUndo,
    canRedo: editor.canRedo,
    historyEntries: editor.historyEntries,
    historyIndex: editor.historyIndex,
    historyOpen,
    onHistoryOpenChange: setHistoryOpen,
    onRestoreHistory: restoreHistory,
  };

  const idx = VIEW_ORDER[activeView];

  const renderView = (view) => {
    if (view === "write") {
      return (
        <WriteView
          editor={editor}
          stats={stats}
          findOpen={findOpen}
          onCloseFind={closeFind}
          toolbar={toolbarProps}
          commands={commands}
          onRailRun={runRailCommand}
        />
      );
    }
    if (view === "developer") {
      return (
        <Suspense fallback={<SurfacePlaceholder lines={5} />}>
          <DeveloperView activeTool={activeTool} editorText={text} onSelectTool={setActiveTool} />
        </Suspense>
      );
    }
    if (view === "typing") {
      return (
        <Suspense fallback={<SurfacePlaceholder lines={4} />}>
          <TypingView />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<SurfacePlaceholder lines={4} />}>
        <ContactView />
      </Suspense>
    );
  };

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        {!introDone && <IntroReveal onDone={finishIntro} />}

        <NavBar
          theme={theme}
          setTheme={setTheme}
          activeView={activeView}
          onSwitchView={switchView}
          navDrag={stageDrag}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <main className="page">
          <div className="surface-wrap">
            <SpatialSurface
              trackKey={activeView}
              direction={direction}
              onSettled={handleStageSettled}
              dragController={stageDrag}
              renderPeek={(dir) => {
                const neighbour = VIEWS[idx + dir];
                return neighbour ? <ViewPeek view={neighbour} /> : null;
              }}
            >
              {renderView(activeView)}
            </SpatialSurface>
          </div>

          <footer className="app__footer">
            Your text stays in your browser. TextUtils never sends it to a server.
          </footer>
        </main>

        {/* The document scroller's own affordance, in place of the browser
            scrollbar. Vertical only — the horizontal card-swipe is untouched. */}
        <ScrollAffordance page />

        <span className="sr-only" role="status" aria-live="polite">
          {announcement}
        </span>

        {paletteOpen && (
          /* No fallback: the palette is an overlay, and a skeleton dialog would
             be louder than the beat it takes to arrive. */
          <Suspense fallback={null}>
            <CommandPalette
              commands={commands}
              recentIds={recentIds}
              onRun={runCommand}
              onClose={() => setPaletteOpen(false)}
            />
          </Suspense>
        )}
      </MotionConfig>
    </LazyMotion>
  );
}
