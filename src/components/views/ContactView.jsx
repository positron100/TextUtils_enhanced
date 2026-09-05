import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m, useAnimationControls, useReducedMotion } from "framer-motion";
import Magnetic from "../ui/Magnetic.jsx";
import { useCopy } from "../../hooks/useCopy.js";
import { useGhostType } from "../../hooks/useGhostType.js";
import { duration, ease, spring } from "../../lib/motion.js";
import { validateContact } from "../../lib/validateContact.js";
import { submitContact } from "../../lib/contactService.js";
import "./ContactView.css";

const CONTACT_EMAIL = "mukuknegi2005@gmail.com";
const initial = { name: "", email: "", message: "" };

// Stage lengths (ms) — the sequence's only clock.
const STAGE = { settle: 220, fold: 520, flap: 380, seal: 280, fly: 820 };
const ENVELOPE = { w: 360, h: 216 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GHOSTS = {
  name: "Ada Lovelace",
  email: "ada@analytical-engine.org",
  message: "I found a tool I'd love to see in here…",
};

/**
 * The letter writes itself in on view entry — name, then email, then body,
 * each ghost-typed in sequence (skippable, off under reduced motion) — then the
 * visitor takes over. The send sequence folds the same one element into an
 * envelope, seals it and flies it away; "Write another" runs the same chain
 * backwards. Adapted from the portfolio's ContactForm.
 *
 *   writing   → the letter, editable
 *   sealing   → content settles out, the paper folds down to envelope
 *               proportions, the flap rotates shut, the seal presses on
 *   flying    → the same element arcs away and shrinks into the distance
 *   delivered → it resolves into the confirmation
 *   unsealing → the confirmation contracts back into the sealed envelope, the
 *               seal lifts, the flap opens, the paper unfolds into a blank
 *               letter, and the ghost intro types itself again
 *
 * The card is one DOM element throughout — the paper is the envelope is the
 * confirmation panel — which is what makes the sequence read as one object.
 * Every stage is awaited in one chain, so nothing starts before the stage
 * before it has landed, and `inFlight` makes both directions non-reentrant.
 */
export default function ContactView() {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | error
  const [phase, setPhase] = useState("writing"); // writing | sealing | flying | delivered | unsealing
  const [ghostStage, setGhostStage] = useState(0); // 0 name · 1 email · 2 message · 3 off
  // Height the stage holds while the card is folded or in flight, so the page
  // below never moves during the sequence.
  const [reservedHeight, setReservedHeight] = useState(null);

  const inFlight = useRef(false);
  const honeypot = useRef("");
  const cardRef = useRef(null);
  const card = useAnimationControls();
  const reduce = useReducedMotion();
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const ghosting = !reduce && ghostStage < 3 && phase === "writing";
  const stopGhost = () => setGhostStage(3);
  // A deliberate beat between fields, so it reads as a letter being composed
  // rather than a demo racing to the end.
  const advanceGhost = (to) =>
    window.setTimeout(() => alive.current && setGhostStage((s) => (s < 3 ? to : s)), 620);

  const written = useMemo(() => 3 - Object.keys(validateContact(values)).length, [values]);
  const ready = written === 3;
  const sealed = phase !== "writing";

  const setField = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    setStatus((s) => (s === "error" ? "idle" : s));
    stopGhost();
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (inFlight.current) return;
    const v = validateContact(values);
    setErrors(v);
    if (Object.keys(v).length) return;

    inFlight.current = true;
    setStatus("submitting");
    const request = submitContact({ ...values, company: honeypot.current }).then(
      () => true,
      (err) => {
        if (alive.current) setErrors((prev) => ({ ...prev, _form: err.message }));
        return false;
      },
    );

    const el = cardRef.current;
    try {
      if (!el || reduce) {
        const sent = await request;
        if (!alive.current) return;
        if (sent) {
          setValues(initial);
          setPhase("delivered");
        } else {
          setStatus("error");
        }
        return;
      }

      const height = el.offsetHeight;
      const width = el.offsetWidth;

      // Pin the card at exactly its current size before animating away from it,
      // so the first frame of the fold is identical to the last frame of the
      // letter and the fold reads as continuous.
      card.set({ height, width });
      setReservedHeight(height);
      setPhase("sealing");

      await sleep(STAGE.settle);
      if (!alive.current) return;
      await card.start(
        { height: ENVELOPE.h, width: Math.min(ENVELOPE.w, width) },
        { duration: STAGE.fold / 1000, ease: ease.standard },
      );
      // The flap and the seal are the Envelope layer's own delayed animations;
      // this holds the chain open until they have finished.
      await sleep(STAGE.flap + STAGE.seal);
      const sent = await request;
      if (!alive.current) return;

      if (!sent) {
        // Unwind: the paper opens back out to exactly the size it was, with
        // everything the visitor typed still in it.
        setPhase("writing");
        await card.start({ height, width }, { duration: STAGE.fold / 1000, ease: ease.standard });
        if (!alive.current) return;
        card.set({ height: "auto", width: "auto" });
        setReservedHeight(null);
        setStatus("error");
        return;
      }

      setPhase("flying");
      await card.start({
        x: [0, 18, 96],
        y: [0, 14, -230],
        rotate: [0, 3, -16],
        scale: [1, 1.02, 0.3],
        opacity: [1, 1, 0],
        transition: { duration: STAGE.fly / 1000, ease: [0.5, 0, 0.3, 1], times: [0, 0.18, 1] },
      });
      if (!alive.current) return;

      // The card is handed back to the layout in one instant `set` with no
      // animation of its own: `Delivered` owns the emergence. Exactly one owner,
      // or the two fight over the same matrix.
      card.set({ x: 0, y: 0, rotate: 0, scale: 1, opacity: 0, height: "auto", width: "auto" });
      setValues(initial);
      setPhase("delivered");
      setReservedHeight(null);
      // The send is finished here. Releasing the lock before the fade matters:
      // "Write another" is already on screen, and holding it across a purely
      // decorative animation would swallow that click.
      inFlight.current = false;
      // Held at zero across the handoff, then faded in once layout has settled.
      await card.start({ opacity: 1 }, { duration: duration.surface, ease: ease.standard });
    } finally {
      inFlight.current = false;
    }
  }

  /**
   * The send, run backwards. The confirmation contracts into the sealed
   * envelope it arrived as, the seal lifts, the flap opens and the paper
   * unfolds into a blank letter — one element changing shape the whole way —
   * and the ghost intro starts over on the fresh sheet.
   */
  async function handleWriteAnother() {
    if (inFlight.current) return;

    const el = cardRef.current;
    setStatus("idle");
    setErrors({});
    setValues(initial);
    setGhostStage(0);

    if (!el || reduce) {
      setPhase("writing");
      return;
    }

    inFlight.current = true;
    try {
      const height = el.offsetHeight;
      const width = el.offsetWidth;

      // `opacity: 1` claims the value outright: clicking through the delivered
      // fade-in interrupts it, and without this the card could be left part-way.
      card.set({ height, width, opacity: 1 });
      setReservedHeight(height);
      setPhase("unsealing");

      await sleep(STAGE.settle);
      if (!alive.current) return;
      await card.start(
        { height: ENVELOPE.h, width: Math.min(ENVELOPE.w, width) },
        { duration: STAGE.fold / 1000, ease: ease.standard },
      );

      // The seal lifting and the flap opening are the Envelope layer's own
      // delayed animations; this holds the chain open until they are done.
      await sleep(STAGE.seal + STAGE.flap);
      if (!alive.current) return;

      // The paper opens out and the blank letter fades in with it.
      setPhase("writing");
      await card.start(
        { height: "auto", width: "auto" },
        { duration: STAGE.fold / 1000, ease: ease.standard },
      );
      if (!alive.current) return;
      setReservedHeight(null);
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div className="contactview">
      <div className="contactview__intro">
        <h1 className="hero__kicker">Contact</h1>
        <h2 className="contactview__title">Made by Mukul. Say hello.</h2>
        <p className="contactview__text">
          TextUtils is a personal project — everything runs locally in your browser. Found a bug,
          want a tool added, or just want to talk shop? Write a note.
        </p>
        <EmailCopy />
      </div>

      <div className="contactview__stage" style={{ minHeight: reservedHeight ?? undefined }}>
        <FlightTrail active={phase === "flying"} />

        <m.div
          ref={cardRef}
          animate={card}
          data-phase={phase}
          style={{ perspective: 1000, transformOrigin: "50% 58%" }}
          className="contactcard"
        >
          <AnimatePresence mode="wait" initial={false}>
            {phase === "delivered" ? (
              <Delivered key="delivered" onWriteAnother={handleWriteAnother} />
            ) : (
              <m.div
                key="letter"
                animate={{ opacity: sealed ? 0 : 1, y: sealed ? -8 : 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: STAGE.settle / 1000, ease: ease.standard }}
                aria-hidden={sealed || undefined}
                className={`contactcard__letter${sealed ? " is-sealed" : ""}`}
              >
                <form noValidate onSubmit={handleSubmit}>
                  <input
                    type="text"
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="contactcard__honeypot"
                    onChange={(e) => (honeypot.current = e.target.value)}
                  />

                  <p className="contactcard__salutation">Dear Mukul,</p>

                  <div className="contactcard__lines">
                    <WrittenLine
                      id="c-name" lead="My name is" value={values.name}
                      error={errors.name} onChange={(v) => setField("name", v)}
                      onFocus={stopGhost} autoComplete="name"
                      ghost={GHOSTS.name} ghostActive={ghosting && ghostStage === 0}
                      onGhostDone={() => advanceGhost(1)}
                    />
                    <WrittenLine
                      id="c-email" lead="and you can reach me at" type="email" value={values.email}
                      error={errors.email} onChange={(v) => setField("email", v)}
                      onFocus={stopGhost} autoComplete="email"
                      ghost={GHOSTS.email} ghostActive={ghosting && ghostStage === 1}
                      onGhostDone={() => advanceGhost(2)}
                    />
                    <WrittenLine
                      id="c-message" lead="I wanted to say" as="textarea" value={values.message}
                      error={errors.message} onChange={(v) => setField("message", v)}
                      onFocus={stopGhost}
                      ghost={GHOSTS.message} ghostActive={ghosting && ghostStage === 2}
                      onGhostDone={() => advanceGhost(3)}
                    />
                  </div>

                  <div className="contactcard__foot">
                    <span className="contactcard__regards">
                      {ready ? "Ready to send." : "Kind regards,"}
                    </span>
                    <Magnetic strength={8}>
                      <m.button
                        type="submit"
                        className={`contactcard__send${ready ? " is-ready" : ""}`}
                        disabled={status === "submitting"}
                        whileHover={status === "submitting" ? undefined : { y: -2 }}
                        whileTap={status === "submitting" ? undefined : { scale: 0.96 }}
                        transition={spring.snappy}
                      >
                        <SendIcon />
                        {status === "submitting" ? "Sending…" : "Seal & Send"}
                      </m.button>
                    </Magnetic>
                  </div>
                </form>

                <p className="contactcard__error" role="status" aria-live="polite">
                  <AnimatePresence>
                    {status === "error" && (
                      <m.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {errors._form || "Something went wrong."}{" "}
                        <a href={`mailto:${CONTACT_EMAIL}`}>email me directly</a>.
                      </m.span>
                    )}
                  </AnimatePresence>
                </p>
              </m.div>
            )}
          </AnimatePresence>

          <Envelope phase={phase} />
        </m.div>
      </div>
    </div>
  );
}

function EmailCopy() {
  const { status, copy } = useCopy();
  const copied = status === "copied";
  return (
    <div className="contactview__email">
      <span className="contactview__emailtext">{CONTACT_EMAIL}</span>
      <Magnetic strength={5} className="contactview__copywrap">
        <m.button
          type="button"
          className="contactview__copybtn"
          onClick={() => copy(CONTACT_EMAIL)}
          aria-label={copied ? "Email address copied" : `Copy email address ${CONTACT_EMAIL}`}
          title={copied ? "Copied" : "Copy email"}
          whileTap={{ scale: 0.9 }}
          transition={spring.snappy}
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <m.span key="ok" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <CheckIcon />
              </m.span>
            ) : (
              <m.span key="copy" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <CopyIcon />
              </m.span>
            )}
          </AnimatePresence>
        </m.button>
      </Magnetic>
    </div>
  );
}

