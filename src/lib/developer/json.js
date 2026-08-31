// JSON format / minify / validate on top of native JSON.parse / JSON.stringify.
// Fallible functions return { ok, value } | { ok:false, error:{ message, line?, column?, position? } }.

export function validateJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: describeError(e, text) };
  }
}

export function formatJson(text, indent = 2) {
  const parsed = validateJson(text);
  if (!parsed.ok) return parsed;
  return { ok: true, value: JSON.stringify(parsed.value, null, indent) };
}

export function minifyJson(text) {
  const parsed = validateJson(text);
  if (!parsed.ok) return parsed;
  return { ok: true, value: JSON.stringify(parsed.value) };
}

function describeError(e, text) {
  const raw = e && e.message ? String(e.message) : "Invalid JSON";

  // V8: "... in JSON at position 12 (line 2 column 3)"  (the parenthetical is newer)
  let m = raw.match(/at position (\d+)(?:\s*\(line (\d+) column (\d+)\))?/);
  if (m) {
    const position = Number(m[1]);
    const loc = m[2]
      ? { line: Number(m[2]), column: Number(m[3]) }
      : lineColumn(text, position);
    return { message: headline(raw), position, ...loc };
  }

  // SpiderMonkey: "JSON.parse: ... at line 1 column 2 of the JSON data"
  m = raw.match(/line (\d+) column (\d+)/);
  if (m) {
    return { message: headline(raw), line: Number(m[1]), column: Number(m[2]) };
  }

  return { message: headline(raw) };
}

function lineColumn(text, position) {
  const upto = text.slice(0, position);
  const line = (upto.match(/\n/g) || []).length + 1;
  const column = position - upto.lastIndexOf("\n");
  return { line, column };
}

function headline(raw) {
  return raw
    .replace(/^JSON\.parse:\s*/, "")
    .replace(/\s*in JSON at position.*$/, "")
    .replace(/\s*of the JSON data\.?$/, "")
    .replace(/\s*at line \d+ column \d+.*$/, "")
    // V8's "Unexpected token 'X', \"<snippet>\" is not valid JSON"
    .replace(/,\s*"[\s\S]*"\s+is not valid JSON\.?$/, "")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}
