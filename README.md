# TextUtils

A calm, fast text workbench with a deceptively simple surface. The editor is
the centre; capabilities appear progressively.

Everything runs locally in the browser — no backend, no logging, nothing
persisted unless you explicitly export it.

## Features

**Editor** — premium writing surface, light/dark theme, entrance choreography.
On wide screens the Write view is a two-region workspace: editor on the left,
the Transform/Clean action rail on the right, full statistics beneath.

**Statistics (live)** — words, characters, characters without spaces, sentences,
lines, paragraphs, reading time, speaking time. All figures are always visible
(no More/Less toggle).

**Transform** — UPPERCASE, lowercase, Title Case, Sentence case, camelCase,
PascalCase, snake_case, kebab-case, CONSTANT_CASE. Surfaced as pills in the
Write action rail. Operate on the selection if there is one, else the whole
document; the result is re-selected.

**Clean / whitespace** — remove extra spaces, trim lines, trim document,
collapse whitespace, remove blank lines, normalize line endings, spaces↔tabs,
plus dedupe / sort / character cleanup / normalization — grouped, expandable
sections in the same action rail.

**Typing Speed** — its own primary view. *Test* mode: a known passage, so WPM,
accuracy, errors and elapsed time are all well-defined. *Free writing* mode:
type anything — speed estimate + active time only, never accuracy (no
reference).

**Editor card-swipe** — running any Transform / Clean action (or undo / redo /
clear) slides a snapshot of the previous text off the way the primary views
move, revealing the editor underneath already showing the new text. The editor
itself never remounts — history, selection and scroll stay intact; it's a
throwaway visual layer. Off under reduced motion.

**Find & Replace** (`Ctrl/Cmd+F`) — inline, case-sensitive & whole-word options,
match count, keyboard navigation, replace / replace all, `Esc` to close.

