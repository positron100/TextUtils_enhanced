// Local, browser-native encryption. Nothing here ever touches the network —
// plaintext, ciphertext, keys and passwords stay in the page. The Contact form
// (api/contact.js) is unrelated.
//
// Engines:
//   noble     — AES-{128,192,256}-{GCM,GCM-SIV,CBC,CTR,CFB,ECB},
//               ChaCha20-Poly1305, XChaCha20-Poly1305   (@noble/ciphers, audited)
//   webcrypto — RSA-OAEP                                  (SubtleCrypto)
//
// Password keys are stretched with PBKDF2 (SHA-256, 250k iterations, random
// salt) — a raw password is never used directly as a key.
//
// Portable payload:  TUC1.<base64url(JSON)>
//   { v:1, alg, kdf?, hash?, iter?, salt?, iv?, ct }   (binary fields base64)

import { gcm, gcmsiv, cbc, ctr, cfb, ecb } from "@noble/ciphers/aes";
import { chacha20poly1305, xchacha20poly1305 } from "@noble/ciphers/chacha";
import {
  enc,
  dec,
  bytesToB64,
  b64ToBytes,
  parseRawKey,
  packPayload,
  parsePayload,
  stripPem,
  randomBytes,
} from "./encode.js";
import { getAlgorithm, allowedKeyBytes } from "./registry.js";

export { ALGORITHMS, ALGORITHM_GROUPS, getAlgorithm, RSA_HASHES } from "./registry.js";
export { parsePayload, parseRawKey, randomKeyHex } from "./encode.js";

const PBKDF2_ITERATIONS = 250_000;
const PBKDF2_HASH = "SHA-256";

function subtle() {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error("Web Crypto needs a secure context (HTTPS or localhost).");
  return s;
}

/** PBKDF2 → raw key bytes of the requested length. */
async function deriveKeyBytes(password, salt, lengthBytes) {
  const base = await subtle().importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle().deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    base,
    lengthBytes * 8,
  );
  return new Uint8Array(bits);
}

async function resolveKey(algo, { keyMode, secret }, meta, forDecrypt) {
  const lengthBytes = allowedKeyBytes(algo)[0];
  if (keyMode === "password" || (forDecrypt && meta.kdf === "PBKDF2")) {
    const salt = forDecrypt ? b64ToBytes(meta.salt) : randomBytes(16);
    const key = await deriveKeyBytes(secret, salt, lengthBytes);
    if (!forDecrypt) {
      meta.kdf = "PBKDF2";
      meta.hash = PBKDF2_HASH;
      meta.iter = PBKDF2_ITERATIONS;
      meta.salt = bytesToB64(salt);
    }
    return key;
  }
  if (!forDecrypt) meta.kdf = "raw";
  return parseRawKey(secret, allowedKeyBytes(algo));
}

/** Build the noble cipher instance for an AES / ChaCha algorithm. */
function nobleCipher(algo, key, iv) {
  switch (algo.noble.fn) {
    case "gcm":
      return gcm(key, iv);
    case "gcmsiv":
      return gcmsiv(key, iv);
    case "cbc":
      return cbc(key, iv);
    case "ctr":
      return ctr(key, iv);
    case "cfb":
      return cfb(key, iv);
    case "ecb":
      return ecb(key);
    case "chacha":
      return chacha20poly1305(key, iv);
    case "xchacha":
      return xchacha20poly1305(key, iv);
    default:
      throw new Error(`Unsupported cipher: ${algo.id}`);
  }
}

/**
 * @param {{ algorithmId:string, keyMode?:"password"|"raw", secret?:string,
 *           plaintext:string, rsaPublicKey?:string, rsaHash?:string }} params
 * @returns {Promise<string>} portable payload
 */
