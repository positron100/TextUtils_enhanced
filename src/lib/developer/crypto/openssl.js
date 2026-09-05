// OpenSSL-compatible AES — the format produced by PHP's
// `openssl_encrypt($data, 'aes256', $secret)` when no IV is supplied, which is
// what encode-decode.com's `aes128` / `aes192` / `aes256` entries use.
//
// Determined empirically against that site (see openssl-compat.test.js for the
// captured vectors), not assumed:
//
//   mode        `aes256` is OpenSSL's alias for AES-256-CBC (likewise
//               aes128 → AES-128-CBC, aes192 → AES-192-CBC). Proved by a
//               multi-block vector: single-block output is identical for CBC
//               and ECB under a zero IV, multi-block output is not, and the
//               site's matches CBC.
//   key         NO key derivation at all. The secret's UTF-8 bytes ARE the
//               key: zero-padded up to the key length, truncated beyond it.
//               (A 32-byte and a 40-byte secret sharing a prefix produce
//               identical ciphertext — that is how the truncation was shown.)
//   iv          16 zero bytes. PHP substitutes an empty IV when the argument
//               is omitted, which makes the whole scheme deterministic — the
//               same plaintext and secret always give the same ciphertext.
//   padding     PKCS#7.
//   encoding    base64 of the raw ciphertext. No salt, no header, no `Salted__`
//               prefix, no MAC.
//   plaintext   UTF-8.
//
// This format is WEAK and is implemented only so TextUtils can read ciphertext
// other tools produce. A passphrase used directly as key bytes has none of a
// KDF's work factor, a fixed IV leaks equality between messages, and CBC alone
// is unauthenticated so tampering cannot be detected. TextUtils' own TUC1
// format (PBKDF2 + random IV + an authenticated cipher) is the one to use for
// anything real; the registry marks these entries accordingly.

import { cbc } from "@noble/ciphers/aes";
import { enc, bytesToB64, b64ToBytes } from "./encode.js";

const ZERO_IV = new Uint8Array(16);

// Wrong-key CBC decryption that happens to survive PKCS#7 unpadding (roughly
// 1 in 256) yields random bytes. Decoding those leniently would hand back
// mojibake as if it were the message, so this decoder refuses invalid UTF-8.
const strictDec = new TextDecoder("utf-8", { fatal: true });

/**
 * The secret's bytes used directly as an AES key: zero-padded to `keyBytes`,
 * truncated past it. This is not a KDF — it is what OpenSSL does with a short
 * key, reproduced so external ciphertext can be read.
 */
export function opensslKeyBytes(secret, keyBytes) {
  const key = new Uint8Array(keyBytes); // zero-filled
  const raw = enc.encode(String(secret ?? ""));
  key.set(raw.subarray(0, keyBytes));
  return key;
}

/** @returns {string} base64 ciphertext, byte-identical to the external tool's. */
export function opensslEncrypt({ secret, plaintext, keyBytes }) {
  const key = opensslKeyBytes(secret, keyBytes);
  return bytesToB64(cbc(key, ZERO_IV).encrypt(enc.encode(String(plaintext ?? ""))));
}

/** @returns {string} plaintext. Throws if the ciphertext or the secret is wrong. */
export function opensslDecrypt({ secret, ciphertext, keyBytes }) {
  const text = String(ciphertext ?? "").trim();
  if (!text) throw new Error("Nothing to decrypt.");

  let bytes;
  try {
    // Tolerate the line breaks a wrapped copy/paste can introduce; base64
    // itself carries no whitespace, so stripping it cannot change the value.
    bytes = b64ToBytes(text.replace(/\s+/g, ""));
  } catch {
    throw new Error("Unable to decrypt AES ciphertext. Check the password and encryption format.");
  }
  if (bytes.length === 0 || bytes.length % 16 !== 0) {
    throw new Error("Unable to decrypt AES ciphertext. Check the password and encryption format.");
  }

  try {
    return strictDec.decode(cbc(opensslKeyBytes(secret, keyBytes), ZERO_IV).decrypt(bytes));
  } catch {
    // Bad padding, bad length and non-UTF-8 output are all the same thing to
    // the person using it: it did not decrypt. Nothing internal is exposed.
    throw new Error("Unable to decrypt AES ciphertext. Check the password and encryption format.");
  }
}