**History** — application-level undo/redo (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`,
`Ctrl+Y`); transforms are explicit checkpoints, typing is checkpointed coarsely.
In memory only, capped at 100 states.

**Developer** — a distinct primary view: a full-viewport input/output bench.
Both surfaces are siblings of the Write editor (`.dev-surface`: same radius,
border, elevation, padding, one shared `--font-editor`). Copy / Clear are
compact magnetic icon actions in each surface header — no button row, no
"Replace editor" (tools never push into the editor). Tabs switch with the same
directional slide the primary views use, and can be dragged. Tools:
- **JSON** — format / minify / validate, error line & column
- **Base64** — encode / decode, UTF-8 correct
- **URL** — encode / decode, whole-URL vs component
- **Hash** — SHA-256 / 384 / 512 via Web Crypto (a hash is not encryption)
- **Regex** — pattern + flags, live match highlighting, capture groups
- **Encryption** — see below

Every tool action slides the *new* result surface in from the side rather than
swapping it in place.

**Encryption** — local, browser-native encrypt/decrypt via a small algorithm
registry (`lib/developer/crypto/`). Every listed algorithm is actually
implemented and round-trip tested — no false claims. AES + ChaCha go through
the audited `@noble/ciphers`; RSA-OAEP uses Web Crypto.

| Group | Algorithms |
| --- | --- |
| AES · authenticated | AES-{256,192,128}-GCM, AES-256-GCM-SIV |
| AES · block / stream modes | AES-{256,192,128}-{CBC, CTR, CFB} |
| AES · legacy | AES-{256,192,128}-ECB *(marked "legacy")* |
| ChaCha | ChaCha20-Poly1305, XChaCha20-Poly1305 |
| RSA · asymmetric | RSA-OAEP (generate / import a key pair) |

Not implemented (and not shown): AES-CCM/OCB/XTS/CBC-HMAC, ARIA, Camellia,
Blowfish, 3DES/DES, RC2/RC4/RC5 — no audited, maintained browser build, and the
RC-family / DES are not honest to present as usable encryption today. Primitives
are never hand-rolled.

Password keys are stretched with **PBKDF2** (SHA-256, 250k iterations, random
salt) — a raw password is never a key. The algorithm is picked from a themed
searchable, grouped command-style popover (recommended / legacy badges,
keyboard nav); only the fields that algorithm needs are shown, swapped with a
slide. Output is a self-describing `TUC1.<base64url(JSON)>` payload (`alg`,
`kdf`, `salt`, `iv`, `iter`, ct), so Decrypt needs only the payload and the
secret. **Nothing is sent anywhere** — plaintext, ciphertext, keys and
passwords stay in the page and nothing is logged; the Contact API is unrelated.
Sensitive fields are dropped when the view / tool changes.

A **Format** selector chooses between two ciphertext formats — never sniffed
from the input, because the format is what decides how a key is derived:

| Format | |
| --- | --- |
| **TextUtils (TUC1)** | the above — PBKDF2, random IV, `TUC1.` envelope |
| **Compatible / Raw AES** | bare base64, AES-{256,192,128} |

The compatible format reproduces what OpenSSL's `aes256` / `aes192` / `aes128`
aliases produce (as used by PHP's `openssl_encrypt` and the online tools built
on it): **AES-CBC**, the secret's UTF-8 bytes used *directly* as the key
(zero-padded, truncated past the key length), an **all-zero IV**, PKCS#7
padding, base64 out — no salt, no header, no MAC. It was determined by
experiment against a real implementation, and `openssl-compat.test.js` pins it
with ciphertext that implementation actually produced; interop is exact in both
directions (identical bytes, since the format is deterministic). It exists to
read and write other tools' ciphertext and is **much weaker** than TUC1 — no
key stretching, a fixed IV, and no tamper detection — so it is labelled as such
in the UI and is never the default.

**Command palette** (`Ctrl/Cmd+K`) — fuzzy search across every action (40+),
grouped by category, Recent section, full keyboard control. The single
discovery surface — including the four primary views themselves, under **Go
to**. Every command carries the view it belongs to (`targetView` in
`commands.js`, derived from its category), so choosing one from anywhere slides
the stage to that view first — the same physical horizontal pass the nav and
drag use — and runs the action once it has arrived. Actions that work anywhere
(the theme toggle) never move the stage.

**History** — a compact timeline popover; click any checkpoint to restore it.
In memory only, capped at 100.

## Keyboard

| Key | |
| --- | --- |
| `Ctrl/Cmd+K` | Command palette |
| `Ctrl/Cmd+F` | Find & Replace |
| `Ctrl/Cmd+Z` · `Ctrl/Cmd+Shift+Z` · `Ctrl+Y` | Undo / redo |
| `Escape` | Close the active surface |

_Coming: import/export, code-splitting, all-match Find & Replace highlighting._

## Stack

- Vite + React 18 (plain JavaScript)
- framer-motion for navigation, magnetic interactions, view transitions
- `@noble/ciphers` for ChaCha20-Poly1305 (audited; the only crypto dependency)
- WAAPI + View Transitions for the theme reveal — reuses the opening
  animation's geometry (circle → rounded square → full-width band → viewport)
  from a fixed centre; drag-to-scrub still applies
- `prefers-reduced-motion` honoured everywhere
- Vitest unit tests for every pure utility

## Navigation & views

A floating glass bar switches the primary stage between four views — **Write**,
**Developer**, **Typing Speed**, **Contact**. The incoming view is positioned
one stage-width to the side (direction of travel) and slides on while the
outgoing view moves off the other way (framer-motion `AnimatePresence` +
`popLayout`, spring, direction-aware) — a physical pass, not a cross-fade. The
stage is also **draggable**: grab the view's own surface (not a control) and
drag horizontally to pull in the neighbouring view; release past a distance or
velocity threshold to commit, otherwise it springs back. The developer tabs
have the same slide + drag. A liquid indicator glides behind the active nav
item / tab. Editor and tool state survive view switches (they live in `App`);
per-tool internal state resets on switch.

Transform / Clean are **not** navigation — they live in the Write action rail
and in `⌘K`. Shared UI primitives (`GlassPill`, `LiquidIndicator`, `Magnetic`,
`ViewStage`, the `.dev-surface` editor surface) keep every equivalent control
behaving identically.

## Contact

A local-first envelope form. `submitContact` POSTs to `/api/contact`
(`api/contact.js` on Vercel, or the dev-server middleware in `vite.config.js`)
which relays via Resend — set `RESEND_API_KEY` + `CONTACT_EMAIL` in the
deployment env. No secrets reach the browser; without the env the form fails
gracefully to a `mailto:` fallback.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Run unit tests |
| `npm run lint` | Lint |

## Structure

```
src/
  lib/
    text/         case · whitespace · statistics · search · lines · cleanup · normalization · typing
    developer/    json · base64 · url · hash · regex        (pure, tested)
    developer/crypto/  registry · encode · index (Web Crypto + @noble/ciphers)
    commands.js   unified registry — single source of truth for discovery
  hooks/          useEditorController · useHistory · useRecentCommands · useCopy · useTheme
                  useReducedMotion · useTypingStats · useThemeToggleController
                  useMagnetic · useSwipeNav · useEditorImpact · useGhostType
  components/
    editor/       Editor
    write/        ActionRail · TypingTest · EditorImpact     (Write workspace)
    toolbar/      Toolbar (utility row) · ActionButton · CopyButton
    statistics/   StatBar · RollingNumber
    find-replace/ FindReplace · command-palette/ · history/
    tools/        {Json,Base64,Url,Hash,Regex,Encrypt}Tool · AlgorithmSelect · ToolParts · devTools.js
    views/        WriteView · DeveloperView · TypingView · ContactView
    nav/          NavBar
    ui/           GlassPill · LiquidIndicator · Magnetic · Popover
    ViewStage · ThemeToggle
  styles/         tokens.css (design system) · global.css
```
