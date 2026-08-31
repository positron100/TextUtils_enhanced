import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import Magnetic from "../ui/Magnetic.jsx";
import { useCopy } from "../../hooks/useCopy.js";
import { useGhostType } from "../../hooks/useGhostType.js";
import { ease, spring } from "../../lib/motion.js";
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
 * envelope, seals it and flies it away. Adapted from the portfolio's ContactForm.
 */
export default function ContactView() {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | error
  const [phase, setPhase] = useState("writing"); // writing | sealing | flying | delivered
  const [ghostStage, setGhostStage] = useState(0); // 0 name · 1 email · 2 message · 3 off

  const inFlight = useRef(false);
  const honeypot = useRef("");
  const cardRef = useRef(null);
  const reserved = useRef(null);
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
  const envW = Math.min(ENVELOPE.w, reserved.current?.width ?? ENVELOPE.w);

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

    try {
      if (reduce) {
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

      const el = cardRef.current;
      if (el) reserved.current = { width: el.offsetWidth, height: el.offsetHeight };
      setPhase("sealing");
      await sleep(STAGE.settle + STAGE.fold + STAGE.flap + STAGE.seal);
      const sent = await request;
      if (!alive.current) return;

      if (!sent) {
        setPhase("writing");
        setStatus("error");
        return;
      }

      setPhase("flying");
      await sleep(STAGE.fly);
      if (!alive.current) return;
      setValues(initial);
      setPhase("delivered");
    } finally {
      inFlight.current = false;
    }
  }

  function handleWriteAnother() {
    if (inFlight.current) return;
    setStatus("idle");
    setErrors({});
    setPhase("writing");
  }

  const cardAnim = {
    writing: { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, width: "auto", height: "auto" },
    sealing: { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, width: envW, height: ENVELOPE.h },
    flying: { x: 96, y: -230, rotate: -15, scale: 0.28, opacity: 0, width: envW, height: ENVELOPE.h },
    delivered: { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, width: "auto", height: "auto" },
  }[phase];

  const cardTransition =
    phase === "flying"
      ? { duration: STAGE.fly / 1000, ease: [0.5, 0, 0.3, 1] }
      : phase === "sealing"
        ? { duration: STAGE.fold / 1000, delay: STAGE.settle / 1000, ease: ease.standard }
        : { duration: STAGE.fold / 1000, ease: ease.standard };

  return (
    <div className="contactview">
      <div className="contactview__intro">
        <p className="hero__kicker">Contact</p>
        <h2 className="contactview__title">Made by Mukul. Say hello.</h2>
        <p className="contactview__text">
          TextUtils is a personal project — everything runs locally in your browser. Found a bug,
          want a tool added, or just want to talk shop? Write a note.
        </p>
        <EmailCopy />
      </div>

      <div
        className="contactview__stage"
        style={{ minHeight: sealed ? reserved.current?.height : undefined }}
      >
        <FlightTrail active={phase === "flying"} />

        <m.div
          ref={cardRef}
          animate={cardAnim}
          transition={cardTransition}
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
  const t = (ms) => ms / 1000;
  const lead = t(STAGE.settle);

  return (
    <div aria-hidden="true" className="envelope" style={{ perspective: 1000 }}>
      <m.div
        initial={false}
        animate={{ opacity: sealing ? 1 : 0 }}
        transition={{ duration: 0.2, delay: sealing ? lead : 0 }}
        className="envelope__inner"
      >
        {[0, 1].map((side) => (
          <m.div
            key={side}
            initial={false}
            animate={{ scaleX: sealing ? 1 : 0.12 }}
            transition={{ duration: t(STAGE.fold), delay: sealing ? lead : 0, ease: ease.standard }}
            className={`envelope__side envelope__side--${side}`}
          />
        ))}
        <m.div
          initial={false}
          animate={{ rotateX: sealing ? 0 : -160 }}
          transition={{ duration: t(STAGE.flap), delay: sealing ? lead + t(STAGE.fold) : 0, ease: ease.standard }}
          className="envelope__flap"
        />
        <m.div
          initial={false}
          animate={{ scale: sealing ? 1 : 0 }}
          transition={{ delay: sealing ? lead + t(STAGE.fold + STAGE.flap) : 0, type: "spring", stiffness: 520, damping: 14 }}
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
