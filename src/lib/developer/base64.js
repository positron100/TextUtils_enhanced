// UTF-8-correct Base64. btoa/atob only speak Latin-1, so text is routed through
// TextEncoder/TextDecoder. Decode returns { ok, value } | { ok:false, error }.

export function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function decodeBase64(input) {
  let cleaned = input.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (cleaned === "") return { ok: true, value: "" };

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
    return { ok: false, error: { message: "Not valid Base64 — unexpected characters" } };
  }
  while (cleaned.length % 4 !== 0) cleaned += "=";

  try {
    const binary = atob(cleaned);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return { ok: true, value: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, error: { message: "Base64 does not decode to valid UTF-8 text" } };
  }
}
