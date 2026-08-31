// Tiny subsequence fuzzy scorer — no dependency. Returns a score (higher is
// better) or -1 when `query` is not a subsequence of `text`.

export function fuzzyScore(query, text) {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = text.toLowerCase();

  let qi = 0;
  let score = 0;
  let run = 0;
  let prev = -2;

  for (let ti = 0; ti < t.length && qi < q.length; ti += 1) {
    if (t[ti] !== q[qi]) {
      run = 0;
      continue;
    }
    score += 1;
    if (ti === prev + 1) {
      run += 1;
      score += run * 3; // reward consecutive runs
    } else {
      run = 0;
    }
    if (ti === 0 || /[\s\-_/.]/.test(t[ti - 1])) score += 6; // word-start bonus
    prev = ti;
    qi += 1;
  }

  if (qi < q.length) return -1;
  score -= (t.length - q.length) * 0.04; // prefer tighter matches
  if (t.startsWith(q)) score += 12;
  return score;
}

/** Rank `items` by the best fuzzy score of `query` against `textOf(item)`. */
export function fuzzyFilter(query, items, textOf) {
  if (!query.trim()) return items.map((item) => ({ item, score: 0 }));
  return items
    .map((item) => ({ item, score: fuzzyScore(query, textOf(item)) }))
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score);
}
