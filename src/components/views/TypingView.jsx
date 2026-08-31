import { useRef, useState } from "react";
import GlassPill from "../ui/GlassPill.jsx";
import SpatialSurface from "../SpatialSurface.jsx";
import TypingTest from "../write/TypingTest.jsx";
import TypingMetric from "../write/TypingMetric.jsx";
import { useTypingStats } from "../../hooks/useTypingStats.js";
import "./TypingView.css";

const MODES = ["test", "free"];

/**
 * Typing Speed — a first-class view. Two models, kept explicit:
 *   Test  — a known passage, so WPM / accuracy / errors are all well-defined
 *   Free  — type anything; speed estimate only, never accuracy (no reference)
 * Test ↔ Free uses the same spatial card transition (+ drag) as everywhere else.
 */
export default function TypingView() {
  const [mode, setMode] = useState("test");
  const dirRef = useRef(0);
  const idx = MODES.indexOf(mode);

  const select = (m) => {
    dirRef.current = Math.sign(MODES.indexOf(m) - idx) || 1;
    setMode(m);
  };
  const nav = (d) => {
    const next = MODES[idx + d];
    if (next) select(next);
  };

  return (
    <div className="typingview">
      <div className="typingview__head">
        <div>
          <p className="hero__kicker">Typing Speed</p>
          <h2 className="typingview__title">Measure your pace.</h2>
        </div>
        <div className="typingview__modes" role="group" aria-label="Typing mode">
          <GlassPill magnetic={3} active={mode === "test"} onClick={() => select("test")}>
            Test
          </GlassPill>
          <GlassPill magnetic={3} active={mode === "free"} onClick={() => select("free")}>
            Free writing
          </GlassPill>
        </div>
      </div>

      <SpatialSurface
        nested
        trackKey={mode}
        direction={dirRef.current}
        drag={{ onNavigate: nav, canPrev: idx > 0, canNext: idx < MODES.length - 1 }}
      >
        {mode === "test" ? <TypingTest /> : <FreeTyping />}
      </SpatialSurface>
    </div>
  );
}

function FreeTyping() {
  const [text, setText] = useState("");
  const typing = useTypingStats();

  return (
    <div className="freetyping">
      <textarea
        className="freetyping__field"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          typing.onType(e.target.value);
        }}
        placeholder="Just start writing. Your pace updates as you go…"
        spellCheck="false"
        autoComplete="off"
        aria-label="Free typing area"
      />
      <div className="freetyping__side">
        <div className="typingview__metrics typingview__metrics--stack">
          <TypingMetric value={typing.hasData ? typing.wpm : "—"} label="WPM" />
          <TypingMetric value={formatMinutes(typing.activeMs)} label="Active time" />
          <TypingMetric value={typing.keystrokes} label="Characters" />
        </div>
        <p className="freetyping__note">
          A speed estimate only — accuracy needs a reference passage, so the Test mode is where it lives.
        </p>
      </div>
    </div>
  );
}

function formatMinutes(ms) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