function Envelope({ phase }) {
  const sealing = phase === "sealing" || phase === "flying";
  const unsealing = phase === "unsealing";
  const shown = sealing || unsealing;
  const t = (ms) => ms / 1000;
  const lead = t(STAGE.settle);

  // Closing runs sides → flap → seal; opening runs seal → flap → sides. The
  // opening targets are two-value keyframes so each part snaps to its sealed
  // state on the first frame and animates out of it.
  const sides = unsealing
    ? { to: [1, 0.12], delay: lead + t(STAGE.fold + STAGE.seal), duration: t(STAGE.flap) }
    : { to: shown ? 1 : 0.12, delay: shown ? lead : 0, duration: t(STAGE.fold) };
  const flap = unsealing
    ? { to: [0, -160], delay: lead + t(STAGE.fold + STAGE.seal), duration: t(STAGE.flap) }
    : { to: shown ? 0 : -160, delay: shown ? lead + t(STAGE.fold) : 0, duration: t(STAGE.flap) };
  const seal = unsealing
    ? { to: [1, 0], delay: lead + t(STAGE.fold) }
    : { to: shown ? 1 : 0, delay: shown ? lead + t(STAGE.fold + STAGE.flap) : 0 };

  return (
    <div aria-hidden="true" className="envelope" style={{ perspective: 1000 }}>
      <m.div
        initial={false}
        animate={{ opacity: shown ? 1 : 0 }}
        transition={{ duration: 0.2, delay: sealing ? lead : 0 }}
        className="envelope__inner"
      >
        {[0, 1].map((side) => (
          <m.div
            key={side}
            initial={false}
            animate={{ scaleX: sides.to }}
            transition={{ duration: sides.duration, delay: sides.delay, ease: ease.standard }}
            className={`envelope__side envelope__side--${side}`}
          />
        ))}
        <m.div
          initial={false}
          animate={{ rotateX: flap.to }}
          transition={{ duration: flap.duration, delay: flap.delay, ease: ease.standard }}
          className="envelope__flap"
        />
        <m.div
          initial={false}
          animate={{ scale: seal.to }}
          transition={{ delay: seal.delay, type: "spring", stiffness: 520, damping: 14 }}
          className="envelope__seal"
        >
          MN
        </m.div>
      </m.div>
    </div>
  );
}

