// Character-class cleanup. Unicode-aware (\p{…} with the u flag).
//
// Definitions:
//   letters      \p{L} plus combining marks \p{M} (so "e" + ́ survives intact)
//   numbers      \p{N} (any script's digits, plus numeric symbols like ½)
//   punctuation  \p{P}  ( . , ; : ! ? " ' - – — ( ) [ ] { } … / \ etc. )
//   symbols      \p{S}  ( $ + = ^ ~ | < > ° © math/currency/emoji-ish glyphs )
//   emoji        Extended_Pictographic sequences incl. ZWJ joins, skin-tone
//                modifiers, variation selectors, and regional-indicator pairs
//   "special"    anything that is not a letter, mark, number, punctuation, or
//                whitespace — i.e. symbols and control characters

// ️ = variation selector-16, ‍ = zero-width joiner.
const EMOJI = new RegExp(
  "(?:\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})?" +
    "(?:\\u200D\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})?)*)" +
    "|[\\u{1F1E6}-\\u{1F1FF}]{2}",
  "gu",
);

export const removePunctuation = (t) => t.replace(/\p{P}/gu, "");
export const removeNumbers = (t) => t.replace(/\p{N}/gu, "");

/** Strip symbols and control chars; keep letters, numbers, punctuation, whitespace. */
export const removeSpecialCharacters = (t) =>
  t.replace(/[^\p{L}\p{M}\p{N}\p{P}\s]/gu, "");

/** Keep letters (and their marks) and whitespace; drop everything else. */
export const keepLettersOnly = (t) => t.replace(/[^\p{L}\p{M}\s]/gu, "");

/** Keep digits and whitespace; drop everything else. */
export const keepNumbersOnly = (t) => t.replace(/[^\p{N}\s]/gu, "");

export const removeEmojis = (t) => t.replace(EMOJI, "");
