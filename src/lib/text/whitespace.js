// Whitespace tools. Line breaks are preserved unless the operation is
// explicitly about line structure (removeBlankLines).

/** Collapse runs of spaces/tabs within each line; trim each line's edges. */
export function removeExtraSpaces(t) {
  return t
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n");
}

/** Trim leading and trailing whitespace of every line, keep the lines. */
export function trimLines(t) {
  return t
    .split("\n")
    .map((line) => line.replace(/^[^\S\n]+|[^\S\n]+$/g, ""))
    .join("\n");
}

/** Trim whitespace (including blank lines) from the start and end of the document. */
export const trimDocument = (t) => t.replace(/^\s+|\s+$/g, "");

/**
 * Collapse every run of spaces/tabs to a single space and every run of 2+
 * blank lines to a single blank line. Keeps single line breaks.
 */
export function collapseWhitespace(t) {
  return t
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

/** Drop lines that are empty or whitespace-only. */
export const removeBlankLines = (t) =>
  t
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim() !== "")
    .join("\n");

/** Normalise CRLF / CR line endings to LF. */
export const normalizeNewlines = (t) => t.replace(/\r\n?/g, "\n");

/** Convert leading indentation from spaces to tabs (width spaces per tab). */
export function spacesToTabs(t, width = 4) {
  return t.replace(/^[^\S\n]+/gm, (run) => {
    const spaces = run.replace(/\t/g, " ".repeat(width)).length;
    return "\t".repeat(Math.floor(spaces / width)) + " ".repeat(spaces % width);
  });
}

/** Convert every tab to `width` spaces. */
export const tabsToSpaces = (t, width = 4) => t.replace(/\t/g, " ".repeat(width));
