// One single-pass-ish read of the text into every metric the UI shows.
// Cheap regexes only — this runs on every keystroke (memoised on `text`).

const WORDS_PER_MIN_READING = 200;
const WORDS_PER_MIN_SPEAKING = 130;

export function computeStats(text) {
  const chars = [...text].length;
  const charsNoSpaces = [...text.replace(/\s/gu, "")].length;

  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/u).length : 0;

  // Count runs of sentence-ending punctuation (linear — this runs per keystroke).
  let sentences = (text.match(/[.!?…]+/gu) || []).length;
  if (sentences === 0 && words > 0) sentences = 1;

  const lines = text === "" ? 0 : text.split(/\r\n|\r|\n/).length;

  const paragraphs = trimmed
    ? trimmed.split(/\n[ \t]*\n/).filter((p) => p.trim() !== "").length
    : 0;

  return {
    words,
    chars,
    charsNoSpaces,
    sentences,
    lines,
    paragraphs,
    readingSeconds: (words / WORDS_PER_MIN_READING) * 60,
    speakingSeconds: (words / WORDS_PER_MIN_SPEAKING) * 60,
  };
}

/** "0 sec" · "45 sec" · "1 min" · "3 min 20 sec" */
export function formatDuration(totalSeconds) {
  const s = Math.round(totalSeconds);
  if (s < 60) return `${s} sec`;
  const min = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${min} min ${rem} sec` : `${min} min`;
}
