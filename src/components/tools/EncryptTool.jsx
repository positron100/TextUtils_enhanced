import { useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import ActionButton from "../toolbar/ActionButton.jsx";
import { useToolIO } from "../../hooks/useToolIO.js";
import { ToolField, ToolMessage, ToolLayout } from "./ToolParts.jsx";
import AlgorithmSelect from "./AlgorithmSelect.jsx";
import { ease } from "../../lib/motion.js";
import {
  getAlgorithm,
  RSA_HASHES,
  FORMATS,
  getFormat,
  algorithmsForFormat,
  defaultAlgorithmFor,
  keyBitsOf,
  encrypt,
  decrypt,
  generateRsaKeyPair,
  randomKeyHex,
} from "../../lib/developer/crypto/index.js";

// Sensitive state (password, keys) lives only in this component and is dropped
// when the developer view / tool changes — DeveloperView unmounts on view
// change and SpatialSurface remounts the panel per tool.

export default function EncryptTool({ editorText }) {
  const [formatId, setFormatId] = useState("tuc1"); // tuc1 | openssl-raw
  const [algorithmId, setAlgorithmId] = useState("AES-256-GCM");
  const [keyMode, setKeyMode] = useState("password"); // password | raw
  const [secret, setSecret] = useState("");
  const [rsa, setRsa] = useState({ publicKey: "", privateKey: "", hash: "SHA-256" });
  const [busy, setBusy] = useState(false);
  const io = useToolIO(editorText);

  const algo = useMemo(() => getAlgorithm(algorithmId), [algorithmId]);
  const format = getFormat(formatId);
  const algorithms = useMemo(() => algorithmsForFormat(formatId), [formatId]);
  const isRsa = algo.kind === "asymmetric";
  // The compatible format uses the secret's bytes as the key directly, so the
  // password / raw-key distinction does not apply to it.
  const isCompat = algo.engine === "openssl";
  const keyBits = keyBitsOf(algo);

  // The format decides how a key is derived and how the bytes are laid out, so
  // switching it moves to that format's own algorithms rather than carrying an
  // incompatible selection across.
  const changeFormat = (id) => {
    if (id === formatId) return;
    setFormatId(id);
    setAlgorithmId(defaultAlgorithmFor(id));
    setKeyMode("password");
    io.setFeedback(null);
  };

  const run = async (direction) => {
    setBusy(true);
    io.setFeedback(null);
    try {
      const result =
        direction === "encrypt"
          ? await encrypt(
              isRsa
                ? { algorithmId, plaintext: io.input, rsaPublicKey: rsa.publicKey, rsaHash: rsa.hash }
                : { algorithmId, keyMode: isCompat ? "password" : keyMode, secret, plaintext: io.input },
            )
          : await decrypt(
              isRsa
                ? { payload: io.input, rsaPrivateKey: rsa.privateKey }
                : {
                    // Raw ciphertext carries no metadata, so the chosen
                    // algorithm is what tells decrypt how to read it.
                    algorithmId,
                    payload: io.input,
                    keyMode: isCompat ? "password" : keyMode,
                    secret,
                  },
            );
      io.emit(
        result,
        direction === "encrypt"
          ? isCompat
            ? "Encrypted — plain base64 that other AES tools can read."
            : "Encrypted — copy the payload to share it."
          : "Decrypted",
      );
    } catch (err) {
      io.fail(err.message);
    } finally {
      setBusy(false);
    }
  };

  const generateKeys = async () => {
    setBusy(true);
    io.setFeedback(null);
    try {
      const pair = await generateRsaKeyPair({ modulusLength: 2048, hash: rsa.hash });
      setRsa((r) => ({ ...r, publicKey: pair.publicKey, privateKey: pair.privateKey }));
      io.setFeedback({ type: "success", text: "Generated a 2048-bit key pair. Keep the private key safe." });
    } catch (err) {
      io.setFeedback({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolLayout
      hint={
        <p className="tool__hint">
          <strong>Everything runs locally in your browser</strong> — plaintext, keys and passwords
          never leave the page and nothing is logged.{" "}
          {isCompat ? (
            <>
              This format exists so ciphertext can be exchanged with other AES tools. The secret is
              used as the key directly and the IV is fixed, so it has no key stretching and cannot
              detect tampering — prefer the TextUtils format for anything you actually need kept.
            </>
          ) : (
            <>
              Authenticated ciphers (GCM, GCM-SIV, ChaCha20-Poly1305) also detect tampering.
              Passwords are stretched with PBKDF2. Output is a self-describing <code>TUC1.</code>{" "}
              payload.
            </>
          )}
        </p>
      }
      config={
        <>
          {/* Each control carries its own explanatory line directly beneath it,
              in one block. The note is tied to the control above by a tight gap
              and separated from the next control by the config column's larger
              one, so it reads as that control's metadata at any height — which
              is what keeps it stable across algorithms whose parameter fields
              differ. */}
          <div className="encrypt__control">
            <div className="tool__field tool__field--inline">
              <span className="tool__label">Format</span>
              <div className="tool__controls" role="group" aria-label="Ciphertext format">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="tool__segment"
                    aria-pressed={formatId === f.id}
                    onClick={() => changeFormat(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="encrypt__algonote">{format.note}</p>
          </div>

          <div className="encrypt__control">
            <label className="tool__field tool__field--inline">
              <span className="tool__label">Algorithm</span>
              <AlgorithmSelect
                value={algorithmId}
                algorithms={algorithms}
                onChange={(id) => {
                  setAlgorithmId(id);
                  io.setFeedback(null);
                }}
              />
            </label>
            {algo.note && <p className="encrypt__algonote">{algo.note}</p>}
          </div>

          <div className="encrypt__paramwrap">
            <AnimatePresence mode="popLayout" initial={false}>
              <m.div
                key={isRsa ? "rsa" : "sym"}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.2, ease: ease.standard }}
                className="encrypt__params"
              >
                {!isRsa ? (
                  <>
                    {!isCompat && (
                      <div className="tool__field tool__field--inline">
                        <span className="tool__label">Key from</span>
                        <div className="tool__controls">
                          {["password", "raw"].map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              className="tool__segment"
                              aria-pressed={keyMode === mode}
                              onClick={() => {
                                setKeyMode(mode);
                                setSecret("");
                              }}
                            >
                              {mode === "password" ? "Password" : "Raw key"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="tool__field">
                      <label className="tool__label" htmlFor="enc-secret">
                        {isCompat
                          ? "Secret — the same one the other tool used"
                          : keyMode === "password"
                            ? "Password"
                            : `Key — hex or base64, ${keyBits}-bit`}
                      </label>
                      <div className="tool__row tool__row--tight">
                        <input
                          id="enc-secret"
                          className="tool__input"
                          type={!isCompat && keyMode === "raw" ? "text" : "password"}
                          value={secret}
                          onChange={(e) => setSecret(e.target.value)}
                          autoComplete="off"
                          spellCheck="false"
                          placeholder={
                            isCompat
                              ? `Used directly as the key — ${keyBits / 8} bytes, padded or trimmed`
                              : keyMode === "password"
                                ? "A strong passphrase"
                                : `${keyBits / 4} hex chars`
                          }
                        />
                        {!isCompat && keyMode === "raw" && (
                          <ActionButton onClick={() => setSecret(randomKeyHex(keyBits))}>Generate</ActionButton>
                        )}
                      </div>
                    </div>
                    {isCompat ? (
                      <p className="encrypt__note">
                        The IV is a fixed block of zeroes, matching the other tool — so the same text
                        and secret always produce the same ciphertext.
                      </p>
                    ) : (
                      algo.ivBytes > 0 && (
                        <p className="encrypt__note">
                          The IV / nonce is generated per message and stored in the payload — nothing
                          to manage.
                        </p>
                      )
                    )}
                  </>
                ) : (
                  <>
                    <div className="tool__row tool__row--tight">
                      <label className="tool__field tool__field--inline">
                        <span className="tool__label">OAEP hash</span>
                        <select
                          className="tool__select"
                          value={rsa.hash}
                          onChange={(e) => setRsa((r) => ({ ...r, hash: e.target.value }))}
                        >
                          {RSA_HASHES.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </label>
                      <ActionButton onClick={generateKeys} disabled={busy}>
                        Generate key pair
                      </ActionButton>
                    </div>
                    <ToolField
                      label="Public key — SPKI base64 (for Encrypt)"
                      value={rsa.publicKey}
                      onChange={(v) => setRsa((r) => ({ ...r, publicKey: v }))}
                      mono
                      rows={3}
                      placeholder="Paste a public key, or generate a pair"
                    />
                    <ToolField
                      label="Private key — PKCS#8 base64 (for Decrypt)"
                      value={rsa.privateKey}
                      onChange={(v) => setRsa((r) => ({ ...r, privateKey: v }))}
                      mono
                      rows={3}
                      placeholder="Paste a private key, or generate a pair"
                    />
                  </>
                )}
              </m.div>
            </AnimatePresence>
          </div>
        </>
      }
      input={
        <ToolField
          label={isCompat ? "Input — text, or base64 ciphertext" : "Input — text, or TUC1. payload"}
          value={io.input}
          onChange={io.setInput}
          mono
          placeholder="Text to encrypt…"
          onClear={io.clearInput}
        />
      }
      controls={
        <>
          <ActionButton variant="solid" onClick={() => run("encrypt")} disabled={busy}>
            {busy ? "Working…" : "Encrypt"}
          </ActionButton>
          <ActionButton onClick={() => run("decrypt")} disabled={busy}>
            Decrypt
          </ActionButton>
        </>
      }
      message={<ToolMessage feedback={io.feedback} />}
      inputKey={io.inputKey}
      outputKey={io.outputKey}
      output={
        <ToolField
          label="Output"
          value={io.output}
          readOnly
          mono
          onCopy={io.copyOutput}
          onClear={io.clearOutput}
        />
      }
    />
  );
}
