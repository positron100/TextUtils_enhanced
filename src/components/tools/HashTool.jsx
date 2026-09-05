import { useEffect, useRef, useState } from "react";
import { useToolIO } from "../../hooks/useToolIO.js";
import { hashText, HASH_ALGORITHMS } from "../../lib/developer/hash.js";
import { ToolField, ToolMessage, ToolLayout } from "./ToolParts.jsx";

const BIG = 100_000;

export default function HashTool({ editorText }) {
  const io = useToolIO(editorText);
  const [algorithm, setAlgorithm] = useState("SHA-256");
  const runId = useRef(0);
  const { input, emit, fail, setFeedback } = io;

  useEffect(() => {
    const id = ++runId.current;
    let alive = true;
    const isBig = input.length > BIG;
    if (isBig) setFeedback({ type: "status", text: `${algorithm} (hashing…)` });
    const t = setTimeout(
      async () => {
        const r = await hashText(input, algorithm);
        if (!alive || id !== runId.current) return;
        if (r.ok) emit(r.value, "", false);
        else fail(r.error.message);
      },
      isBig ? 120 : 0,
    );
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [input, algorithm, emit, fail, setFeedback]);

  return (
    <ToolLayout
      hint={
        <p className="tool__hint">
          A cryptographic hash is a one-way digest — it is <strong>not encryption</strong> and
          cannot be reversed.
        </p>
      }
      input={
        <ToolField
          label="Input"
          value={input}
          onChange={io.setInput}
          placeholder="Text to hash"
          onClear={io.clearInput}
        />
      }
      controls={HASH_ALGORITHMS.map((algo) => (
        <button
          key={algo}
          type="button"
          className="tool__segment"
          aria-pressed={algo === algorithm}
          onClick={() => setAlgorithm(algo)}
        >
          {algo}
        </button>
      ))}
      message={<ToolMessage feedback={io.feedback} />}
      inputKey={io.inputKey}
      outputKey={algorithm}
      output={
        <ToolField
          label={algorithm}
          value={io.output}
          readOnly
          mono
          onCopy={io.copyOutput}
          onClear={io.clearOutput}
        />
      }
    />
  );
}
