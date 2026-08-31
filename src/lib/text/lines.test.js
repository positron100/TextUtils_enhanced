import { describe, it, expect } from "vitest";
import {
  sortLinesAsc,
  sortLinesDesc,
  sortLinesNumeric,
  reverseLines,
  dedupeLines,
} from "./lines.js";

describe("dedupeLines", () => {
  const src = "apple\nbanana\napple\norange\nbanana";

  it("keeps the first occurrence by default", () => {
    expect(dedupeLines(src)).toBe("apple\nbanana\norange");
  });
  it("keeps the last occurrence in order", () => {
    expect(dedupeLines(src, "last")).toBe("apple\norange\nbanana");
  });
  it("collapses duplicate blank lines", () => {
    expect(dedupeLines("a\n\n\nb\n\nc")).toBe("a\n\nb\nc");
  });
  it("matches lines exactly — does not trim", () => {
    expect(dedupeLines("a\n a \na")).toBe("a\n a ");
  });
  it("no-ops when there are no duplicates", () => {
    expect(dedupeLines("a\nb\nc")).toBe("a\nb\nc");
  });
  it("preserves a trailing newline", () => {
    expect(dedupeLines("a\na\nb\n")).toBe("a\nb\n");
  });
  it("handles empty and single-line input", () => {
    expect(dedupeLines("")).toBe("");
    expect(dedupeLines("only")).toBe("only");
  });
});

describe("sorting", () => {
  it("sorts A → Z, case-insensitive, accent-aware", () => {
    expect(sortLinesAsc("banana\nApple\ncherry")).toBe("Apple\nbanana\ncherry");
    expect(sortLinesAsc("éclair\nadobe\nzebra")).toBe("adobe\néclair\nzebra");
  });
  it("sorts Z → A", () => {
    expect(sortLinesDesc("a\nc\nb")).toBe("c\nb\na");
  });
  it("sorts numerically, not lexically", () => {
    expect(sortLinesNumeric("10\n2\n30\n4")).toBe("2\n4\n10\n30");
    expect(sortLinesNumeric("item10\nitem2\nitem1")).toBe("item1\nitem2\nitem10");
  });
  it("does not mutate line contents", () => {
    expect(sortLinesAsc("  spaced\nplain")).toBe("  spaced\nplain");
  });
  it("keeps blank lines (they sort first in A → Z)", () => {
    expect(sortLinesAsc("b\n\na")).toBe("\na\nb");
  });
  it("is stable and preserves a trailing newline", () => {
    expect(sortLinesAsc("b\na\n")).toBe("a\nb\n");
  });
  it("handles Chinese / non-Latin text without throwing", () => {
    expect(() => sortLinesAsc("中文\n日本語\n한국어")).not.toThrow();
  });
});

describe("reverseLines", () => {
  it("reverses line order exactly", () => {
    expect(reverseLines("1\n2\n3")).toBe("3\n2\n1");
  });
  it("preserves a trailing newline", () => {
    expect(reverseLines("1\n2\n")).toBe("2\n1\n");
  });
});

describe("performance", () => {
  it("sorts and dedupes 50k lines quickly", () => {
    const big = Array.from({ length: 50_000 }, (_, i) => String(i % 1000)).join("\n");
    const start = Date.now();
    const sorted = sortLinesNumeric(big);
    const deduped = dedupeLines(big);
    expect(Date.now() - start).toBeLessThan(2000);
    expect(deduped.split("\n")).toHaveLength(1000);
    expect(sorted.startsWith("0\n0\n")).toBe(true);
  });
});
