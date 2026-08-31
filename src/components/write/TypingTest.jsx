import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { ease, spring } from "../../lib/motion.js";
import TypingMetric from "./TypingMetric.jsx";
import { charStates, scoreTyping, randomPassage, TYPING_PASSAGES } from "../../lib/text/typing.js";
import "./TypingTest.css";

/**
 * The typing test. A known passage is shown large; the field below captures
 * input, and because there IS a reference here, accuracy / errors / true WPM
 * are all well-defined.
 */
export default function TypingTest({ onExit }) {
  const reduce = useReducedMotion();
  const [passage, setPassage] = useState(() => TYPING_PASSAGES[0]);
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);
  const [now, setNow] = useState(0);
  const fieldRef = useRef(null);

  const done = endedAt !== null;
  const elapsed = startedAt ? (endedAt ?? now) - startedAt : 0;
  const score = useMemo(() => scoreTyping(passage, typed, elapsed), [passage, typed, elapsed]);
  const states = useMemo(() => charStates(passage, typed), [passage, typed]);

  useEffect(() => {
    if (!startedAt || done) return undefined;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [startedAt, done]);

  function reset(nextPassage) {
    setPassage(nextPassage);
    setTyped("");
    setStartedAt(null);
    setEndedAt(null);
    setNow(0);
    requestAnimationFrame(() => fieldRef.current?.focus());
  }

  function handleChange(e) {
    if (done) return;
    const value = e.target.value.slice(0, passage.length);
    if (!startedAt && value.length > 0) setStartedAt(Date.now());
    setTyped(value);
    if (value.length >= passage.length) setEndedAt(Date.now());
  }

  return (
    <m.div
      className="typingtest"
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: ease.standard }}
    >
      <div className="typingtest__bar">
        <div className="typingview__metrics" aria-hidden={done}>
          <TypingMetric value={score.wpm} label="WPM" />
          <TypingMetric value={`${Math.round(score.accuracy * 100)}%`} label="Accuracy" />
          <TypingMetric value={formatClock(elapsed)} label="Time" />
        </div>
        {onExit && (
          <button type="button" className="typingtest__exit" onClick={onExit}>
            Exit
          </button>
        )}
      </div>

      <div className="typingtest__pane typingtest__pane--passage">
        <span className="typingtest__panelabel">Passage</span>
        <div
          className="typingtest__passage"
          onClick={() => fieldRef.current?.focus()}
          aria-hidden="true"
        >
          {[...passage].map((ch, i) => (
            <span key={i} className={`typingtest__char is-${states[i]}${i === typed.length ? " is-cursor" : ""}`}>
              {ch}
            </span>
          ))}
        </div>
      </div>

      <div className="typingtest__pane typingtest__pane--input">
        <span className="typingtest__panelabel">Type here</span>
        <textarea
          ref={fieldRef}
          className="typingtest__field"
          value={typed}
          onChange={handleChange}
          disabled={done}
          spellCheck="false"
          autoComplete="off"
          placeholder="Start typing the passage…"
          aria-label="Type the passage here"
        />
      </div>

      <AnimatePresence>
        {done && (
          <m.div
            className="typingtest__result"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring.soft}
            role="status"
          >
            <p className="typingtest__resulttitle">
              {score.wpm} WPM · {Math.round(score.accuracy * 100)}% accuracy
            </p>
            <p className="typingtest__resultmeta">
              {score.errors} {score.errors === 1 ? "error" : "errors"} · {formatClock(elapsed)} ·{" "}
              {score.correct}/{passage.length} correct
            </p>
            <div className="typingtest__resultactions">
              <button type="button" className="typingtest__again" onClick={() => reset(passage)}>
                Retry
              </button>
              <button type="button" className="typingtest__again" onClick={() => reset(randomPassage(passage))}>
                New passage
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}

function formatClock(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
