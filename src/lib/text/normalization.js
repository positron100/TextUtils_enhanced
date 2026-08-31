// Text normalisation. "Normalize whitespace" and "Normalize line endings" live
// in whitespace.js (collapseWhitespace / normalizeNewlines) — not duplicated here.

const DOUBLE_QUOTES = /[“”„‟«»″〃]/g;
const SINGLE_QUOTES = /[‘’‚‛′´‵]/g;

/** Curly / angled / prime quotes → straight ASCII quotes. Leaves other punctuation alone. */
export const straightenQuotes = (t) =>
  t.replace(DOUBLE_QUOTES, '"').replace(SINGLE_QUOTES, "'");

/**
 * Unicode normalisation to NFC (canonical composition) — recombines a base
 * letter + combining mark into the single precomposed code point where one
 * exists ("e" + ́ → "é"). NFC is the form recommended for text interchange and
 * keeps the string as short as possible without changing how it renders.
 */
export const normalizeUnicode = (t) => t.normalize("NFC");
