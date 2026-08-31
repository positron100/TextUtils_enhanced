import { describe, it, expect } from "vitest";
import { encodeBase64, decodeBase64 } from "./base64.js";

describe("encodeBase64", () => {
  it("encodes ASCII", () => {
    expect(encodeBase64("hello")).toBe("aGVsbG8=");
  });
  it("encodes an empty string", () => {
    expect(encodeBase64("")).toBe("");
  });
  it("encodes Unicode as UTF-8 (not Latin-1)", () => {
    expect(encodeBase64("café")).toBe("Y2Fmw6k=");
    expect(encodeBase64("中文")).toBe("5Lit5paH");
  });
});

describe("decodeBase64", () => {
  it("decodes ASCII", () => {
    expect(decodeBase64("aGVsbG8=")).toEqual({ ok: true, value: "hello" });
  });
  it("decodes an empty string", () => {
    expect(decodeBase64("")).toEqual({ ok: true, value: "" });
  });
  it("tolerates whitespace, missing padding and URL-safe alphabet", () => {
    expect(decodeBase64("aGVs bG8").value).toBe("hello");
    expect(decodeBase64("5Lit5paH").value).toBe("中文");
  });
  it("rejects non-Base64 characters", () => {
    const r = decodeBase64("not base64!!!");
    expect(r.ok).toBe(false);
    expect(r.error.message).toMatch(/Base64/);
  });
  it("rejects bytes that are not valid UTF-8", () => {
    expect(decodeBase64("/w==").ok).toBe(false); // 0xFF alone
  });
});

describe("round trip", () => {
  for (const s of ["hello", "café", "😀", "中文", "", "a\nb\tc", "🇬🇧 flag"]) {
    it(`${JSON.stringify(s)} survives encode → decode`, () => {
      expect(decodeBase64(encodeBase64(s))).toEqual({ ok: true, value: s });
    });
  }
});
