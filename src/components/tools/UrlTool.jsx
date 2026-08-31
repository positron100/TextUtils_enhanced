import ActionButton from "../toolbar/ActionButton.jsx";
import { useToolIO } from "../../hooks/useToolIO.js";
import { urlEncode, urlDecode, componentEncode, componentDecode } from "../../lib/developer/url.js";
import { ToolField, ToolMessage, ToolLayout } from "./ToolParts.jsx";

export default function UrlTool({ editorText }) {
  const io = useToolIO(editorText);

  const encode = (fn, label) => io.emit(fn(io.input), label);
  const decode = (fn, label) => {
    const r = fn(io.input);
    if (r.ok) io.emit(r.value, label);
    else io.fail(r.error.message);
  };

  return (
    <ToolLayout
      hint={
        <p className="tool__hint">
          <strong>URL</strong> keeps <code>: / ? # &amp; =</code> — for a whole address.{" "}
          <strong>Component</strong> encodes those too — for one query value.
        </p>
      }
      input={
        <ToolField
          label="URL or text"
          value={io.input}
          onChange={io.setInput}
          mono
          placeholder="https://example.com/a b?q=x"
          rows={7}
          onClear={io.clearInput}
        />
      }
      controls={
        <>
          <ActionButton onClick={() => encode(urlEncode, "URL encoded")}>Encode URL</ActionButton>
          <ActionButton onClick={() => decode(urlDecode, "URL decoded")}>Decode URL</ActionButton>
          <ActionButton onClick={() => encode(componentEncode, "Component encoded")}>Encode component</ActionButton>
          <ActionButton onClick={() => decode(componentDecode, "Component decoded")}>Decode component</ActionButton>
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
          rows={7}
          onCopy={io.copyOutput}
          onClear={io.clearOutput}
        />
      }
    />
  );
}
