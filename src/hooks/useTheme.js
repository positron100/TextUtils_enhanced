import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "textutils:theme";

// The inline script in index.html resolves and stamps the theme onto
// <html data-theme> before React mounts — read it back rather than recompute.
function readStampedTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function hasStoredChoice() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark";
  } catch {
    return false;
  }
}

/**
 * `setTheme` applies + persists the theme with NO visual reveal — the reveal
 * is owned by useThemeToggleController / startThemeReveal, which call this
 * synchronously inside the View Transition callback.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(readStampedTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // Follow the OS while the user has never made an explicit choice.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!hasStoredChoice()) setThemeState(mq.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode */
    }
  }, []);

  return { theme, setTheme };
}
