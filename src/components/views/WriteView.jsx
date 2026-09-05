import { useCallback, useState } from "react";
import FindReplace from "../find-replace/FindReplace.jsx";
import Editor from "../editor/Editor.jsx";
import EditorSweep from "../editor/EditorSweep.jsx";
import StatBar from "../statistics/StatBar.jsx";
import Toolbar from "../toolbar/Toolbar.jsx";
import ActionRail from "../write/ActionRail.jsx";
import { useReducedMotion } from "../../hooks/useReducedMotion.js";

/**
 * The Write workspace: a wide two-region composition — editor on the left,
 * Transform/Clean rail on the right, full statistics beneath. Running any
 * action card-swipes the editor: the previous text slides off and the new
 * surface is revealed underneath (same motion as the primary views).
 */
export default function WriteView({ editor, stats, findOpen, onCloseFind, toolbar, commands, onRailRun }) {
  const { text, setText, textareaRef, clearing, flash, sweep } = editor;
  const reduce = useReducedMotion();
  const [highlight, setHighlight] = useState(null);
  const onHighlight = useCallback((next) => setHighlight(next), []);
  const hasText = text.length > 0;
  const untouched = !hasText && sweep.seq === 0;

  return (
    <div className="writeview">
      <div className="writeview__main">
        <h1 className="hero__kicker">A calm place to shape text</h1>

        <div className="writeview__editorwrap">
          <FindReplace
            open={findOpen}
            text={text}
            textareaRef={textareaRef}
            onCommit={editor.commit}
            onClose={onCloseFind}
            onHighlight={onHighlight}
          />
          <Editor
            value={text}
            onChange={setText}
            textareaRef={textareaRef}
            clearing={clearing}
            flash={flash}
            ghostActive={untouched}
            highlight={highlight}
          />
          <EditorSweep sweep={sweep} reduce={reduce} />
        </div>

        <Toolbar {...toolbar} />
        <StatBar stats={stats} />
      </div>

      <div className="writeview__rail">
        <ActionRail commands={commands} onRun={(command) => onRailRun(command)} disabled={!hasText} />
      </div>
    </div>
  );
}
