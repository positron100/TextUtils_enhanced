import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Clipboard write with a transient status: "idle" | "copied" | "error".
 * Falls back to a hidden-textarea execCommand when the async Clipboard API
 * is unavailable (insecure context, older browser).
 */
export function useCopy(resetMs = 1600) {
  const [status, setStatus] = useState("idle");
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text) => {
      let ok = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          ok = true;
        } else {
          ok = legacyCopy(text);
        }
      } catch {
        ok = legacyCopy(text);
      }

      setStatus(ok ? "copied" : "error");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus("idle"), resetMs);
      return ok;
    },
    [resetMs],
  );

  return { status, copy };
}

function legacyCopy(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
