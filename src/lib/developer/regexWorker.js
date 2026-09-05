// The regex tester's execution off the main thread.
//
// A pattern like /(a+)+b/ against a few dozen 'a's backtracks for minutes.
// Wrapping the synchronous exec in a timer on the main thread would prove
// nothing — the thread is what is stuck. Running it here means the page stays
// alive and the only recourse that actually works, terminating the thread mid
// exec, is available to the caller.
//
// Message in:  { id, pattern, flags, text }
// Message out: { id, error } | { id, matches, count, truncated }
// Same shapes the synchronous path returns, so the tool is indifferent to
// which one produced them.

import { compileRegex, runRegex } from "./regex.js";

self.onmessage = (event) => {
  const { id, pattern, flags, text } = event.data ?? {};
  const compiled = compileRegex(pattern, flags);
  if (!compiled.ok) {
    self.postMessage({ id, error: compiled.error.message });
    return;
  }
  try {
    const { matches, count, truncated } = runRegex(compiled.regex, text);
    self.postMessage({ id, matches, count, truncated });
  } catch (e) {
    self.postMessage({ id, error: String(e?.message || e) });
  }
};
