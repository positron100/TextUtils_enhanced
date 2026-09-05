import { describe, it, expect } from "vitest";
import { buildExportDocument, parseImported } from "./textFile.js";

describe("parseImported", () => {
  it("takes a .txt file verbatim, including JSON-looking text", () => {
    expect(parseImported("notes.txt", '{"not":"parsed"}')).toEqual({
      text: '{"not":"parsed"}',
    });
  });

  it("round-trips a TextUtils export", () => {
    const doc = buildExportDocument("hello\nworld", { words: 2 });
    const json = JSON.stringify(doc);
    expect(parseImported("textutils-2026.json", json)).toEqual({ text: "hello\nworld" });
  });

  it("reports malformed JSON instead of throwing", () => {
    expect(parseImported("broken.json", "{ nope").error).toMatch(/valid JSON/i);
  });

  it("refuses JSON without a string text field", () => {
    expect(parseImported("other.json", '{"body":"hi"}').error).toMatch(/text/i);
    expect(parseImported("other.json", '{"text":42}').error).toMatch(/text/i);
    expect(parseImported("other.json", "null").error).toMatch(/text/i);
  });

  it("keeps an empty exported document as empty text, not an error", () => {
    expect(parseImported("e.json", JSON.stringify(buildExportDocument("")))).toEqual({ text: "" });
  });
});
