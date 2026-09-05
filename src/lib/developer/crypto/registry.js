// The algorithm catalogue. The UI is driven entirely by this data — it never
// needs to know how any algorithm works.
//
// Every entry here is ACTUALLY implemented and round-trip tested (see
// crypto.test.js). Nothing appears just because a name can go in a list.
//
// `fields` declares which parameter controls the selector shows:
//   "secret"  — password / raw-key input (symmetric)
//   "rsaKeys" — public / private key pair
//   "rsaHash" — RSA-OAEP hash choice
//
// AES + ChaCha go through the audited @noble/ciphers; RSA-OAEP uses Web Crypto.
// We do NOT implement primitives ourselves.
//
// Not included — and why:
//   AES-CCM/OCB/XTS, AES-*-CBC-HMAC-*  — no audited browser build
//   ARIA, Camellia, Blowfish, 3DES/DES, RC2/RC4/RC5 — no audited maintained
//     browser build, and DES / RC-family are not honest to present as usable
//     encryption today.

/**
 * Ciphertext formats. An algorithm belongs to exactly one, and the UI asks
 * which one the user means rather than sniffing the input — the format decides
 * how a key is derived and how the bytes are laid out, so guessing it would be
 * guessing the cryptography.
 *
 *   tuc1         TextUtils' own: PBKDF2-stretched password, random IV/salt,
 *                self-describing `TUC1.<base64url(JSON)>` envelope.
 *   openssl-raw  Bare base64 that other tools produce and read. See openssl.js
 *                for the format and for why it is weak.
 */
export const FORMATS = [
  {
    id: "tuc1",
    label: "TextUtils (TUC1)",
    note: "PBKDF2-stretched password, random IV, self-describing payload. Use this unless you need to exchange ciphertext with another tool.",
  },
  {
    id: "openssl-raw",
    label: "Compatible / Raw AES",
    note: "Bare base64, as produced by OpenSSL / PHP openssl_encrypt and sites built on it. The secret is used directly as the key and the IV is fixed, so it is far weaker than the TextUtils format — for interoperability only.",
  },
];

const aes = (bits, mode, extra) => ({
  id: `AES-${bits}-${mode}`,
  label: `AES-${bits}-${mode}`,
  kind: "symmetric",
  engine: "noble",
  noble: { fn: mode.toLowerCase().replace("-", ""), keyBytes: bits / 8 },
  fields: ["secret"],
  format: "tuc1",
  ...extra,
});

/**
 * An OpenSSL-compatible AES entry. `aes256` / `aes192` / `aes128` are OpenSSL's
 * own aliases for the CBC modes — the names other tools show — so the label
 * uses them, with the real mode spelled out underneath.
 */
const compat = (bits) => ({
  id: `AES-${bits}-CBC-OpenSSL`,
  label: `AES-${bits} · OpenSSL compatible`,
  alias: `aes${bits}`,
  kind: "symmetric",
  engine: "openssl",
  compat: { mode: "CBC", keyBytes: bits / 8 },
  ivBytes: 0, // fixed all-zero IV, never stored
  fields: ["secret"],
  format: "openssl-raw",
  group: "AES · OpenSSL-compatible",
  note: `Reads and writes bare base64 from tools using OpenSSL "aes${bits}" (AES-${bits}-CBC, zero IV, secret used directly as the key). Interoperable but weak — no key stretching and no tamper detection.`,
});

