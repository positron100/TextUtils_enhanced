import { describe, it, expect } from "vitest";
import {
  encrypt,
  decrypt,
  parsePayload,
  ALGORITHMS,
  FORMATS,
  algorithmsForFormat,
  defaultAlgorithmFor,
  unquote,
} from "./index.js";
import { opensslKeyBytes } from "./openssl.js";

/**
 * Interoperability with OpenSSL-format AES, checked against ciphertext that was
 * actually produced by an external implementation rather than by us.
 *
 * Every VECTOR below was generated on https://encode-decode.com/aes256-encrypt-online/
 * (its `aes256` / `aes192` / `aes128` entries, which are server-side PHP
 * `openssl_encrypt` with no IV argument) and pasted in verbatim. If our format
 * understanding ever drifts, these fail — they cannot be satisfied by our own
 * encrypt happening to agree with our own decrypt.
 */
const VECTORS = [
  {
    name: "short plaintext",
    algorithmId: "AES-256-CBC-OpenSSL",
    secret: "password",
    plaintext: "hello",
    ciphertext: "IF7eCDt18KYYM2dofZGyDg==",
  },
  {
    name: "multi-block plaintext (proves CBC, not ECB)",
    algorithmId: "AES-256-CBC-OpenSSL",
    secret: "password",
    plaintext: "hello world this is a longer plaintext for block boundaries",
    ciphertext:
      "nVM1Aqdc7hBqFo294LNpcH/50Q8ogtYGA99gUacxb5vLTJ5gUyhQrwWrpc4kZ1XGPKtbGcmkfWisBh8b5xbTAw==",
  },
  {
    name: "a different secret gives different ciphertext",
    algorithmId: "AES-256-CBC-OpenSSL",
    secret: "password1",
    plaintext: "hello",
    ciphertext: "cXJ3mhZwwtu3NR6+BsOAXg==",
  },
  {
    name: "secret exactly at the key length",
    algorithmId: "AES-256-CBC-OpenSSL",
    secret: "01234567890123456789012345678901",
    plaintext: "hello",
    ciphertext: "0KV99uNYruGR2PcDDfDCfw==",
  },
  {
    name: "secret past the key length is truncated, not hashed",
    algorithmId: "AES-256-CBC-OpenSSL",
    secret: "0123456789012345678901234567890199999999",
    plaintext: "hello",
    ciphertext: "0KV99uNYruGR2PcDDfDCfw==",
  },
  {
    name: "unicode and emoji plaintext",
    algorithmId: "AES-256-CBC-OpenSSL",
    secret: "password",
    plaintext: "héllo wörld — 日本語 🎉",
    ciphertext: "BNQoeNCWpoN8AUDUnNYTHfC/Q2hlfobikbxRP1DcJXUoZ87+t4NjVJbJ9aoF8Ysq",
  },
  {
    name: "plaintext on an exact block boundary gets a full pad block",
    algorithmId: "AES-256-CBC-OpenSSL",
    secret: "password",
    plaintext: "0123456789abcdef",
    ciphertext: "kL7EfDCRdL077ElelyPLIhIlz0ohu6d7yxlahsqKay0=",
  },
  {
    name: "empty plaintext",
    algorithmId: "AES-256-CBC-OpenSSL",
    secret: "password",
    plaintext: "",
    ciphertext: "b3gSL5aJiLikyURuYXt07g==",
  },
  {
    // Captured separately from the rest, during the browser verification pass:
    // this exact base64 came back from the external tool for this exact
    // plaintext and secret, which is what makes the reverse direction below a
    // real byte-for-byte claim rather than a self-consistency check.
    name: "long plaintext with emoji, captured end-to-end",
    algorithmId: "AES-256-CBC-OpenSSL",
    secret: "reverse-secret-42",
    plaintext: "Reverse interop: TextUtils wrote this, encode-decode.com must read it. 🎯",
    ciphertext:
      "mvyc2Pe5E0Jxt1tkbVU6+gvPdlj73LcPGhJh7kMVpuXSvPgpE4rczvoyhCI0tOHH1eiCf+cr4FT2vzKtfeNt4NLAdssr8tDjO6wfceDWP7o=",
  },
  {
    name: "AES-128 alias",
    algorithmId: "AES-128-CBC-OpenSSL",
    secret: "password",
    plaintext: "hello",
    ciphertext: "82gUCsnebu33nihM4LWpcA==",
  },
  {
    name: "AES-192 alias",
    algorithmId: "AES-192-CBC-OpenSSL",
    secret: "password",
    plaintext: "hello",
    ciphertext: "KQtW0FdZ05keFHbrV4K1+w==",
  },
];

