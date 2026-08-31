import { describe, it, expect } from "vitest";
import {
  activeTypingMs,
  estimateWpm,
  scoreTyping,
  charStates,
  randomPassage,
  TYPING_PASSAGES,
} from "./typing.js";

describe("activeTypingMs", () => {
  it("sums gaps but skips idle ones", () => {
    // gaps: 100, 200, 5000 (idle), 150  → 450
    expect(activeTypingMs([0, 100, 300, 5300, 5450])).toBe(450);
  });
  it("is zero for a single or empty sample", () => {
    expect(activeTypingMs([])).toBe(0);
    expect(activeTypingMs([42])).toBe(0);
  });
});

describe("estimateWpm", () => {
  it("uses 5 chars per word over active minutes", () => {
    // 250 chars in 60s → 50 words / 1 min = 50 wpm
    expect(estimateWpm(250, 60000)).toBe(50);
  });
  it("guards against zero time", () => {
    expect(estimateWpm(100, 0)).toBe(0);
  });
});

describe("scoreTyping", () => {
  it("scores a perfect attempt", () => {
    const r = scoreTyping("hello world", "hello world", 60000);
    expect(r.errors).toBe(0);
    expect(r.accuracy).toBe(1);
    expect(r.complete).toBe(true);
    expect(r.wpm).toBe(Math.round(11 / 5)); // 2
  });
  it("counts per-position errors and partial progress", () => {
    const r = scoreTyping("abcdef", "abXdef", 30000);
    expect(r.errors).toBe(1);
    expect(r.correct).toBe(5);
    expect(r.accuracy).toBeCloseTo(5 / 6);
  });
  it("does not count unentered characters as errors", () => {
    const r = scoreTyping("abcdef", "abc", 1000);
    expect(r.errors).toBe(0);
    expect(r.progress).toBeCloseTo(0.5);
    expect(r.complete).toBe(false);
  });
});

describe("charStates", () => {
  it("classifies each expected character", () => {
    expect(charStates("abc", "aX")).toEqual(["correct", "wrong", "pending"]);
  });
});

describe("randomPassage", () => {
  it("returns a known passage and avoids the excluded one", () => {
    const p = randomPassage(TYPING_PASSAGES[0]);
    expect(TYPING_PASSAGES).toContain(p);
    expect(p).not.toBe(TYPING_PASSAGES[0]);
  });
});
