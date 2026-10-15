import { lazy, Suspense, useState } from "react";
import type { CodingQuestion as CodingQuestionData, CodingVerdict } from "../types";

// CodeMirror lives in its own chunk, loaded the first time a coding task is shown.
const CodeEditor = lazy(() => import("./CodeEditor"));

interface CodingQuestionProps {
  question: CodingQuestionData;
  code: string;
  onCodeChange: (code: string) => void;
  verdict: CodingVerdict | null;
  onVerdict: (verdict: CodingVerdict) => void;
}

const LANGUAGE_LABELS = { javascript: "JavaScript", typescript: "TypeScript", tsx: "TSX" } as const;

export default function CodingQuestion({ question, code, onCodeChange, verdict, onVerdict }: CodingQuestionProps) {
  const [showSolution, setShowSolution] = useState(false);

  return (
    <div className="coding-question">
      <h2 className="question-text">{question.prompt}</h2>
      <p className="question-topic">
        {question.topic} · <span className="coding-language">{LANGUAGE_LABELS[question.language]}</span>
      </p>

      <Suspense fallback={<div className="code-editor loading">Loading editor…</div>}>
        <CodeEditor value={code} language={question.language} onChange={onCodeChange} ariaLabel="Your solution" />
      </Suspense>

      <div className="coding-actions">
        <button className="show-explanation-button" onClick={() => onCodeChange(question.starterCode)} disabled={code === question.starterCode}>
          Reset code
        </button>
        <button className="show-explanation-button" onClick={() => setShowSolution((s) => !s)}>
          {showSolution ? "Hide reference solution" : "Show reference solution"}
        </button>
      </div>

      {showSolution && (
        <div className="explanation-box reference-solution">
          <Suspense fallback={<pre>{question.referenceSolution}</pre>}>
            <CodeEditor value={question.referenceSolution} language={question.language} readOnly ariaLabel="Reference solution" />
          </Suspense>
          {question.rubric.length > 0 && (
            <>
              <strong>A good solution:</strong>
              <ul className="rubric">
                {question.rubric.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="self-assessment" role="group" aria-label="How did it go?">
        <button className={`option-button ${verdict === "pass" ? "selected" : ""}`} onClick={() => onVerdict("pass")}>
          ✓ Solved it
        </button>
        <button className={`option-button ${verdict === "fail" ? "selected" : ""}`} onClick={() => onVerdict("fail")}>
          ✗ Not yet
        </button>
      </div>
    </div>
  );
}
