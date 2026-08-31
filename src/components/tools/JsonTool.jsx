import { useState } from "react";
import ActionButton from "../toolbar/ActionButton.jsx";
import { useToolIO } from "../../hooks/useToolIO.js";
import { formatJson, minifyJson, validateJson } from "../../lib/developer/json.js";
import { ToolField, ToolMessage, ToolLayout } from "./ToolParts.jsx";
import ValidateSeal from "./ValidateSeal.jsx";

const locate = (e) => (e.line ? `${e.message} — line ${e.line}, column ${e.column}` : e.message);

export default function JsonTool({ editorText }) {
  const io = useToolIO(editorText);
  // The envelope-seal result for Validate — success OR failure. null while the
  // plain Result field is showing; cleared by any other action.
  const [seal, setSeal] = useState(null);

  const apply = (fn, label) => {
    setSeal(null);
    const r = fn(io.input);
    if (r.ok) io.emit(r.value, label);
    else io.fail(locate(r.error));
  };

  const validate = () => {
    const r = validateJson(io.input);
    io.emit("", null);
    setSeal(
      r.ok
        ? { key: Date.now(), tone: "success", message: "Valid JSON" }
        : { key: Date.now(), tone: "error", message: locate(r.error) },
    );
  };

  return (
    <ToolLayout
      input={
        <ToolField
          label="JSON"
          value={io.input}
          onChange={(v) => {
            setSeal(null);
            io.setInput(v);
          }}
          mono
          placeholder='{"paste":"json here"}'
          rows={8}
          onClear={io.clearInput}
        />
      }
      controls={
        <>
          <ActionButton onClick={() => apply(formatJson, "Formatted")}>Format</ActionButton>
          <ActionButton onClick={() => apply((t) => minifyJson(t), "Minified")}>Minify</ActionButton>
          <ActionButton onClick={validate}>Validate</ActionButton>
        </>
      }
      message={<ToolMessage feedback={io.feedback} />}
      inputKey={io.inputKey}
      outputKey={seal ? `seal-${seal.key}` : io.outputKey}
      output={
        seal ? (
          <ValidateSeal tone={seal.tone} message={seal.message} />
        ) : (
          <ToolField
            label="Result"
            value={io.output}
            readOnly
            mono
            rows={8}
            onCopy={io.copyOutput}
            onClear={io.clearOutput}
          />
        )
      }
    />
  );
}
