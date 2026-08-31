// Case transforms. All pure, Unicode-aware where it matters, multiline-safe.

export const upperCase = (t) => t.toUpperCase();
export const lowerCase = (t) => t.toLowerCase();

/** Capitalise the first letter of every word; lower-case the rest. */
export function titleCase(t) {
  // Word boundaries: start, whitespace, opening brackets/quotes, hyphen,
  // underscore, slash. Apostrophes are NOT boundaries ("law's" stays "law's").
  return t
    .toLowerCase()
    .replace(/(^|[\s([{"“\-_/])(\p{L})/gu, (_, lead, ch) => lead + ch.toUpperCase());
}

/** Lower-case everything, then capitalise the first letter of each sentence. */
export function sentenceCase(t) {
  return t
    .toLowerCase()
    .replace(/(^\s*|[.!?…]\s+|\n\s*)(\p{L})/gu, (_, lead, ch) => lead + ch.toUpperCase());
}

/**
 * Split arbitrary text into word tokens for programmer-case output: break on
 * non-alphanumerics AND on camelCase humps / ACRONYMBoundaries.
 */
function tokens(t) {
  return t
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, "$1 $2")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

export function camelCase(t) {
  return tokens(t)
    .map((w, i) => (i === 0 ? w.toLowerCase() : cap(w)))
    .join("");
}

export const pascalCase = (t) => tokens(t).map(cap).join("");
export const snakeCase = (t) => tokens(t).map((w) => w.toLowerCase()).join("_");
export const kebabCase = (t) => tokens(t).map((w) => w.toLowerCase()).join("-");
export const constantCase = (t) => tokens(t).map((w) => w.toUpperCase()).join("_");
