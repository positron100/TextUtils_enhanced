import { describe, it, expect } from "vitest";
import {
  removeExtraSpaces,
  trimLines,
  trimDocument,
  collapseWhitespace,
  removeBlankLines,
  normalizeNewlines,
  spacesToTabs,
  tabsToSpaces,
} from "./whitespace.js";

describe("removeExtraSpaces", () => {
  it("collapses spaces/tabs per line, keeps line breaks", () => {
    expect(removeExtraSpaces("a   b\t\tc\n  d   e  ")).toBe("a b c\nd e");
  });
  it("no-ops on empty", () => expect(removeExtraSpaces("")).toBe(""));
});

describe("trimLines", () => {
  it("trims each line's ends but keeps the lines and inner spacing", () => {
    expect(trimLines("  a  b  \n\t c \t")).toBe("a  b\nc");
  });
});

describe("trimDocument", () => {
  it("trims leading/trailing whitespace incl. blank lines", () => {
    expect(trimDocument("\n\n  hi there \n\n")).toBe("hi there");
  });
});

describe("collapseWhitespace", () => {
  it("collapses spaces and 3+ newlines but keeps paragraph breaks", () => {
    expect(collapseWhitespace("a   b\n\n\n\nc")).toBe("a b\n\nc");
  });
});

describe("removeBlankLines", () => {
  it("drops empty and whitespace-only lines", () => {
    expect(removeBlankLines("a\n\n  \nb\n")).toBe("a\nb");
  });
});

describe("normalizeNewlines", () => {
  it("converts CRLF and CR to LF", () => {
    expect(normalizeNewlines("a\r\nb\rc\n")).toBe("a\nb\nc\n");
  });
});

describe("spacesToTabs / tabsToSpaces", () => {
  it("converts leading 4-space groups to tabs", () => {
    expect(spacesToTabs("    a\n        b\n     c")).toBe("\ta\n\t\tb\n\t c");
  });
  it("does not touch non-leading spaces", () => {
    expect(spacesToTabs("a    b")).toBe("a    b");
  });
  it("expands tabs to spaces everywhere", () => {
    expect(tabsToSpaces("\ta\tb", 2)).toBe("  a  b");
  });
  it("round-trips leading indentation", () => {
    expect(spacesToTabs(tabsToSpaces("\t\tx"))).toBe("\t\tx");
  });
});
