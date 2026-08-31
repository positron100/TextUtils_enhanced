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

const aes = (bits, mode, extra) => ({
  id: `AES-${bits}-${mode}`,
  label: `AES-${bits}-${mode}`,
  kind: "symmetric",
  engine: "noble",
  noble: { fn: mode.toLowerCase().replace("-", ""), keyBytes: bits / 8 },
  fields: ["secret"],
  ...extra,
});

export const ALGORITHMS = [
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

export const ALGORITHM_GROUPS = [...new Set(ALGORITHMS.map((a) => a.group))];

export const getAlgorithm = (id) => ALGORITHMS.find((a) => a.id === id);

export const RSA_HASHES = ["SHA-256", "SHA-384", "SHA-512", "SHA-1"];

/** Allowed raw-key byte lengths for a given algorithm. */
export function allowedKeyBytes(algo) {
  if (algo.noble) return [algo.noble.keyBytes];
  return [16, 24, 32];
}
