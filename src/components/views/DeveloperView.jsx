import { useEffect, useRef } from "react";
import GlassPill from "../ui/GlassPill.jsx";
import LiquidIndicator from "../ui/LiquidIndicator.jsx";
import SpatialSurface from "../SpatialSurface.jsx";
import { DEV_TOOLS, getDevTool } from "../tools/devTools.js";
import "../tools/tools.css";
import "./DeveloperView.css";

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
  const Body = tool.Component;

  useEffect(() => {
    titleRef.current?.focus();
  }, [activeTool]);

  const select = (id) => {
    dirRef.current = Math.sign(DEV_TOOLS.findIndex((t) => t.id === id) - index) || 1;
    onSelectTool(id);
  };
  const nav = (dir) => {
    const next = DEV_TOOLS[index + dir];
    if (next) select(next.id);
  };

  return (
    <section className="developerview" aria-label="Developer tools">
      <p className="hero__kicker">Developer</p>

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
            aria-selected={t.id === activeTool}
            onClick={() => select(t.id)}
          >
            {t.label}
          </GlassPill>
        ))}
      </div>

      <SpatialSurface
        nested
        trackKey={activeTool}
        direction={dirRef.current}
        drag={{ onNavigate: nav, canPrev: index > 0, canNext: index < DEV_TOOLS.length - 1 }}
        className="developerview__stage"
      >
        <div className="developerview__panel">
          <h2 className="developerview__title" tabIndex={-1} ref={titleRef}>
            {tool.label}
            <span className="developerview__desc">{tool.description}</span>
          </h2>
          <Body editorText={editorText} />
        </div>
      </SpatialSurface>
    </section>
  );
}
