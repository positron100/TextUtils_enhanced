// Developer-tool registry: METADATA ONLY.
//
// Deliberately free of component imports. The unified command registry
// (lib/commands.js) reads this list so every tool is reachable from ⌘K, and
// commands.js is part of the initial bundle — so importing the tool components
// here would drag every developer tool, and @noble/ciphers with them, into the
// first load of the Write view. DeveloperView resolves the components lazily
// instead (see its `TOOL_COMPONENTS` map).

export const DEV_TOOLS = [
  {
    id: "json",
    label: "JSON",
    category: "Developer",
    description: "Format, minify, and validate",
    keywords: ["json", "pretty", "format", "minify", "validate", "beautify"],
  },
  {
    id: "base64",
    label: "Base64",
    category: "Developer",
    description: "Encode and decode (UTF-8 safe)",
    keywords: ["base64", "encode", "decode", "btoa", "atob"],
  },
  {
    id: "url",
    label: "URL",
    category: "Developer",
    description: "Percent-encode and decode",
    keywords: ["url", "uri", "encode", "decode", "percent", "escape", "query", "component"],
  },
  {
    id: "hash",
    label: "Hash",
    category: "Developer",
    description: "SHA-256 / 384 / 512 digest",
    keywords: ["hash", "sha", "sha256", "sha384", "sha512", "digest", "checksum", "crypto"],
  },
  {
    id: "regex",
    label: "Regex",
    category: "Developer",
    description: "Test patterns against a string",
    keywords: ["regex", "regexp", "pattern", "match", "test", "capture"],
  },
  {
    id: "encrypt",
    label: "Encryption",
    category: "Developer",
    description: "Encrypt / decrypt locally (AES, ChaCha20, RSA-OAEP)",
    keywords: [
      "encrypt",
      "decrypt",
      "encryption",
      "aes",
      "aes-gcm",
      "rsa",
      "cipher",
      "crypto",
      "password",
      "secret",
    ],
  },
];

export const getDevTool = (id) => DEV_TOOLS.find((t) => t.id === id);
