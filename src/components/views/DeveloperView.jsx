import { Suspense, lazy, useEffect, useRef } from "react";
import GlassPill from "../ui/GlassPill.jsx";
import LiquidIndicator from "../ui/LiquidIndicator.jsx";
import SpatialSurface from "../SpatialSurface.jsx";
import SurfacePlaceholder from "../ui/SurfacePlaceholder.jsx";
import { DEV_TOOLS, getDevTool } from "../tools/devTools.js";
import "../tools/tools.css";
import "./DeveloperView.css";

/**
 * Each tool is its own chunk, fetched when the tool is first opened. Encryption
 * is the reason this is per-tool rather than per-view: @noble/ciphers is by far
 * the heaviest dependency in the app, and nobody should download it to format
 * some JSON — let alone to type in the Write editor.
 */
const TOOL_COMPONENTS = {
  json: lazy(() => import("../tools/JsonTool.jsx")),
  base64: lazy(() => import("../tools/Base64Tool.jsx")),
  url: lazy(() => import("../tools/UrlTool.jsx")),
  hash: lazy(() => import("../tools/HashTool.jsx")),
  regex: lazy(() => import("../tools/RegexTool.jsx")),
  encrypt: lazy(() => import("../tools/EncryptTool.jsx")),
};

/**
 * The developer workspace — a full-viewport bench. One tool visible at a time,
 * switched via the glass tabs (a liquid indicator sits behind the active one)
 * or by dragging the surface left / right — the same spatial transition the
 * primary views use. Input and output are siblings of the Write editor.
 */
export default function DeveloperView({ activeTool, editorText, onSelectTool }) {
  const tabsRef = useRef(null);
  const tabRefs = useRef({});
  const titleRef = useRef(null);
  const dirRef = useRef(0);

  const index = Math.max(0, DEV_TOOLS.findIndex((t) => t.id === activeTool));
  const tool = getDevTool(activeTool) ?? DEV_TOOLS[0];
  const Body = TOOL_COMPONENTS[tool.id];

  // Direction of travel between tools, derived from the move itself rather than
  // set by the tab handler — so a tool opened from outside (the ⌘K palette)
  // slides the same direction-aware way a tab click does.
  const prevIndex = useRef(index);
  if (prevIndex.current !== index) {
    dirRef.current = Math.sign(index - prevIndex.current) || 1;
    prevIndex.current = index;
  }

  useEffect(() => {
    titleRef.current?.focus();
  }, [activeTool]);

  const select = (id) => onSelectTool(id);
  const nav = (dir) => {
    const next = DEV_TOOLS[index + dir];
    if (next) select(next.id);
  };

  return (
    <section className="developerview" aria-label="Developer tools">
      <div className="developerview__header">
        <h1 className="hero__kicker">Developer</h1>

        <div className="developerview__tabs" ref={tabsRef} role="tablist" aria-label="Developer tools">
        <LiquidIndicator
          containerRef={tabsRef}
          getTarget={() => tabRefs.current[activeTool] ?? null}
          dependency={activeTool}
          className="developerview__indicator"
        />
        {DEV_TOOLS.map((t) => (
          <GlassPill
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            magnetic={4}
            active={t.id === activeTool}
            role="tab"
            id={`devtab-${t.id}`}
            aria-selected={t.id === activeTool}
            aria-controls="devtool-panel"
            tabIndex={t.id === activeTool ? 0 : -1}
            onClick={() => select(t.id)}
          >
            {t.label}
          </GlassPill>
        ))}
        </div>
      </div>

      <SpatialSurface
        nested
        trackKey={activeTool}
        direction={dirRef.current}
        drag={{ onNavigate: nav, canPrev: index > 0, canNext: index < DEV_TOOLS.length - 1 }}
        className="developerview__stage"
      >
        <div
          className="developerview__panel"
          role="tabpanel"
          id="devtool-panel"
          aria-labelledby={`devtab-${tool.id}`}
        >
          <h2 className="developerview__title" tabIndex={-1} ref={titleRef}>
            {tool.label}
            <span className="developerview__desc">{tool.description}</span>
          </h2>
          <Suspense fallback={<SurfacePlaceholder lines={4} />}>
            <Body editorText={editorText} />
          </Suspense>
        </div>
      </SpatialSurface>
    </section>
  );
}
