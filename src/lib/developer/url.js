// URL vs component encoding.
//   URL       (encodeURI)          keeps  : / ? # [ ] @ ! $ & ' ( ) * + , ; =
//             — for encoding a whole URL
//   component (encodeURIComponent) encodes those too
//             — for a single query value or path segment
// Decode is fallible (a lone "%" or bad escape); errors are surfaced, not swallowed.

export const urlEncode = (text) => encodeURI(text);
export const componentEncode = (text) => encodeURIComponent(text);

export function urlDecode(text) {
  try {
    return { ok: true, value: decodeURI(text) };
  } catch {
    return { ok: false, error: { message: "Malformed escape sequence in URL" } };
  }
}

export function componentDecode(text) {
  try {
    return { ok: true, value: decodeURIComponent(text) };
  } catch {
    return { ok: false, error: { message: "Malformed percent-encoding" } };
  }
}
