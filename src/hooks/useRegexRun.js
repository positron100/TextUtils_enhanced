import { useEffect, useRef, useState } from "react";
import { compileRegex, runRegex } from "../lib/developer/regex.js";

/** A pattern that has not produced a result by now is not going to. */
const TIMEOUT_MS = 1200;
/** Keystrokes settle before a run starts, so typing a pattern is not 12 runs. */
const DEBOUNCE_MS = 120;

const EMPTY = { error: undefined, matches: [], count: 0, truncated: false };

/**
 * Runs the regex tester's pattern, in a worker where one is available.
 *
 * Catastrophic backtracking is not a hypothetical here — the tester invites
 * arbitrary patterns. On the main thread /(a+)+b/ against a line of 'a's takes
 * the tab with it. In a worker the same pattern hangs a thread we own, and the
 * timeout terminates it: the page never stops responding, and the tool reports
 * the stop through the same inline error path an invalid pattern uses.
 *
 * Falls back to running synchronously where Worker is unavailable (jsdom under
 * test, or a browser that refuses the module worker). The cap in runRegex still
 * applies, so the fallback is bounded in output even though it is not bounded
 * in time.
 */
export function useRegexRun(pattern, text, flags) {
  const [result, setResult] = useState(EMPTY);
  const workerRef = useRef(null);
  const timerRef = useRef(null);
  const runIdRef = useRef(0);

  // One worker for the tool's lifetime, replaced only when a run is killed.
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!pattern) {
      setResult(EMPTY);
      return undefined;
    }

    // A run in flight is stale the moment the pattern changes.
    const runId = ++runIdRef.current;
    let cancelled = false;
    let killTimer = 0;

    const debounce = window.setTimeout(() => {
      const worker = ensureWorker(workerRef);

      if (!worker) {
        const compiled = compileRegex(pattern, flags);
        if (!compiled.ok) return setResult({ ...EMPTY, error: compiled.error.message });
        return setResult({ ...EMPTY, ...runRegex(compiled.regex, text) });
      }

      const onMessage = (event) => {
        if (cancelled || event.data?.id !== runId) return;
        window.clearTimeout(killTimer);
        worker.removeEventListener("message", onMessage);
        const { error, matches = [], count = 0, truncated = false } = event.data;
        setResult({ error, matches, count, truncated });
      };
      worker.addEventListener("message", onMessage);

      killTimer = window.setTimeout(() => {
        if (cancelled) return;
        // The thread is wedged inside exec — nothing short of terminating it
        // will come back. The next run gets a fresh worker.
        worker.terminate();
        workerRef.current = null;
        setResult({
          ...EMPTY,
          error: "Pattern took too long and was stopped. It may backtrack catastrophically.",
        });
      }, TIMEOUT_MS);

      worker.postMessage({ id: runId, pattern, flags, text });
    }, DEBOUNCE_MS);

    timerRef.current = debounce;
    return () => {
      cancelled = true;
      window.clearTimeout(debounce);
      window.clearTimeout(killTimer);
    };
  }, [pattern, text, flags]);

  return result;
}

function ensureWorker(ref) {
  if (ref.current) return ref.current;
  try {
    ref.current = new Worker(new URL("../lib/developer/regexWorker.js", import.meta.url), {
      type: "module",
    });
    return ref.current;
  } catch {
    return null; // no worker here — the caller runs it inline
  }
}
