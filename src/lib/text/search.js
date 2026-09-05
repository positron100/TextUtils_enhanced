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

/** Marks kept in the DOM at once. See buildHighlightSegments. */
export const MAX_HIGHLIGHT_MARKS = 1000;

/**
 * Split `text` into the segments a highlight backdrop renders: plain runs and
 * marked runs, with the active match flagged.
 *
 * ponytail: a document with 10k matches would otherwise put 20k nodes in the
 * backdrop and reconcile them on every keystroke. Only a window of
 * `maxMarks` around the current match is wrapped — the rest of the text is
 * still rendered (the backdrop has to mirror it for the layout to line up),
 * just not individually marked. The window follows the match you are on, which
 * is the only part of the document on screen. Raise the cap, or window by
 * visible scroll offset instead, if that ever stops being true.
 */
export function buildHighlightSegments(
  text,
  ranges,
  activeIndex = 0,
  maxMarks = MAX_HIGHLIGHT_MARKS,
) {
  if (!ranges || ranges.length === 0) return [{ text }];

  let window = ranges;
  if (ranges.length > maxMarks) {
    const half = Math.floor(maxMarks / 2);
    const from = Math.min(Math.max(0, activeIndex - half), ranges.length - maxMarks);
    window = ranges.slice(from, from + maxMarks);
  }

  const active = ranges[activeIndex];
  const out = [];
  let pos = 0;
  for (const r of window) {
    if (r.end <= r.start || r.start < pos) continue; // zero-width / overlap
    if (r.start > pos) out.push({ text: text.slice(pos, r.start) });
    out.push({ text: text.slice(r.start, r.end), mark: true, current: r === active });
    pos = r.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}
