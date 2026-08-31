// Shared literal-search helpers for Find & Replace.

/** Build a global regex for a literal query, honouring case / whole-word. */
export function buildSearchRegex(query, { caseSensitive = false, wholeWord = false } = {}) {
  if (!query) return null;
  let pattern = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (wholeWord) pattern = `(?<![\\p{L}\\p{N}_])${pattern}(?![\\p{L}\\p{N}_])`;
  try {
    return new RegExp(pattern, `gu${caseSensitive ? "" : "i"}`);
  } catch {
    return null;
  }
}

/** All non-overlapping match ranges of `regex` in `text`. */
export function findMatches(text, regex) {
  if (!regex) return [];
  const out = [];
  regex.lastIndex = 0;
  for (const m of text.matchAll(regex)) {
    out.push({ start: m.index, end: m.index + m[0].length });
    if (m[0].length === 0) regex.lastIndex += 1;
  }
  return out;
}
