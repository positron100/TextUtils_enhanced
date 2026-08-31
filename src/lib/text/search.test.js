import { describe, it, expect } from "vitest";
import { buildSearchRegex, findMatches } from "./search.js";

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
