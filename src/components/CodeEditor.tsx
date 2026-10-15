import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import type { CodingLanguage } from "../types";

interface CodeEditorProps {
  value: string;
  language: CodingLanguage;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  ariaLabel: string;
}

const languageSupport = (language: CodingLanguage) =>
  javascript({ typescript: language !== "javascript", jsx: language === "tsx" });

/**
 * CodeMirror 6 editor. Loaded lazily (see CodingQuestion) so the main quiz
 * bundle stays small.
 */
export default function CodeEditor({ value, language, onChange, readOnly = false, ariaLabel }: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // One editor per mount; parent remounts (key) when the question changes.
  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          languageSupport(language),
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current?.(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, readOnly, ariaLabel]);

  // Outside changes (e.g. "Reset code") replace the document.
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={host} className={`code-editor${readOnly ? " read-only" : ""}`} />;
}
