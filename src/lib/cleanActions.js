// The Clean toolkit as data: id, label, group, and a pure (string → string)
// transform. Surfaced through the command palette and the Write action rail.

import {
  trimLines,
  trimDocument,
  collapseWhitespace,
  removeBlankLines,
  normalizeNewlines,
  spacesToTabs,
  tabsToSpaces,
} from "./text/whitespace.js";
import {
  sortLinesAsc,
  sortLinesDesc,
  sortLinesNumeric,
  reverseLines,
  dedupeLines,
} from "./text/lines.js";
import {
  removePunctuation,
  removeNumbers,
  removeSpecialCharacters,
  keepLettersOnly,
  keepNumbersOnly,
  removeEmojis,
} from "./text/cleanup.js";
import { straightenQuotes, normalizeUnicode } from "./text/normalization.js";

export const CLEAN_ACTIONS = [
  { group: "Whitespace", id: "trim-lines", label: "Trim lines", run: trimLines },
  { group: "Whitespace", id: "trim-document", label: "Trim document", run: trimDocument },
  { group: "Whitespace", id: "collapse-whitespace", label: "Collapse whitespace", run: collapseWhitespace },
  { group: "Whitespace", id: "remove-blank-lines", label: "Remove blank lines", run: removeBlankLines },
  { group: "Whitespace", id: "normalize-newlines", label: "Normalize line endings", run: normalizeNewlines },
  { group: "Whitespace", id: "spaces-to-tabs", label: "Spaces → tabs", run: (t) => spacesToTabs(t) },
  { group: "Whitespace", id: "tabs-to-spaces", label: "Tabs → spaces", run: (t) => tabsToSpaces(t) },

  { group: "Duplicate lines", id: "dedupe-first", label: "Remove duplicates (keep first)", run: (t) => dedupeLines(t, "first") },
  { group: "Duplicate lines", id: "dedupe-last", label: "Remove duplicates (keep last)", run: (t) => dedupeLines(t, "last") },

  { group: "Sort", id: "sort-asc", label: "Sort lines A → Z", run: sortLinesAsc },
  { group: "Sort", id: "sort-desc", label: "Sort lines Z → A", run: sortLinesDesc },
  { group: "Sort", id: "sort-numeric", label: "Sort lines numerically", run: sortLinesNumeric },
  { group: "Sort", id: "reverse-lines", label: "Reverse lines", run: reverseLines },

  { group: "Characters", id: "remove-punctuation", label: "Remove punctuation", run: removePunctuation },
  { group: "Characters", id: "remove-numbers", label: "Remove numbers", run: removeNumbers },
  { group: "Characters", id: "remove-special", label: "Remove special characters", run: removeSpecialCharacters },
  { group: "Characters", id: "keep-letters", label: "Keep only letters", run: keepLettersOnly },
  { group: "Characters", id: "keep-numbers", label: "Keep only numbers", run: keepNumbersOnly },
  { group: "Characters", id: "remove-emojis", label: "Remove emojis", run: removeEmojis },

  { group: "Normalize", id: "straighten-quotes", label: "Straighten smart quotes", run: straightenQuotes },
  { group: "Normalize", id: "normalize-unicode", label: "Normalize Unicode (NFC)", run: normalizeUnicode },
];

export const CLEAN_GROUPS = ["Whitespace", "Duplicate lines", "Sort", "Characters", "Normalize"];
