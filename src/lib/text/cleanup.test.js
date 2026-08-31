import { describe, it, expect } from "vitest";
import {
  removePunctuation,
  removeNumbers,
  removeSpecialCharacters,
  keepLettersOnly,
  keepNumbersOnly,
  removeEmojis,
} from "./cleanup.js";

const SAMPLE = "café résumé 😀 中文 123 hello-world!";

describe("removePunctuation", () => {
  it("strips punctuation, keeps letters/numbers/spaces", () => {
    expect(removePunctuation("hello, world! (test) 42.")).toBe("hello world test 42");
  });
  it("keeps accented letters and CJK", () => {
    expect(removePunctuation("café—中文…")).toBe("café中文");
  });
  it("no-ops on already-clean text", () => {
    expect(removePunctuation("clean text 42")).toBe("clean text 42");
  });
});

describe("removeNumbers", () => {
  it("removes ASCII digits, fractions and non-Latin digits", () => {
    expect(removeNumbers("a1b2 ½ ٣c")).toBe("ab  c");
  });
});

describe("removeSpecialCharacters", () => {
  it("removes symbols and emoji, keeps letters/numbers/punctuation/space", () => {
    expect(removeSpecialCharacters("a+b=c $5 ~x! 中文")).toBe("abc 5 x! 中文");
    expect(removeSpecialCharacters(SAMPLE)).toBe("café résumé  中文 123 hello-world!");
  });
});

describe("keepLettersOnly", () => {
  it("keeps letters (with marks) and whitespace only", () => {
    expect(keepLettersOnly(SAMPLE)).toBe("café résumé  中文  helloworld");
  });
  it("keeps combining accents intact", () => {
    expect(keepLettersOnly("café 123")).toBe("café ");
  });
});

describe("keepNumbersOnly", () => {
  it("keeps digits and whitespace only", () => {
    expect(keepNumbersOnly("phone 555-123 x9")).toBe(" 555123 9");
  });
});

describe("removeEmojis", () => {
  it("removes plain, modified, ZWJ and flag emoji", () => {
    expect(removeEmojis("hi 😀 ok 👍🏽 fam 👨‍👩‍👧 flag 🇬🇧 end")).toBe(
      "hi  ok  fam  flag  end",
    );
  });
  it("keeps letters, digits and punctuation", () => {
    expect(removeEmojis("text 中文 42 ! no emoji")).toBe("text 中文 42 ! no emoji");
  });
  it("no-ops when there are no emoji", () => {
    expect(removeEmojis("nothing here")).toBe("nothing here");
  });
});

describe("empty input", () => {
  it("every function returns empty for empty", () => {
    for (const fn of [
      removePunctuation,
      removeNumbers,
      removeSpecialCharacters,
      keepLettersOnly,
      keepNumbersOnly,
      removeEmojis,
    ]) {
      expect(fn("")).toBe("");
    }
  });
});