function FlightTrail({ active }) {
  if (!active) return null;
  return (
    <div aria-hidden="true" className="flighttrail">
      {[0, 1, 2, 3].map((i) => (
        <m.span
          key={i}
          initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: [0, 0.7, 0], x: 52 + i * 8, y: -104 - i * 30, scale: 0.3 }}
          transition={{ duration: 0.7, delay: 0.12 + i * 0.07, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function Delivered({ onWriteAnother }) {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={spring.soft}
      className="contactcard__delivered"
    >
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <m.circle
          cx="26" cy="26" r="24" stroke="currentColor" strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0.35 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: ease.standard }}
        />
        <m.path
          d="M16 27l7 7 13-14" stroke="currentColor" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.35, ease: ease.standard }}
        />
      </svg>
      <p className="contactcard__deliveredtitle">Message delivered</p>
      <p className="contactcard__deliveredtext" role="status" aria-live="polite">
        Your letter reached Mukul. I&rsquo;ll get back to you soon.
      </p>
      <button type="button" className="contactcard__another" onClick={onWriteAnother}>
        Write another
      </button>
    </m.div>
  );
}

function WrittenLine({
  id, lead, value, error, onChange, onFocus, type = "text", as = "input", autoComplete,
  ghost = "", ghostActive = false, onGhostDone,
}) {
  const errorId = `${id}-error`;
  const ghostText = useGhostType(ghost, ghostActive && !value, { onDone: onGhostDone });
  const showGhost = ghostText && !value;

  const common = {
    id,
    value,
    onChange: (e) => onChange(e.target.value),
    onFocus,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorId : undefined,
  };

  return (
    <div className={`writtenline${as === "textarea" ? " writtenline--body" : ""}`}>
      <label htmlFor={id}>{lead}</label>
      <div className="writtenline__field">
        {as === "textarea" ? (
          <textarea rows={4} {...common} />
        ) : (
          <input type={type} autoComplete={autoComplete} {...common} />
        )}
        {showGhost && (
          <span aria-hidden="true" className="writtenline__ghost">
            {ghostText}
            <span className="writtenline__caret" />
          </span>
        )}
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <m.p
            id={errorId}
            className="writtenline__error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: ease.standard }}
          >
            {error}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 3 18 9-18 9 4-9-4-9Z" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