const CATALOGUE = [
  // --- AES · authenticated ------------------------------------------
  aes(256, "GCM", {
    group: "AES · authenticated",
    ivBytes: 12,
    recommended: true,
    note: "Authenticated — also detects tampering. The safe default.",
  }),
  aes(192, "GCM", { group: "AES · authenticated", ivBytes: 12 }),
  aes(128, "GCM", { group: "AES · authenticated", ivBytes: 12 }),
  {
    id: "AES-256-GCM-SIV",
    label: "AES-256-GCM-SIV",
    kind: "symmetric",
    engine: "noble",
    noble: { fn: "gcmsiv", keyBytes: 32 },
    ivBytes: 12,
    fields: ["secret"],
    group: "AES · authenticated",
    note: "Nonce-misuse resistant.",
  },

  // --- AES · unauthenticated modes --------------------------------
  aes(256, "CBC", { group: "AES · block / stream modes", ivBytes: 16, note: "No integrity check." }),
  aes(192, "CBC", { group: "AES · block / stream modes", ivBytes: 16 }),
  aes(128, "CBC", { group: "AES · block / stream modes", ivBytes: 16 }),
  aes(256, "CTR", { group: "AES · block / stream modes", ivBytes: 16, note: "No integrity check." }),
  aes(192, "CTR", { group: "AES · block / stream modes", ivBytes: 16 }),
  aes(128, "CTR", { group: "AES · block / stream modes", ivBytes: 16 }),
  aes(256, "CFB", { group: "AES · block / stream modes", ivBytes: 16, note: "No integrity check." }),
  aes(192, "CFB", { group: "AES · block / stream modes", ivBytes: 16 }),
  aes(128, "CFB", { group: "AES · block / stream modes", ivBytes: 16 }),

  // --- AES · legacy ---------------------------------------------
  aes(256, "ECB", { group: "AES · legacy", ivBytes: 0, legacy: true, note: "ECB leaks patterns — legacy only." }),
  aes(192, "ECB", { group: "AES · legacy", ivBytes: 0, legacy: true }),
  aes(128, "ECB", { group: "AES · legacy", ivBytes: 0, legacy: true }),

  // --- ChaCha --------------------------------------------------
  {
    id: "ChaCha20-Poly1305",
    label: "ChaCha20-Poly1305",
    kind: "symmetric",
    engine: "noble",
    noble: { fn: "chacha", keyBytes: 32 },
    ivBytes: 12,
    fields: ["secret"],
    group: "ChaCha",
    recommended: true,
    note: "Authenticated stream cipher.",
  },
  {
    id: "XChaCha20-Poly1305",
    label: "XChaCha20-Poly1305",
    kind: "symmetric",
    engine: "noble",
    noble: { fn: "xchacha", keyBytes: 32 },
    ivBytes: 24,
    fields: ["secret"],
    group: "ChaCha",
    note: "Extended 192-bit nonce.",
  },

  // --- AES · OpenSSL-compatible (raw format) ---------------------
  // Deliberately separate entries rather than a flag on the native AES-CBC
  // ones: the key handling and the IV are different, so presenting them as the
  // same algorithm in another wrapper would be a lie.
  compat(256),
  compat(192),
  compat(128),

  // --- RSA ---------------------------------------------------
  {
    id: "RSA-OAEP",
    label: "RSA-OAEP",
    kind: "asymmetric",
    engine: "webcrypto",
    fields: ["rsaKeys", "rsaHash"],
    group: "RSA · asymmetric",
    note: "Public key encrypts, private key decrypts. Small payloads only.",
  },
];

/**
 * Every algorithm belongs to a format, and TUC1 is the default — an entry has
 * to opt out deliberately. Applied here rather than per entry so a new one
 * cannot go missing from the picker by forgetting the field.
 */
export const ALGORITHMS = CATALOGUE.map((a) => ({ format: "tuc1", ...a }));

export const ALGORITHM_GROUPS = [...new Set(ALGORITHMS.map((a) => a.group))];

export const getAlgorithm = (id) => ALGORITHMS.find((a) => a.id === id);

export const getFormat = (id) => FORMATS.find((f) => f.id === id) ?? FORMATS[0];

/** The algorithms a given ciphertext format can carry. */
export const algorithmsForFormat = (formatId) => ALGORITHMS.filter((a) => a.format === formatId);

/** The algorithm a format should land on when the user switches to it. */
export const defaultAlgorithmFor = (formatId) => {
  const list = algorithmsForFormat(formatId);
  return (list.find((a) => a.recommended) ?? list[0]).id;
};

export const RSA_HASHES = ["SHA-256", "SHA-384", "SHA-512", "SHA-1"];

/** Key size in bits, for labelling and raw-key generation. */
export const keyBitsOf = (algo) =>
  (algo.noble?.keyBytes ?? algo.compat?.keyBytes ?? 32) * 8;

/** Allowed raw-key byte lengths for a given algorithm. */
export function allowedKeyBytes(algo) {
  if (algo.noble) return [algo.noble.keyBytes];
  if (algo.compat) return [algo.compat.keyBytes];
  return [16, 24, 32];
}
