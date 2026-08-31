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
  encrypt,
  decrypt,
  generateRsaKeyPair,
  randomKeyHex,
} from "../../lib/developer/crypto/index.js";

// Sensitive state (password, keys) lives only in this component and is dropped
// when the developer view / tool changes — DeveloperView unmounts on view
// change and SpatialSurface remounts the panel per tool.

export default function EncryptTool({ editorText }) {
  const [algorithmId, setAlgorithmId] = useState("AES-256-GCM");
  const [keyMode, setKeyMode] = useState("password"); // password | raw
  const [secret, setSecret] = useState("");
  const [rsa, setRsa] = useState({ publicKey: "", privateKey: "", hash: "SHA-256" });
  const [busy, setBusy] = useState(false);
  const io = useToolIO(editorText);

  const algo = useMemo(() => getAlgorithm(algorithmId), [algorithmId]);
  const isRsa = algo.kind === "asymmetric";
  const keyBits = algo.noble ? algo.noble.keyBytes * 8 : 256;

  const run = async (direction) => {
    setBusy(true);
    io.setFeedback(null);
    try {
      const result =
        direction === "encrypt"
          ? await encrypt(
              isRsa
                ? { algorithmId, plaintext: io.input, rsaPublicKey: rsa.publicKey, rsaHash: rsa.hash }
                : { algorithmId, keyMode, secret, plaintext: io.input },
            )
          : await decrypt(
              isRsa
                ? { payload: io.input, rsaPrivateKey: rsa.privateKey }
                : { payload: io.input, keyMode, secret },
            );
      io.emit(result, direction === "encrypt" ? "Encrypted — copy the payload to share it." : "Decrypted");
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
          never leave the page and nothing is logged. Authenticated ciphers (GCM, GCM-SIV,
          ChaCha20-Poly1305) also detect tampering. Passwords are stretched with PBKDF2. Output is a
          self-describing <code>TUC1.</code> payload.
        </p>
      }
      config={
        <>
          <div className="tool__row">
            <label className="tool__field tool__field--inline">
              <span className="tool__label">Algorithm</span>
              <AlgorithmSelect
                value={algorithmId}
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
                    <div className="tool__field">
                      <label className="tool__label" htmlFor="enc-secret">
                        {keyMode === "password" ? "Password" : `Key — hex or base64, ${keyBits}-bit`}
                      </label>
                      <div className="tool__row tool__row--tight">
                        <input
                          id="enc-secret"
                          className="tool__input"
                          type={keyMode === "password" ? "password" : "text"}
                          value={secret}
                          onChange={(e) => setSecret(e.target.value)}
                          autoComplete="off"
                          spellCheck="false"
                          placeholder={keyMode === "password" ? "A strong passphrase" : `${keyBits / 4} hex chars`}
                        />
                        {keyMode === "raw" && (
                          <ActionButton onClick={() => setSecret(randomKeyHex(keyBits))}>Generate</ActionButton>
                        )}
                      </div>
                    </div>
                    {algo.ivBytes > 0 && (
                      <p className="encrypt__note">
                        The IV / nonce is generated per message and stored in the payload — nothing to
                        manage.
                      </p>
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
          label="Input — plaintext to encrypt, or TUC1. payload to decrypt"
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
