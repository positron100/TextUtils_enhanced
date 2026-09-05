import { describe, it, expect } from "vitest";
import { buildHighlightSegments, buildSearchRegex, findMatches } from "./search.js";

const ranges = (text, query, opts) =>
  findMatches(text, buildSearchRegex(query, opts));

describe("buildSearchRegex / findMatches", () => {
  it("finds all literal matches, case-insensitive by default", () => {
    expect(ranges("Cat cat CAT", "cat")).toHaveLength(3);
  });
  it("respects case sensitivity", () => {
    expect(ranges("Cat cat CAT", "cat", { caseSensitive: true })).toEqual([
      { start: 4, end: 7 },
    ]);
  });
  it("treats the query as a literal, not a pattern", () => {
    expect(ranges("a.b axb", "a.b")).toEqual([{ start: 0, end: 3 }]);
  });
  it("supports whole-word matching", () => {
    expect(ranges("son person sons", "son", { wholeWord: true })).toEqual([
      { start: 0, end: 3 },
    ]);
  });
  it("returns nothing for an empty query", () => {
    expect(ranges("anything", "")).toEqual([]);
  });
  it("handles unicode", () => {
    expect(ranges("café CAFÉ", "café")).toHaveLength(2);
  });
});

describe("buildHighlightSegments", () => {
  const seg = (text, query, active = 0, max) =>
    buildHighlightSegments(text, ranges(text, query), active, max);

  it("returns one plain segment when there is nothing to mark", () => {
    expect(buildHighlightSegments("hello", [])).toEqual([{ text: "hello" }]);
  });

  it("marks every match and flags the active one", () => {
    const out = seg("a cat and a cat", "cat", 1);
    expect(out.filter((s) => s.mark)).toHaveLength(2);
    expect(out.filter((s) => s.current)).toHaveLength(1);
    expect(out.find((s) => s.current).text).toBe("cat");
    // the segments concatenate back to the original text, exactly
    expect(out.map((s) => s.text).join("")).toBe("a cat and a cat");
  });

  it("keeps the text intact for unicode and multiline matches", () => {
    const text = "café\nCAFÉ olé";
    const out = seg(text, "café");
    expect(out.map((s) => s.text).join("")).toBe(text);
    expect(out.filter((s) => s.mark)).toHaveLength(2);
  });

  it("windows the marks around the active match without losing text", () => {
    const text = "x".repeat(0) + Array.from({ length: 50 }, () => "hit .").join("");
    const all = ranges(text, "hit");
    expect(all).toHaveLength(50);
    const out = buildHighlightSegments(text, all, 40, 10);
    expect(out.filter((s) => s.mark)).toHaveLength(10);
    expect(out.filter((s) => s.current)).toHaveLength(1);
    expect(out.map((s) => s.text).join("")).toBe(text);
  });
});