export async function encrypt(params) {
  const algo = getAlgorithm(params.algorithmId);
  if (!algo) throw new Error(`Unknown algorithm: ${params.algorithmId}`);
  if (!params.plaintext) throw new Error("Nothing to encrypt.");

  if (algo.kind === "asymmetric") return encryptRsa(algo, params);

  if (!params.secret) {
    throw new Error(params.keyMode === "raw" ? "Enter a key." : "Enter a password.");
  }
  const meta = { v: 1, alg: algo.id };
  const iv = algo.ivBytes ? randomBytes(algo.ivBytes) : new Uint8Array(0);
  if (algo.ivBytes) meta.iv = bytesToB64(iv);
  const keyBytes = await resolveKey(algo, params, meta, false);

  const ct = nobleCipher(algo, keyBytes, iv).encrypt(enc.encode(params.plaintext));
  meta.ct = bytesToB64(ct);
  return packPayload(meta);
}

/**
 * @param {{ payload:string, keyMode?:"password"|"raw", secret?:string,
 *           rsaPrivateKey?:string }} params
 * @returns {Promise<string>} plaintext
 */
export async function decrypt(params) {
  const meta = parsePayload(params.payload);
  const algo = getAlgorithm(meta.alg);
  if (!algo) throw new Error(`Payload uses an unsupported algorithm: ${meta.alg}`);

  if (algo.kind === "asymmetric") return decryptRsa(algo, meta, params);

  if (!params.secret) throw new Error("Enter the password or key used to encrypt.");
  const iv = meta.iv ? b64ToBytes(meta.iv) : new Uint8Array(0);
  const keyBytes = await resolveKey(algo, params, meta, true);

  try {
    return dec.decode(nobleCipher(algo, keyBytes, iv).decrypt(b64ToBytes(meta.ct)));
  } catch {
    throw new Error(
      algo.id.includes("GCM") || algo.noble.fn === "chacha" || algo.noble.fn === "xchacha"
        ? "Decryption failed — wrong password/key, or the payload was altered."
        : "Decryption failed — wrong password/key or corrupt payload.",
    );
  }
}

/* --- RSA-OAEP ------------------------------------------------- */

export async function generateRsaKeyPair({ modulusLength = 2048, hash = "SHA-256" } = {}) {
  const pair = await subtle().generateKey(
    { name: "RSA-OAEP", modulusLength, publicExponent: new Uint8Array([1, 0, 1]), hash },
    true,
    ["encrypt", "decrypt"],
  );
  const spki = await subtle().exportKey("spki", pair.publicKey);
  const pkcs8 = await subtle().exportKey("pkcs8", pair.privateKey);
  return { publicKey: bytesToB64(spki), privateKey: bytesToB64(pkcs8), hash };
}

async function encryptRsa(_algo, { rsaPublicKey, rsaHash = "SHA-256", plaintext }) {
  if (!rsaPublicKey) throw new Error("Paste or generate a public key.");
  let key;
  try {
    key = await subtle().importKey(
      "spki",
      b64ToBytes(stripPem(rsaPublicKey)),
      { name: "RSA-OAEP", hash: rsaHash },
      false,
      ["encrypt"],
    );
  } catch {
    throw new Error("Not a valid RSA public key (expected base64 SPKI).");
  }
  let ct;
  try {
    ct = await subtle().encrypt({ name: "RSA-OAEP" }, key, enc.encode(plaintext));
  } catch {
    throw new Error("Message too long for this RSA key — use a larger key or less text.");
  }
  return packPayload({ v: 1, alg: "RSA-OAEP", hash: rsaHash, ct: bytesToB64(ct) });
}

async function decryptRsa(_algo, meta, { rsaPrivateKey }) {
  if (!rsaPrivateKey) throw new Error("Paste the matching private key.");
  let key;
  try {
    key = await subtle().importKey(
      "pkcs8",
      b64ToBytes(stripPem(rsaPrivateKey)),
      { name: "RSA-OAEP", hash: meta.hash || "SHA-256" },
      false,
      ["decrypt"],
    );
  } catch {
    throw new Error("Not a valid RSA private key (expected base64 PKCS#8).");
  }
  try {
    return dec.decode(await subtle().decrypt({ name: "RSA-OAEP" }, key, b64ToBytes(meta.ct)));
  } catch {
    throw new Error("Decryption failed — wrong private key or corrupt payload.");
  }
}
