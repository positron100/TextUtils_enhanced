import { useCallback, useState } from "react";
import { useCopy } from "./useCopy.js";

/**
 * Shared input/output plumbing for the developer tools. `emit()` publishes a
 * new output and bumps `outputKey`; clearing the input bumps `inputKey`. Both
 * keys drive a SpatialSurface so the surface card-swipes rather than swapping
 * in place.
 */
export function useToolIO(initial = "") {
  const [input, setInput] = useState(initial);
  const [inputKey, setInputKey] = useState(0);
  const [output, setOutput] = useState("");
  const [outputKey, setOutputKey] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const { copy } = useCopy();

  const emit = useCallback((value, msg, bump = true) => {
    setOutput(value);
    if (bump) setOutputKey((k) => k + 1);
    if (msg !== undefined) setFeedback(msg ? { type: "success", text: msg } : null);
  }, []);

  const fail = useCallback((text) => {
    setOutput("");
    setOutputKey((k) => k + 1);
    setFeedback({ type: "error", text });
  }, []);

  const clearInput = useCallback(() => {
    setInput("");
    setInputKey((k) => k + 1);
    setFeedback(null);
  }, []);

  const clearOutput = useCallback(() => {
    setOutput("");
    setOutputKey((k) => k + 1);
    setFeedback(null);
  }, []);

  return {
    input,
    setInput,
    inputKey,
    output,
    outputKey,
    feedback,
    setFeedback,
    emit,
    fail,
    clearInput,
    clearOutput,
    copyOutput: () => copy(output),
  };
}
