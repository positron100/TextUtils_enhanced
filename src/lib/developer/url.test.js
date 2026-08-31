import { describe, it, expect } from "vitest";
import { urlEncode, urlDecode, componentEncode, componentDecode } from "./url.js";

describe("urlEncode / urlDecode", () => {
  it("keeps URL structure, encodes spaces and Unicode", () => {
    expect(urlEncode("https://x.com/a b/café?q=1")).toBe(
      "https://x.com/a%20b/caf%C3%A9?q=1",
    );
  });
  it("round-trips", () => {
    const u = "https://x.com/path with spaces/中文?a=1&b=2";
    expect(urlDecode(urlEncode(u))).toEqual({ ok: true, value: u });
  });
  it("reports malformed escapes instead of swallowing them", () => {
    const r = urlDecode("%E0%A4");
    expect(r.ok).toBe(false);
    expect(r.error.message).toBeTruthy();
  });
});

describe("componentEncode / componentDecode", () => {
  it("encodes reserved characters that urlEncode leaves alone", () => {
    expect(componentEncode("a b&c=d/e?f#g")).toBe("a%20b%26c%3Dd%2Fe%3Ff%23g");
  });
  it("round-trips a query value with Unicode", () => {
    const v = "café & résumé / 中文";
    expect(componentDecode(componentEncode(v))).toEqual({ ok: true, value: v });
  });
  it("reports a lone percent sign", () => {
    expect(componentDecode("100%").ok).toBe(false);
  });
});
