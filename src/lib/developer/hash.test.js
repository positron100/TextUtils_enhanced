import { describe, it, expect } from "vitest";
import { hashText, HASH_ALGORITHMS } from "./hash.js";

describe("hashText", () => {
  it("matches known SHA-256 vectors", async () => {
    expect((await hashText("")).value).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect((await hashText("abc")).value).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("matches a known SHA-384 vector", async () => {
    expect((await hashText("abc", "SHA-384")).value).toBe(
      "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed" +
        "8086072ba1e7cc2358baeca134c825a7",
    );
  });

  it("matches a known SHA-512 vector", async () => {
    expect((await hashText("abc", "SHA-512")).value).toBe(
      "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a" +
        "2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
    );
  });

  it("hashes Unicode via UTF-8 bytes", async () => {
    const r = await hashText("café");
    expect(r.ok).toBe(true);
    expect(r.value).toHaveLength(64);
  });

  it("rejects an unknown algorithm", async () => {
    expect((await hashText("x", "MD5")).ok).toBe(false);
  });

  it("exposes exactly the three SHA algorithms", () => {
    expect(HASH_ALGORITHMS).toEqual(["SHA-256", "SHA-384", "SHA-512"]);
  });
});
