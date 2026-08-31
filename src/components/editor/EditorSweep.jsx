import { useEffect, useState } from "react";
import { m } from "framer-motion";
import { spatialSpringMedium } from "../../lib/spatial.js";
import "./EditorSweep.css";

/**
 * The editor's card-swipe. On every editor action (transform, clean, undo,
 * redo, clear) a snapshot of the *previous* text slides off the way the primary
 * views do, revealing the real editor underneath already showing the new text —
 * so it reads as "the next version of the editor was sitting beside this one".
 *
 * The real <Editor> never unmounts (history / selection / scroll stay intact) —
 * this is a throwaway visual layer on top. Nothing renders under reduced motion.
 */
export default function EditorSweep({ sweep, reduce }) {
  const [card, setCard] = useState(null);

  useEffect(() => {
    if (reduce || !sweep || sweep.seq === 0) return undefined;
    setCard({ seq: sweep.seq, dir: sweep.dir, text: sweep.from });
    const t = window.setTimeout(() => setCard(null), 820);
    return () => window.clearTimeout(t);
  }, [sweep, reduce]);

  if (!card) return null;

  return (
    <m.div
      key={card.seq}
      className="editor__sweep"
      aria-hidden="true"
      initial={{ x: "0%", opacity: 1 }}
      animate={{ x: card.dir >= 0 ? "-100%" : "100%", opacity: 0.4 }}
      transition={spatialSpringMedium}
    >
      <div className="editor__area editor__area--ghost">{card.text || "​"}</div>
    </m.div>
  );
}
