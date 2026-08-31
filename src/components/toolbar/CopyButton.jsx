import ActionButton from "./ActionButton.jsx";
import "./CopyButton.css";

/**
 * Copy with a label that morphs between three faces (Copy / Copied / Copy
 * failed). All faces stay mounted and stacked so the button never resizes;
 * `data-status` cross-fades between them.
 */
export default function CopyButton({ status, disabled, onClick }) {
  return (
    <ActionButton
      variant="solid"
      onClick={onClick}
      disabled={disabled}
      aria-label="Copy text to clipboard"
    >
      <span className="copy-btn" data-status={status}>
        <span className="copy-btn__face copy-btn__face--idle">
          <ClipboardIcon />
          Copy
        </span>
        <span className="copy-btn__face copy-btn__face--copied">
          <CheckIcon />
          Copied
        </span>
        <span className="copy-btn__face copy-btn__face--error">Copy failed</span>
      </span>
    </ActionButton>
  );
}

function ClipboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