describe("external → TextUtils: real encode-decode.com ciphertext decrypts", () => {
  for (const v of VECTORS) {
    it(`${v.algorithmId} · ${v.name}`, async () => {
      const out = await decrypt({
        algorithmId: v.algorithmId,
        payload: v.ciphertext,
        secret: v.secret,
      });
      expect(out).toBe(v.plaintext);
    });
  }
});

describe("TextUtils → external: our ciphertext is byte-identical", () => {
  // The format is deterministic (fixed IV, no salt), so reverse interop is
  // exact rather than merely "decryptable" — our base64 equals theirs.
  // Empty plaintext is decryptable (covered above) but not encryptable here:
  // `encrypt` refuses an empty box for both formats, which is a UI guard, not
  // a format limitation.
  for (const v of VECTORS.filter((x) => x.plaintext !== "")) {
    it(`${v.algorithmId} · ${v.name}`, async () => {
      const ct = await encrypt({
        algorithmId: v.algorithmId,
        secret: v.secret,
        plaintext: v.plaintext,
      });
      expect(ct).toBe(v.ciphertext);
    });
  }
});

describe("compatible format round-trips", () => {
  const ids = ["AES-128-CBC-OpenSSL", "AES-192-CBC-OpenSSL", "AES-256-CBC-OpenSSL"];

  for (const algorithmId of ids) {
    it(`${algorithmId} round-trips long plaintext`, async () => {
      const plaintext = "Lorem ipsum dolor sit amet. ".repeat(400);
      const ct = await encrypt({ algorithmId, secret: "pw", plaintext });
      expect(await decrypt({ algorithmId, payload: ct, secret: "pw" })).toBe(plaintext);
    });

    it(`${algorithmId} produces no TUC1 envelope`, async () => {
      const ct = await encrypt({ algorithmId, secret: "pw", plaintext: "hi" });
      expect(ct.startsWith("TUC1.")).toBe(false);
      expect(ct).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    });
  }
});

describe("compatible format rejects bad input", () => {
  const algorithmId = "AES-256-CBC-OpenSSL";
  const fails = /unable to decrypt/i;

  it("wrong password", async () => {
    await expect(
      decrypt({ algorithmId, payload: "IF7eCDt18KYYM2dofZGyDg==", secret: "nope" }),
    ).rejects.toThrow(fails);
  });

  it("malformed base64", async () => {
    await expect(decrypt({ algorithmId, payload: "!!!not base64!!!", secret: "pw" })).rejects.toThrow(
      fails,
    );
  });

  it("base64 that is not a whole number of AES blocks", async () => {
    await expect(decrypt({ algorithmId, payload: "YWJj", secret: "pw" })).rejects.toThrow(fails);
  });

  it("well-formed base64 that is not ciphertext", async () => {
    await expect(
      decrypt({ algorithmId, payload: "AAAAAAAAAAAAAAAAAAAAAA==", secret: "pw" }),
    ).rejects.toThrow(fails);
  });

  it("empty input", async () => {
    await expect(decrypt({ algorithmId, payload: "   ", secret: "pw" })).rejects.toThrow();
  });

  it("a missing secret is reported before anything is attempted", async () => {
    await expect(decrypt({ algorithmId, payload: "IF7eCDt18KYYM2dofZGyDg==" })).rejects.toThrow(
      /password or key/i,
    );
  });

  it("never leaks internals in the message", async () => {
    const err = await decrypt({ algorithmId, payload: "YWJjZA==", secret: "pw" }).catch((e) => e);
    expect(err.message).not.toMatch(/padding|pkcs|utf-?8|noble|cbc|iv/i);
  });

  it("a TUC1 payload is not silently accepted as raw ciphertext", async () => {
    const tuc1 = await encrypt({
      algorithmId: "AES-256-GCM",
      keyMode: "password",
      secret: "pw",
      plaintext: "secret",
    });
    await expect(decrypt({ algorithmId, payload: tuc1, secret: "pw" })).rejects.toThrow(fails);
  });

  it("wrapped ciphertext (newlines from a copy/paste) still decrypts", async () => {
    const wrapped = "nVM1Aqdc7hBqFo294LNpcH/50Q8ogtYGA99gUacxb5vLTJ5g\nUyhQrwWrpc4kZ1XGPKtbGcmkfWisBh8b5xbTAw==";
    expect(await decrypt({ algorithmId, payload: wrapped, secret: "password" })).toBe(
      "hello world this is a longer plaintext for block boundaries",
    );
  });
});

