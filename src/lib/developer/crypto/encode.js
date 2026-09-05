// Byte / text / base64 helpers shared by every crypto engine. No crypto here.

export const enc = new TextEncoder();
export const dec = new TextDecoder();

export function bytesToB64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i += 1) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}

export function b64ToBytes(b64) {
  const bin = atob(String(b64).trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export const b64url = (b64) => b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const unb64url = (s) => s.replace(/-/g, "+").replace(/_/g, "/");

export function hexToBytes(hex) {
  return new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));
}

export function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

export function randomKeyHex(bits = 256) {
  return bytesToHex(randomBytes(bits / 8));
}

/** Parse a raw symmetric key given as hex or base64; enforce an allowed length. */
export function parseRawKey(text, allowedBytes = [16, 24, 32]) {
  const t = String(text).trim();
  if (!t) throw new Error("Enter a key.");
  let bytes;
  if (/^[0-9a-fA-F]+$/.test(t) && t.length % 2 === 0) bytes = hexToBytes(t);
  else {
    try {
      bytes = b64ToBytes(t);
    } catch {
      throw new Error("Key must be hex or base64.");
    }
  }
  if (!allowedBytes.includes(bytes.length)) {
    throw new Error(
      `Key must be ${allowedBytes.map((b) => b * 8).join(" / ")} bits (got ${bytes.length * 8}).`,
    );
  }
  return bytes;
}

/**
 * Removes one pair of matching outer quotes, for ciphertext copied out of JSON,
 * a log line, a spreadsheet cell or a chat window — the last of which will have
 * turned the straight pair into curly ones on the way. Exactly one pair, only
 * when the string both opens and closes with the partner of the same pair;
 * quotes anywhere else are content and are left alone. Base64url and the
 * `TUC1.` envelope never contain a quote of any kind, so this cannot silently
 * alter a real payload — no ciphertext character is ever rewritten.
 *
 * Decrypt-side only: quotes in plaintext are meaningful.
 */
const QUOTE_PAIRS = [
  ['"', '"'],
  ["'", "'"],
  ["“", "”"], // “ ”
  ["‘", "’"], // ‘ ’
  ["«", "»"], // « »
];

export function unquote(text) {
  const t = String(text ?? "").trim();
  for (const [open, close] of QUOTE_PAIRS) {
    if (t.length >= 2 && t.startsWith(open) && t.endsWith(close)) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}

export const PAYLOAD_PREFIX = "TUC1.";

export function packPayload(meta) {
  return PAYLOAD_PREFIX + b64url(btoa(JSON.stringify(meta)));
}

export function parsePayload(payload) {
  const t = String(payload || "").trim();
  if (!t.startsWith(PAYLOAD_PREFIX)) {
    throw new Error("Expected a TextUtils (TUC1) payload.");
  }
  let meta;
  try {
    meta = JSON.parse(atob(unb64url(t.slice(PAYLOAD_PREFIX.length))));
  } catch {
    throw new Error("Corrupt payload — could not parse.");
  }
  if (meta.v !== 1 || !meta.alg || !meta.ct) throw new Error("Corrupt payload — missing fields.");
  return meta;
}

export const stripPem = (s) => s.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
