import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import NavBar from "./components/nav/NavBar.jsx";
import SpatialSurface from "./components/SpatialSurface.jsx";
import ViewPeek from "./components/ViewPeek.jsx";
import WriteView from "./components/views/WriteView.jsx";
import DeveloperView from "./components/views/DeveloperView.jsx";
import TypingView from "./components/views/TypingView.jsx";
import ContactView from "./components/views/ContactView.jsx";
import CommandPalette from "./components/command-palette/CommandPalette.jsx";
import IntroReveal from "./components/intro/IntroReveal.jsx";
import { useTheme } from "./hooks/useTheme.js";
import { useCopy } from "./hooks/useCopy.js";
import { useReducedMotion } from "./hooks/useReducedMotion.js";
import { useEditorController } from "./hooks/useEditorController.js";
import { useRecentCommands } from "./hooks/useRecentCommands.js";
import { useIntroReveal } from "./hooks/useIntroReveal.js";
import { buildCommands } from "./lib/commands.js";
import { startThemeReveal } from "./lib/themeTransition.js";
import { computeStats } from "./lib/text/statistics.js";

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
  const stats = useMemo(() => computeStats(text), [text]);
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
      toggleTheme: toggleThemeCentred,
    }),
    [runTransform, openTool, switchView, handleUndo, handleRedo, handleCopy, handleClear, toggleThemeCentred],
  );

  const runCommand = useCallback(
    (command) => {
      setPaletteOpen(false);
      command.run(commandCtx);
      record(command.id);
    },
    [commandCtx, record],
  );

  const runRailCommand = useCallback(
    (command) => {
      command.run(commandCtx);
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
      return <DeveloperView activeTool={activeTool} editorText={text} onSelectTool={setActiveTool} />;
    }
    if (view === "typing") return <TypingView />;
    return <ContactView />;
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
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <main className="page">
          <div className="surface-wrap">
            <SpatialSurface
              trackKey={activeView}
              direction={direction}
              drag={{ onNavigate: navAdjacent, canPrev: idx > 0, canNext: idx < VIEWS.length - 1 }}
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

        <span className="sr-only" role="status" aria-live="polite">
          {announcement}
        </span>

        {paletteOpen && (
          <CommandPalette
            commands={commands}
            recentIds={recentIds}
            onRun={runCommand}
            onClose={() => setPaletteOpen(false)}
          />
        )}
      </MotionConfig>
    </LazyMotion>
  );
}