describe("TUC1 validation is unchanged", () => {
  it("raw base64 is still refused by the TextUtils format", async () => {
    await expect(
      decrypt({ payload: "IF7eCDt18KYYM2dofZGyDg==", keyMode: "password", secret: "password" }),
    ).rejects.toThrow(/Expected a TextUtils \(TUC1\) payload/);
  });

  it("arbitrary text is still refused", async () => {
    await expect(decrypt({ payload: "just some text", secret: "pw" })).rejects.toThrow(/TUC1/);
  });

  it("the native format still round-trips through its envelope", async () => {
    const payload = await encrypt({
      algorithmId: "AES-256-GCM",
      keyMode: "password",
      secret: "correct horse battery staple",
      plaintext: "native still works 😀",
    });
    expect(parsePayload(payload).alg).toBe("AES-256-GCM");
    expect(payload.startsWith("TUC1.")).toBe(true);
    expect(
      await decrypt({ payload, keyMode: "password", secret: "correct horse battery staple" }),
    ).toBe("native still works 😀");
  });
});

describe("quoted ciphertext is unwrapped before decrypting", () => {
  const algorithmId = "AES-256-CBC-OpenSSL";
  const CT = "IF7eCDt18KYYM2dofZGyDg==";
  const fails = /unable to decrypt/i;

  it('"ciphertext" → ciphertext', () => expect(unquote(`"${CT}"`)).toBe(CT));
  it('"ciphertext (opening quote only) is left alone', () =>
    expect(unquote(`"${CT}`)).toBe(`"${CT}`));
  it('ciphertext" (closing quote only) is left alone', () =>
    expect(unquote(`${CT}"`)).toBe(`${CT}"`));
  it('"" → empty', () => expect(unquote('""')).toBe(""));
  it("a lone quote is not a pair", () => expect(unquote('"')).toBe('"'));
  it("unquoted ciphertext is unchanged", () => expect(unquote(CT)).toBe(CT));
  it("curly quotes from a chat window come off too", () =>
    expect(unquote(`“${CT}”`)).toBe(CT));
  it("single quotes come off", () => expect(unquote(`'${CT}'`)).toBe(CT));
  it("a mismatched curly pair is left alone", () =>
    expect(unquote(`“${CT}"`)).toBe(`“${CT}"`));
  it("whitespace around a quoted value is handled", () =>
    expect(unquote(`  \n "${CT}" \t `)).toBe(CT));
  it("whitespace inside the quotes is handled", () => expect(unquote(`" ${CT} "`)).toBe(CT));

  it('"abc"extra" keeps its internal quote', () => {
    // Exactly one outer pair comes off; the quote in the middle is content and
    // survives. Nothing is removed globally.
    const out = unquote('"abc"extra"');
    expect(out).toBe('abc"extra');
    expect(out).toContain('"');
  });

  it("quotes inside an otherwise unquoted string are untouched", () =>
    expect(unquote('ab"cd')).toBe('ab"cd'));

  it("only one pair comes off, not two", () => expect(unquote('""abc""')).toBe('"abc"'));

  it("empty and whitespace-only input stay empty", () => {
    expect(unquote("")).toBe("");
    expect(unquote("   ")).toBe("");
    expect(unquote(null)).toBe("");
  });

  it("decrypts real quoted external ciphertext", async () => {
    expect(await decrypt({ algorithmId, payload: `"${CT}"`, secret: "password" })).toBe("hello");
  });

  it("decrypts real quoted external ciphertext with surrounding whitespace", async () => {
    expect(await decrypt({ algorithmId, payload: `\n  "${CT}"  \n`, secret: "password" })).toBe(
      "hello",
    );
  });

  it("a half-quoted payload still fails rather than being coerced", async () => {
    await expect(
      decrypt({ algorithmId, payload: `"${CT}`, secret: "password" }),
    ).rejects.toThrow(fails);
  });

  it('"" decrypts to nothing rather than something', async () => {
    await expect(decrypt({ algorithmId, payload: '""', secret: "password" })).rejects.toThrow();
  });

  it("works for the TUC1 format too", async () => {
    const payload = await encrypt({
      algorithmId: "AES-256-GCM",
      keyMode: "password",
      secret: "pw",
      plaintext: "quoted native 😀",
    });
    expect(await decrypt({ payload: `"${payload}"`, keyMode: "password", secret: "pw" })).toBe(
      "quoted native 😀",
    );
  });

  it("a half-quoted TUC1 payload is still rejected", async () => {
    const payload = await encrypt({
      algorithmId: "AES-256-GCM",
      keyMode: "password",
      secret: "pw",
      plaintext: "hi",
    });
    await expect(
      decrypt({ payload: `"${payload}`, keyMode: "password", secret: "pw" }),
    ).rejects.toThrow(/TUC1/);
  });

  it("does not touch plaintext on the encrypt side", async () => {
    // Quotes a user types are part of the message.
    const quoted = '"keep my quotes"';
    const ct = await encrypt({ algorithmId, secret: "pw", plaintext: quoted });
    expect(await decrypt({ algorithmId, payload: ct, secret: "pw" })).toBe(quoted);
  });
});

