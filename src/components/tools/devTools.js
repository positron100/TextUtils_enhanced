// Developer-tool registry. Shaped so D4 can fold it into the unified command
// registry (id / label / category / description / keywords) and swap `Component`
// for a lazy import without touching consumers.

import JsonTool from "./JsonTool.jsx";
import Base64Tool from "./Base64Tool.jsx";
import UrlTool from "./UrlTool.jsx";
import HashTool from "./HashTool.jsx";
import RegexTool from "./RegexTool.jsx";
import EncryptTool from "./EncryptTool.jsx";

export const DEV_TOOLS = [
  {
    id: "json",
    label: "JSON",
    category: "Developer",
    description: "Format, minify, and validate",
    keywords: ["json", "pretty", "format", "minify", "validate", "beautify"],
    Component: JsonTool,
  },
  {
    id: "base64",
    label: "Base64",
    category: "Developer",
    description: "Encode and decode (UTF-8 safe)",
    keywords: ["base64", "encode", "decode", "btoa", "atob"],
    Component: Base64Tool,
  },
  {
    id: "url",
    label: "URL",
    category: "Developer",
    description: "Percent-encode and decode",
    keywords: ["url", "uri", "encode", "decode", "percent", "escape", "query", "component"],
    Component: UrlTool,
  },
  {
    id: "hash",
    label: "Hash",
    category: "Developer",
    description: "SHA-256 / 384 / 512 digest",
    keywords: ["hash", "sha", "sha256", "sha384", "sha512", "digest", "checksum", "crypto"],
    Component: HashTool,
  },
  {
    id: "regex",
    label: "Regex",
    category: "Developer",
    description: "Test patterns against a string",
    keywords: ["regex", "regexp", "pattern", "match", "test", "capture"],
    Component: RegexTool,
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
    Component: EncryptTool,
  },
];

export const getDevTool = (id) => DEV_TOOLS.find((t) => t.id === id);
