// Typing-speed metrics. Two models, kept deliberately distinct:
//
//  - free writing  → speed only. There is no reference text, so accuracy is
//                    not defined and is never reported.
//  - typing test   → a reference passage is known, so accuracy, errors and a
//                    true (correct-characters-only) WPM are all meaningful.
//
// A "word" is the standard 5 characters, matching every typing-test site.

const CHARS_PER_WORD = 5;
/** Gaps longer than this don't count as active typing time. */
export const IDLE_GAP_MS = 2000;

/**
 * Active typing time from a list of keystroke timestamps (ms, ascending).
 * Sums the gaps between consecutive keystrokes, ignoring idle gaps.
 */
export function activeTypingMs(timestamps) {
  let total = 0;
  for (let i = 1; i < timestamps.length; i += 1) {
    const gap = timestamps[i] - timestamps[i - 1];
    if (gap > 0 && gap <= IDLE_GAP_MS) total += gap;
  }
  return total;
}

/** Gross WPM estimate for free writing: (chars / 5) / active minutes. */
export function estimateWpm(charCount, activeMs) {
  if (activeMs <= 0 || charCount <= 0) return 0;
  const minutes = activeMs / 60000;
  return Math.round(charCount / CHARS_PER_WORD / minutes);
}

/**
 * Score a typing-test attempt.
 *
 * @param {string} expected  the reference passage
 * @param {string} typed     what the user has entered so far
 * @param {number} elapsedMs wall-clock time since the first keystroke
 * @returns {{ wpm:number, accuracy:number, correct:number, errors:number,
 *            typedChars:number, progress:number, complete:boolean }}
 */
export function scoreTyping(expected, typed, elapsedMs) {
  const typedChars = typed.length;
  let correct = 0;
  for (let i = 0; i < typedChars; i += 1) {
    if (typed[i] === expected[i]) correct += 1;
  }
  const errors = typedChars - correct;
  const minutes = elapsedMs / 60000;
  const wpm = minutes > 0 ? Math.max(0, Math.round(correct / CHARS_PER_WORD / minutes)) : 0;
  const accuracy = typedChars > 0 ? correct / typedChars : 1;
  return {
    wpm,
    accuracy,
    correct,
    errors,
    typedChars,
    progress: expected.length ? Math.min(1, typedChars / expected.length) : 0,
    complete: typedChars >= expected.length && expected.length > 0,
  };
}

/** Per-character verdict for rendering the passage. */
export function charStates(expected, typed) {
  return [...expected].map((ch, i) => {
    if (i >= typed.length) return "pending";
    return typed[i] === ch ? "correct" : "wrong";
  });
}

export const TYPING_PASSAGES = [
  "The quick brown fox jumps over the lazy dog while the sun sets slowly behind the quiet hills. A gentle wind moves through the tall grass, and somewhere far off a train sounds its horn twice before the valley falls silent again for the evening.",
  "Good code is its own best documentation. As you are about to add a comment, ask yourself how to improve the code so the comment is unnecessary. The best programs are written so that computing machines can perform them quickly and so that human beings can understand them clearly.",
  "Simplicity is a great virtue, but it requires hard work to achieve it and education to appreciate it. To make matters worse, complexity sells better. A designer knows they have achieved perfection not when there is nothing left to add, but when there is nothing left to take away.",
  "She sells seashells by the seashore, and the shells she sells are surely seashells, so if she sells shells on the shore then the shells she sells are seashore shells for certain. Peter Piper picked a peck of pickled peppers on the very same afternoon by the very same shore.",
  "Any fool can write code that a computer can understand. Good programmers write code that humans can understand, and they revise it patiently until it reads almost like plain prose. Programs must be written for people to read, and only incidentally for machines to execute.",
];

export function randomPassage(exclude) {
  const pool = TYPING_PASSAGES.filter((p) => p !== exclude);
  return pool[Math.floor(Math.random() * pool.length)] ?? TYPING_PASSAGES[0];
}