describe("the registry stays consistent", () => {
  const ids = FORMATS.map((f) => f.id);

  it("every algorithm belongs to a real format", () => {
    for (const a of ALGORITHMS) expect(ids).toContain(a.format);
  });

  it("no algorithm is missing from its format's list", () => {
    // Guards the regression where an entry written as an object literal had no
    // `format` and silently disappeared from the picker.
    const listed = ids.flatMap((id) => algorithmsForFormat(id));
    expect(listed).toHaveLength(ALGORITHMS.length);
  });

  it("both formats offer AES-128, AES-192 and AES-256", () => {
    for (const id of ids) {
      const labels = algorithmsForFormat(id).map((a) => a.label).join(" ");
      for (const bits of [128, 192, 256]) expect(labels).toContain(`AES-${bits}`);
    }
  });

  it("each format has a usable default", () => {
    for (const id of ids) {
      const def = ALGORITHMS.find((a) => a.id === defaultAlgorithmFor(id));
      expect(def.format).toBe(id);
    }
  });

  it("only the compatible format uses the openssl engine", () => {
    for (const a of ALGORITHMS) {
      expect(a.engine === "openssl").toBe(a.format === "openssl-raw");
    }
  });
});

describe("key handling", () => {
  it("zero-pads a short secret", () => {
    const key = opensslKeyBytes("ab", 32);
    expect(key).toHaveLength(32);
    expect([...key.slice(0, 2)]).toEqual([97, 98]);
    expect([...key.slice(2)].every((b) => b === 0)).toBe(true);
  });

  it("truncates a long secret", () => {
    const key = opensslKeyBytes("x".repeat(50), 16);
    expect(key).toHaveLength(16);
    expect([...key].every((b) => b === 120)).toBe(true);
  });

  it("uses the secret's UTF-8 bytes, not its characters", () => {
    // "é" is two bytes, so it occupies two key bytes.
    expect([...opensslKeyBytes("é", 4)]).toEqual([0xc3, 0xa9, 0, 0]);
  });
});
