import { describe, it, expect } from "vitest";
import { computeStats, formatDuration } from "./statistics.js";

describe("computeStats", () => {
  it("is all zeros for empty text", () => {
    expect(computeStats("")).toMatchObject({
      words: 0,
      chars: 0,
      charsNoSpaces: 0,
      sentences: 0,
      lines: 0,
      paragraphs: 0,
    });
  });

  it("counts words, chars and chars-without-spaces", () => {
    const s = computeStats("hello  world");
    expect(s.words).toBe(2);
    expect(s.chars).toBe(12);
    expect(s.charsNoSpaces).toBe(10);
  });

  it("counts an astral character as one", () => {
    expect(computeStats("a😀b").chars).toBe(3);
  });

  it("counts sentences, lines and paragraphs", () => {
    const text = "One two. Three four!\n\nA new paragraph here?";
    const s = computeStats(text);
    expect(s.sentences).toBe(3);
    expect(s.lines).toBe(3);
    expect(s.paragraphs).toBe(2);
  });

  it("treats terminator-less prose as one sentence", () => {
    expect(computeStats("just some words").sentences).toBe(1);
  });

  it("scales reading/speaking time with word count", () => {
    const many = ("word ".repeat(400)).trim();
    const s = computeStats(many);
    expect(s.words).toBe(400);
    expect(Math.round(s.readingSeconds)).toBe(120); // 400 / 200 wpm = 2 min
    expect(s.speakingSeconds).toBeGreaterThan(s.readingSeconds);
  });

  it("handles large input without throwing", () => {
    expect(() => computeStats("lorem ipsum ".repeat(50_000)).words).not.toThrow();
  });
});

describe("formatDuration", () => {
  it("formats seconds and minutes", () => {
    expect(formatDuration(0)).toBe("0 sec");
    expect(formatDuration(45)).toBe("45 sec");
    expect(formatDuration(60)).toBe("1 min");
    expect(formatDuration(200)).toBe("3 min 20 sec");
  });
});
