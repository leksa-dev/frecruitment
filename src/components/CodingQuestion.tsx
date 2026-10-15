import { lazy, Suspense, useState } from "react";
import GradePanel from "./GradePanel";
import PromptText from "./PromptText";
import { GRADER_URL, GradeError, gradeSolution } from "../api/grade";
import type { CodingQuestion as CodingQuestionData, CodingVerdict, GradeResult } from "../types";

// CodeMirror lives in its own chunk, loaded the first time a coding task is shown.
const CodeEditor = lazy(() => import("./CodeEditor"));

interface CodingQuestionProps {
  question: CodingQuestionData;
  code: string;
  onCodeChange: (code: string) => void;
  verdict: CodingVerdict | null;
  onVerdict: (verdict: CodingVerdict) => void;
  grade: GradeResult | null;
  onGrade: (grade: GradeResult) => void;
}

const LANGUAGE_LABELS = { javascript: "JavaScript", typescript: "TypeScript", tsx: "TSX" } as const;

export default function CodingQuestion({ question, code, onCodeChange, verdict, onVerdict, grade, onGrade }: CodingQuestionProps) {
  const [showSolution, setShowSolution] = useState(false);
  const [checking, setChecking] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  // Without a grader, or when it fails, the user assesses the solution themselves.
  const selfAssess = !GRADER_URL || gradeError !== null;

  const check = async () => {
    setChecking(true);
    setGradeError(null);
    try {
      onGrade(await gradeSolution(question, code));
    } catch (err) {
      setGradeError(err instanceof GradeError ? err.message : "The AI grader failed.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="coding-question">
      <p className="question-topic">
        {question.topic} · <span className="coding-language">{LANGUAGE_LABELS[question.language]}</span>
      </p>
      <PromptText text={question.prompt} />

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

      {GRADER_URL && (
        <button className="check-button" onClick={check} disabled={checking}>
          {checking ? "Checking…" : grade ? "Check again with AI" : "Check with AI"}
        </button>
      )}
      {gradeError && (
        <p className="grade-error" role="alert">
          {gradeError} Assess your solution yourself below.
        </p>
      )}
      {grade && <GradePanel grade={grade} />}

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

      {selfAssess && (
        <div className="self-assessment" role="group" aria-label="How did it go?">
          <button className={`option-button ${verdict === "pass" ? "selected" : ""}`} onClick={() => onVerdict("pass")}>
            ✓ Solved it
          </button>
          <button className={`option-button ${verdict === "fail" ? "selected" : ""}`} onClick={() => onVerdict("fail")}>
            ✗ Not yet
          </button>
        </div>
      )}
    </div>
  );
}
