import { describe, it, expect } from "vitest";
import { straightenQuotes, normalizeUnicode } from "./normalization.js";

// Non-ASCII is built from \u escapes so the source is unambiguous.
const CURLY = {
  ldquo: "\u201C",
  rdquo: "\u201D",
  lsquo: "\u2018",
  rsquo: "\u2019",
  laquo: "\u00AB",
  raquo: "\u00BB",
  bdquo: "\u201E",
  prime: "\u2032",
  dprime: "\u2033",
  mdash: "\u2014",
  hellip: "\u2026",
};

describe("straightenQuotes", () => {
  it("converts curly double and single quotes", () => {
    const s = `${CURLY.ldquo}hello${CURLY.rdquo} and ${CURLY.lsquo}hi${CURLY.rsquo}`;
    expect(straightenQuotes(s)).toBe("\"hello\" and 'hi'");
  });
  it("converts guillemets, low-9 quotes and primes", () => {
    const s = `${CURLY.laquo}x${CURLY.raquo} ${CURLY.bdquo}y${CURLY.ldquo} 5${CURLY.prime} 6${CURLY.dprime}`;
    expect(straightenQuotes(s)).toBe("\"x\" \"y\" 5' 6\"");
  });
  it("converts a curly apostrophe", () => {
    expect(straightenQuotes(`it${CURLY.rsquo}s fine`)).toBe("it's fine");
  });
  it("leaves unrelated punctuation and straight quotes alone", () => {
    const s = `a${CURLY.mdash}b ${CURLY.hellip} c! "already" 'straight'`;
    expect(straightenQuotes(s)).toBe(s);
  });
  it("no-ops on empty input", () => {
    expect(straightenQuotes("")).toBe("");
  });
});

describe("normalizeUnicode", () => {
  it("composes a base letter + combining mark to NFC", () => {
    const decomposed = "e\u0301"; // e + combining acute accent
    expect(decomposed).toHaveLength(2);
    const composed = normalizeUnicode(decomposed);
    expect(composed).toHaveLength(1);
    expect(composed).toBe("\u00E9"); // precomposed e-acute
  });
  it("is idempotent on already-normalized text", () => {
    const s = normalizeUnicode("Bergstra\u00DFe \u4E2D\u6587 e\u0301");
    expect(normalizeUnicode(s)).toBe(s);
  });
  it("no-ops on empty input", () => {
    expect(normalizeUnicode("")).toBe("");
  });
});
