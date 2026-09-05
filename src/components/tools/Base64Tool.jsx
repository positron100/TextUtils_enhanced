import ActionButton from "../toolbar/ActionButton.jsx";
import { useToolIO } from "../../hooks/useToolIO.js";
import { encodeBase64, decodeBase64 } from "../../lib/developer/base64.js";
import { ToolField, ToolMessage, ToolLayout } from "./ToolParts.jsx";

export default function Base64Tool({ editorText }) {
  const io = useToolIO(editorText);

  const encode = () => io.emit(encodeBase64(io.input), "Encoded");
  const decode = () => {
    const r = decodeBase64(io.input);
    if (r.ok) io.emit(r.value, "Decoded");
    else io.fail(r.error.message);
  };

  return (
    <ToolLayout
      input={
        <ToolField
          label="Text or Base64"
          value={io.input}
          onChange={io.setInput}
          mono
          placeholder="Text to encode, or Base64 to decode"
          onClear={io.clearInput}
        />
      }
      controls={
        <>
          <ActionButton onClick={encode}>Encode</ActionButton>
          <ActionButton onClick={decode}>Decode</ActionButton>
        </>
      }
      message={<ToolMessage feedback={io.feedback} />}
      inputKey={io.inputKey}
      outputKey={io.outputKey}
      output={
        <ToolField
          label="Result"
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
