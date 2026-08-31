import { describe, it, expect } from "vitest";
import { fuzzyScore, fuzzyFilter } from "./fuzzy.js";

describe("fuzzyScore", () => {
  it("returns 0 for an empty query", () => {
    expect(fuzzyScore("", "anything")).toBe(0);
  });
  it("returns -1 when the query is not a subsequence", () => {
    expect(fuzzyScore("xyz", "uppercase")).toBe(-1);
  });
  it("matches a subsequence", () => {
    expect(fuzzyScore("upc", "uppercase")).toBeGreaterThan(0);
  });
  it("is case-insensitive", () => {
    expect(fuzzyScore("JSON", "format json")).toBeGreaterThan(0);
  });
  it("ranks a prefix / word-start match above a scattered one", () => {
    expect(fuzzyScore("cam", "camelCase")).toBeGreaterThan(
      fuzzyScore("cam", "constant a m"),
    );
  });
  it("ranks a contiguous run above a broken one", () => {
    expect(fuzzyScore("sort", "sort lines")).toBeGreaterThan(
      fuzzyScore("sort", "so much random text"),
    );
  });
});

describe("fuzzyFilter", () => {
  const items = [
    { label: "UPPERCASE" },
    { label: "Title Case" },
    { label: "Sort lines A to Z" },
    { label: "Format JSON" },
  ];
  const textOf = (i) => i.label;

  it("returns all items (score 0) for an empty query", () => {
    expect(fuzzyFilter("", items, textOf)).toHaveLength(4);
  });
  it("filters and ranks by score", () => {
    const r = fuzzyFilter("json", items, textOf);
    expect(r).toHaveLength(1);
    expect(r[0].item.label).toBe("Format JSON");
  });
  it("drops non-matches", () => {
    expect(fuzzyFilter("zzz", items, textOf)).toHaveLength(0);
  });
});
