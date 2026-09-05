import { useEffect, useState } from "react";

/**
 * Live match for a media query, so a layout that is genuinely a different
 * composition per breakpoint can be a different tree rather than the same tree
 * with pieces hidden. Same shape as useReducedMotion — resolved synchronously
 * on the first render so nothing flashes in the wrong structure.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => window.matchMedia?.(query).matches ?? false,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
