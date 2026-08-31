// Cryptographic hashes via the Web Crypto API. A hash is a one-way digest —
// it is NOT encryption and cannot be reversed.

export const HASH_ALGORITHMS = ["SHA-256", "SHA-384", "SHA-512"];

export async function hashText(text, algorithm = "SHA-256") {
  if (!globalThis.crypto?.subtle) {
    return {
      ok: false,
      error: { message: "Hashing needs a secure context (HTTPS or localhost)" },
    };
  }
  if (!HASH_ALGORITHMS.includes(algorithm)) {
    return { ok: false, error: { message: `Unknown algorithm: ${algorithm}` } };
  }
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest(algorithm, bytes);
  return { ok: true, value: toHex(digest) };
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
