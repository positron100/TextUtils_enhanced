import { describe, it, expect } from "vitest";
import { validateJson, formatJson, minifyJson } from "./json.js";

describe("validateJson", () => {
  it("accepts objects, arrays and primitives", () => {
    expect(validateJson('{"a":1}').ok).toBe(true);
    expect(validateJson("[1,2,3]").ok).toBe(true);
    expect(validateJson('"str"').ok).toBe(true);
    expect(validateJson("true").ok).toBe(true);
    expect(validateJson("null").value).toBe(null);
  });
  it("reports an error with a line/column when the engine gives a position", () => {
    const r = validateJson('{\n  "a": 1,\n  "b": 2,\n}');
    expect(r.ok).toBe(false);
    expect(r.error.message).toBeTruthy();
    expect(r.error.line).toBe(4);
    expect(r.error.column).toBeGreaterThanOrEqual(1);
  });
  it("still gives a clean message when no position is available", () => {
    const r = validateJson('{"x": undefined}');
    expect(r.ok).toBe(false);
    expect(r.error.message).toBe("Unexpected token 'u'");
  });
  it("handles empty input as invalid", () => {
    const r = validateJson("");
    expect(r.ok).toBe(false);
    expect(r.error.message).toBeTruthy();
  });
});

describe("formatJson", () => {
  it("pretty-prints with 2-space indent", () => {
    expect(formatJson('{"name":"Mukul","skills":["Java","React"]}').value).toBe(
      '{\n  "name": "Mukul",\n  "skills": [\n    "Java",\n    "React"\n  ]\n}',
    );
  });
  it("respects a custom indent", () => {
    expect(formatJson('{"a":1}', 4).value).toBe('{\n    "a": 1\n}');
  });
  it("preserves Unicode", () => {
    expect(formatJson('{"t":"café 😀 中文"}').value).toBe('{\n  "t": "café 😀 中文"\n}');
  });
  it("returns the error for invalid input", () => {
    expect(formatJson("{bad}").ok).toBe(false);
  });
});

describe("minifyJson", () => {
  it("removes all insignificant whitespace", () => {
    expect(minifyJson('{\n  "a": [1, 2],\n  "b": true\n}').value).toBe(
      '{"a":[1,2],"b":true}',
    );
  });
  it("round-trips with formatJson", () => {
    const src = '{"x":[{"y":1}],"z":"a b"}';
    expect(minifyJson(formatJson(src).value).value).toBe(src);
  });
});
