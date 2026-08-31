import { describe, it, expect } from "vitest";
import { compileRegex, runRegex } from "./regex.js";

const run = (pattern, opts, text) => {
  const c = compileRegex(pattern, opts);
  expect(c.ok).toBe(true);
  return runRegex(c.regex, text);
};

describe("compileRegex", () => {
  it("builds flags from options", () => {
    expect(compileRegex("a", { global: true, ignoreCase: true, multiline: true, dotAll: true }).regex.flags)
      .toBe("gims");
  });
  it("reports invalid patterns without throwing", () => {
    const r = compileRegex("(");
    expect(r.ok).toBe(false);
    expect(r.error.message).toBeTruthy();
  });
});

describe("runRegex", () => {
  it("finds all global matches", () => {
    expect(run("\\d+", { global: true }, "a1 b22 c333").count).toBe(3);
  });
  it("returns a single match when not global", () => {
    const r = run("\\d+", { global: false }, "a1 b22");
    expect(r.count).toBe(1);
    expect(r.matches[0]).toMatchObject({ text: "1", index: 1 });
  });
  it("honours case-insensitive", () => {
    expect(run("cat", { global: true, ignoreCase: true }, "Cat cat CAT").count).toBe(3);
  });
  it("honours multiline anchors", () => {
    expect(run("^x", { global: true, multiline: true }, "x\ny\nx").count).toBe(2);
  });
  it("honours dotAll", () => {
    expect(run("a.b", { global: false, dotAll: true }, "a\nb").count).toBe(1);
    expect(run("a.b", { global: false, dotAll: false }, "a\nb").count).toBe(0);
  });
  it("captures numbered and named groups", () => {
    const r = run("(\\w+)@(?<domain>\\w+)", { global: false }, "me@example");
    expect(r.matches[0].groups).toEqual(["me", "example"]);
    expect(r.matches[0].named).toEqual({ domain: "example" });
  });
  it("returns zero matches cleanly", () => {
    expect(run("zzz", { global: true }, "abc").count).toBe(0);
  });
  it("does not hang on a zero-width global match", () => {
    const r = run("(?:)", { global: true }, "abc");
    expect(r.count).toBe(4);
  });
  it("truncates pathological match counts", () => {
    const r = run("a?", { global: true }, "a".repeat(5000));
    expect(r.truncated).toBe(true);
    expect(r.count).toBe(1000);
  });
  it("matches Unicode text", () => {
    expect(run("\\w+", { global: true, }, "café 中文").count).toBeGreaterThan(0);
  });
});
