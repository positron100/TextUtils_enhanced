import { describe, it, expect } from "vitest";
import {
  encrypt,
  decrypt,
  generateRsaKeyPair,
  parsePayload,
  parseRawKey,
  randomKeyHex,
  ALGORITHMS,
} from "./index.js";

// The native TUC1 format only — the OpenSSL-compatible entries have their own
// suite (openssl-compat.test.js), since they carry no envelope and no KDF.
const SYMMETRIC = ALGORITHMS.filter((a) => a.kind === "symmetric" && a.format === "tuc1");
const AUTHENTICATED = ["AES-256-GCM", "AES-256-GCM-SIV", "ChaCha20-Poly1305", "XChaCha20-Poly1305"];

describe("every symmetric algorithm round-trips", () => {
  for (const algo of SYMMETRIC) {
    it(`${algo.id} · password`, async () => {
      const payload = await encrypt({
        algorithmId: algo.id,
        keyMode: "password",
        secret: "correct horse battery staple",
        plaintext: "café 😀 secret message that is long enough to span blocks",
      });
      expect(parsePayload(payload).alg).toBe(algo.id);
      const out = await decrypt({ payload, keyMode: "password", secret: "correct horse battery staple" });
      expect(out).toBe("café 😀 secret message that is long enough to span blocks");
    });

    it(`${algo.id} · raw key`, async () => {
      const key = randomKeyHex(algo.noble.keyBytes * 8);
      const payload = await encrypt({ algorithmId: algo.id, keyMode: "raw", secret: key, plaintext: "raw key msg" });
      expect(parsePayload(payload).kdf).toBe("raw");
      expect(await decrypt({ payload, keyMode: "raw", secret: key })).toBe("raw key msg");
    });
  }
});

describe("failure modes", () => {
  it("wrong password fails", async () => {
    const payload = await encrypt({ algorithmId: "AES-256-GCM", keyMode: "password", secret: "right", plaintext: "hi" });
    await expect(decrypt({ payload, keyMode: "password", secret: "wrong" })).rejects.toThrow(/failed/i);
  });

  it("authenticated ciphers reject a tampered payload", async () => {
    for (const id of AUTHENTICATED) {
      const payload = await encrypt({ algorithmId: id, keyMode: "password", secret: "pw", plaintext: "authentic" });
      const bad = payload.slice(0, -6) + (payload.slice(-6, -5) === "A" ? "B" : "A") + payload.slice(-4);
      await expect(decrypt({ payload: bad, keyMode: "password", secret: "pw" })).rejects.toThrow();
    }
  });
});

describe("parseRawKey", () => {
  it("accepts 64-char hex", () => expect(parseRawKey("a".repeat(64))).toHaveLength(32));
  it("rejects the wrong length", () => expect(() => parseRawKey("abcd")).toThrow(/bits/));
});

describe("RSA-OAEP", () => {
  it("public encrypts, private decrypts", async () => {
    const { publicKey, privateKey } = await generateRsaKeyPair({ modulusLength: 2048 });
    const payload = await encrypt({ algorithmId: "RSA-OAEP", rsaPublicKey: publicKey, plaintext: "asymmetric hello" });
    expect(parsePayload(payload).alg).toBe("RSA-OAEP");
    expect(await decrypt({ payload, rsaPrivateKey: privateKey })).toBe("asymmetric hello");
  });
});

describe("parsePayload", () => {
  it("rejects a non-TextUtils string", () => expect(() => parsePayload("just some text")).toThrow(/TUC1/));
});
