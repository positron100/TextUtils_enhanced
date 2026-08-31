// Line-level operations: sort, reverse, de-duplicate. All pure.
//
// Line model: the text is split on "\n". A single trailing newline is treated
// as a document terminator, not an empty line — it is stripped before the
// operation and re-appended after, so "a\nb\n" stays newline-terminated.
// Blank lines and whitespace-only lines are ordinary lines (matched exactly,
// never trimmed).

function mapLines(text, fn) {
  const trailing = text.endsWith("\n");
  const lines = text.split("\n");
  if (trailing) lines.pop();
  return fn(lines).join("\n") + (trailing ? "\n" : "");
}

const collator = new Intl.Collator(undefined, { sensitivity: "accent" });
const numericCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "accent" });

/** A → Z, case-insensitive, accent-aware, stable. */
export const sortLinesAsc = (t) =>
  mapLines(t, (lines) => [...lines].sort((a, b) => collator.compare(a, b)));

/** Z → A. */
export const sortLinesDesc = (t) =>
  mapLines(t, (lines) => [...lines].sort((a, b) => collator.compare(b, a)));

/** Natural/numeric order: "2" < "4" < "10" < "30", "item2" < "item10". */
export const sortLinesNumeric = (t) =>
  mapLines(t, (lines) => [...lines].sort((a, b) => numericCollator.compare(a, b)));

/** Exact reverse of the line order. */
export const reverseLines = (t) => mapLines(t, (lines) => [...lines].reverse());

/**
 * Remove duplicate lines (exact match).
 *  - keep "first": first occurrence stays, order of first occurrences kept
 *  - keep "last":  last occurrence stays, order of last occurrences kept
 * Duplicate blank lines collapse to one.
 */
export function dedupeLines(text, keep = "first") {
  return mapLines(text, (lines) => {
    const seen = new Set();
    if (keep === "last") {
      const out = [];
      for (let i = lines.length - 1; i >= 0; i -= 1) {
        if (!seen.has(lines[i])) {
          seen.add(lines[i]);
          out.push(lines[i]);
        }
      }
      return out.reverse();
    }
    return lines.filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    });
  });
}
