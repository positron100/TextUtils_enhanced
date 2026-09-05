// Local file import / export for the editor.
//
// Nothing leaves the machine: a Blob is handed to the browser's own download,
// and reading uses a file input the user picks from. No network, no upload —
// the footer's promise holds.

export const EXPORT_VERSION = 1;

function stamp() {
  // 2026-09-05-1913 — sortable, no separators a filesystem dislikes.
  const iso = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return iso.replace(/-(\d\d)-(\d\d)$/, "-$1$2");
}

/** Build the JSON document an export writes and an import reads back. */
export function buildExportDocument(text, stats = null) {
  return {
    app: "TextUtils",
    version: EXPORT_VERSION,
    savedAt: new Date().toISOString(),
    ...(stats ? { stats } : {}),
    text,
  };
}

/**
 * Read a previously exported document (or any plain text file).
 * @returns {{ text: string } | { error: string }}
 */
export function parseImported(filename, contents) {
  const isJson = /\.json$/i.test(filename || "");
  if (!isJson) return { text: contents };

  let doc;
  try {
    doc = JSON.parse(contents);
  } catch {
    return { error: "That file is named .json but isn't valid JSON." };
  }
  // Deliberately narrow: a TextUtils export, or anything else carrying a plain
  // string `text`. Never eval'd, never spread into state — one field is read.
  if (doc && typeof doc.text === "string") return { text: doc.text };
  return { error: "That JSON has no “text” field — it wasn't exported from TextUtils." };
}

/** Save `text` to the user's machine as .txt or .json. */
export function exportText(text, format = "txt", stats = null) {
  const json = format === "json";
  const body = json ? JSON.stringify(buildExportDocument(text, stats), null, 2) : text;
  const blob = new Blob([body], {
    type: json ? "application/json;charset=utf-8" : "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `textutils-${stamp()}.${json ? "json" : "txt"}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Freed on the next turn; revoking immediately races the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Ask for a file and read it.
 * @returns {Promise<{ text: string } | { error: string } | null>} null = cancelled
 */
export function importTextFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,.json,.md,text/plain,application/json";
    input.style.display = "none";
    document.body.appendChild(input);

    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(value);
    };

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return done(null);
      const reader = new FileReader();
      reader.onload = () => done(parseImported(file.name, String(reader.result ?? "")));
      reader.onerror = () => done({ error: "That file could not be read." });
      reader.readAsText(file);
    });
    // A cancelled picker fires no event in every browser; the window regaining
    // focus without a change is the only signal, and it must not beat a real
    // pick — hence the delay and the settled guard.
    window.addEventListener(
      "focus",
      () => setTimeout(() => done(null), 500),
      { once: true },
    );

    input.click();
  });
}
