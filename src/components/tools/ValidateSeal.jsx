import { useEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { ease, spring } from "../../lib/motion.js";
import "./ValidateSeal.css";

// A compact variation of the Contact envelope, used for "JSON → Validate":
// a small card folds, the flap closes, a wax seal presses on with a glyph, the
// whole thing arcs away, and it resolves to a standing result panel. Same
// fold / flap / seal / fly language as the Contact letter — SUCCESS and FAILURE
// share it exactly; only the seal glyph, the final mark and the wording differ.
//
// The whole thing lives in the shared `.dev-surface` box (label head + a
// `.validseal__body` that reuses `.dev-surface__area` geometry), so it lines up
// with the input pane exactly — no bespoke offsets.

const STAGE = { settle: 120, fold: 380, flap: 260, seal: 200, fly: 600 };
const t = (ms) => ms / 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function ValidateSeal({ tone = "success", message = "Valid JSON" }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(reduce ? "done" : "sealing");
  const alive = useRef(true);
  const isError = tone === "error";

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (reduce) return undefined;
    let cancelled = false;
    (async () => {
      await sleep(STAGE.settle + STAGE.fold + STAGE.flap + STAGE.seal);
      if (cancelled || !alive.current) return;
      setPhase("flying");
      await sleep(STAGE.fly);
      if (cancelled || !alive.current) return;
      setPhase("done");
    })();
    return () => {
      cancelled = true;
    };
  }, [reduce]);

  const sealing = phase === "sealing" || phase === "flying";

  return (
    <div className={`dev-surface validseal${isError ? " validseal--error" : ""}`}>
      <div className="dev-surface__head">
        <span className="dev-surface__label">Result</span>
      </div>

      <div className="validseal__body">
        {phase === "done" ? (
          <m.div
            className="validseal__done"
            role={isError ? "alert" : "status"}
            initial={reduce ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring.soft}
          >
            <ResultMark reduce={reduce} error={isError} />
            <p className="validseal__title">{isError ? "Invalid JSON" : "Validated"}</p>
            <p className="validseal__text">{message}</p>
          </m.div>
        ) : (
          <div className="validseal__stage" aria-hidden="true">
            <m.div
              className="validseal__card"
              animate={
                phase === "flying"
                  ? { x: 84, y: -150, rotate: -14, scale: 0.3, opacity: 0 }
                  : { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }
              }
              transition={
                phase === "flying"
                  ? { duration: t(STAGE.fly), ease: [0.5, 0, 0.3, 1] }
                  : { duration: 0.2, ease: ease.standard }
              }
              style={{ perspective: 900 }}
            >
              <div className="envelope__inner">
                {[0, 1].map((side) => (
                  <m.div
                    key={side}
                    initial={false}
                    animate={{ scaleX: sealing ? 1 : 0.12 }}
                    transition={{ duration: t(STAGE.fold), delay: t(STAGE.settle), ease: ease.standard }}
                    className={`envelope__side envelope__side--${side}`}
                  />
                ))}
                <m.div
                  initial={false}
                  animate={{ rotateX: sealing ? 0 : -160 }}
                  transition={{ duration: t(STAGE.flap), delay: t(STAGE.settle + STAGE.fold), ease: ease.standard }}
                  className="envelope__flap"
                />
                <m.div
                  initial={false}
                  animate={{ scale: sealing ? 1 : 0 }}
                  transition={{
                    delay: t(STAGE.settle + STAGE.fold + STAGE.flap),
                    type: "spring",
                    stiffness: 520,
                    damping: 14,
                  }}
                  className="envelope__seal validseal__seal"
                >
                  <SealGlyph error={isError} />
                </m.div>
              </div>
            </m.div>
            {phase === "flying" && (
              <div className="flighttrail">
                {[0, 1, 2, 3].map((i) => (
                  <m.span
                    key={i}
                    initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
                    animate={{ opacity: [0, 0.7, 0], x: 44 + i * 8, y: -72 - i * 22, scale: 0.3 }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.06, ease: "easeOut" }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultMark({ reduce, error }) {
  return (
    <svg width="48" height="48" viewBox="0 0 52 52" fill="none" aria-hidden="true" className="validseal__check">
      <m.circle
        cx="26" cy="26" r="24" stroke="currentColor" strokeWidth="2"
        initial={reduce ? false : { pathLength: 0, opacity: 0.35 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: ease.standard }}
      />
      {error ? (
        <>
          <m.path
            d="M19 19l14 14" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.22, delay: 0.3, ease: ease.standard }}
          />
          <m.path
            d="M33 19L19 33" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.22, delay: 0.48, ease: ease.standard }}
          />
        </>
      ) : (
        <m.path
          d="M16 27l7 7 13-14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 0.3, ease: ease.standard }}
        />
      )}
    </svg>
  );
}

function SealGlyph({ error }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {error ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M20 6 9 17l-5-5" />}
    </svg>
  );
}
