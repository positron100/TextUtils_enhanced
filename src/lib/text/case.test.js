import { describe, it, expect } from "vitest";
import {
  upperCase,
  lowerCase,
  titleCase,
  sentenceCase,
  camelCase,
  pascalCase,
  snakeCase,
  kebabCase,
  constantCase,
} from "./case.js";

describe("upper / lower", () => {
  it("transforms and no-ops on empty", () => {
    expect(upperCase("aÉ")).toBe("AÉ");
    expect(lowerCase("AÉ")).toBe("aé");
    expect(upperCase("")).toBe("");
  });
});

describe("titleCase", () => {
  it("capitalises each word, lowercases the rest", () => {
    expect(titleCase("the QUICK brown fox")).toBe("The Quick Brown Fox");
  });
  it("handles hyphen and quote boundaries", () => {
    expect(titleCase("mother-in-law's day")).toBe("Mother-In-Law's Day");
  });
  it("is multiline", () => {
    expect(titleCase("line one\nline two")).toBe("Line One\nLine Two");
  });
  it("no-ops on empty", () => {
    expect(titleCase("")).toBe("");
  });
});

describe("sentenceCase", () => {
  it("capitalises the first letter of each sentence", () => {
    expect(sentenceCase("hello world. how are you? fine!")).toBe(
      "Hello world. How are you? Fine!",
    );
  });
  it("handles new lines as sentence starts", () => {
    expect(sentenceCase("first line\nsecond line")).toBe("First line\nSecond line");
  });
});

describe("programmer cases", () => {
  const src = "hello world-example_test";
  it("camelCase", () => expect(camelCase(src)).toBe("helloWorldExampleTest"));
  it("PascalCase", () => expect(pascalCase(src)).toBe("HelloWorldExampleTest"));
  it("snake_case", () => expect(snakeCase(src)).toBe("hello_world_example_test"));
  it("kebab-case", () => expect(kebabCase(src)).toBe("hello-world-example-test"));
  it("CONSTANT_CASE", () =>
    expect(constantCase(src)).toBe("HELLO_WORLD_EXAMPLE_TEST"));

  it("splits camelCase and ACRONYM humps", () => {
    expect(snakeCase("getHTTPResponseCode")).toBe("get_http_response_code");
    expect(kebabCase("XMLHttpRequest")).toBe("xml-http-request");
  });
  it("handles multiline and punctuation noise", () => {
    expect(camelCase("  first line\n  second line!! ")).toBe("firstLineSecondLine");
  });
  it("no-ops on empty", () => {
    expect(camelCase("")).toBe("");
    expect(snakeCase("   ")).toBe("");
  });
});
