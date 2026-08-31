// Safe RegExp compilation + match extraction for the tester.

const MAX_MATCHES = 1000;

export function compileRegex(pattern, options = {}) {
  const { global = true, ignoreCase = false, multiline = false, dotAll = false } = options;
  let flags = "";
  if (global) flags += "g";
  if (ignoreCase) flags += "i";
  if (multiline) flags += "m";
  if (dotAll) flags += "s";

  try {
    return { ok: true, regex: new RegExp(pattern, flags) };
  } catch (e) {
    return {
      ok: false,
      error: {
        message: String(e.message).replace(/^Invalid regular expression:\s*/, ""),
      },
    };
  }
}

/**
 * @returns {{ matches: Array<{text,index,groups,named}>, count: number, truncated: boolean }}
 */
export function runRegex(regex, text) {
  const matches = [];
  let truncated = false;

  if (regex.global) {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      matches.push(toMatch(m));
      if (m[0] === "") regex.lastIndex += 1;
      if (matches.length >= MAX_MATCHES) {
        truncated = true;
        break;
      }
    }
  } else {
    const m = regex.exec(text);
    if (m) matches.push(toMatch(m));
  }

  return { matches, count: matches.length, truncated };
}

function toMatch(m) {
  return {
    text: m[0],
    index: m.index,
    groups: m.slice(1).map((g) => (g === undefined ? null : g)),
    named: m.groups ? { ...m.groups } : null,
  };
}
