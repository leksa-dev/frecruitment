import type { GradeResult } from "../types";

const VERDICT_LABELS = { pass: "Pass", partial: "Partially correct", fail: "Not yet" } as const;

/** The AI grader's verdict, score, feedback, issues and rubric checklist. */
export default function GradePanel({ grade }: { grade: GradeResult }) {
  return (
    <div className={`grade-result grade-${grade.verdict}`} aria-label="AI grade">
      <div className="grade-header">
        <span className="grade-verdict">{VERDICT_LABELS[grade.verdict]}</span>
        <span className="grade-score">{grade.score}/100</span>
      </div>
      <p className="grade-feedback">{grade.feedback}</p>
      {grade.issues.length > 0 && (
        <ul className="grade-issues">
          {grade.issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      )}
      {grade.criteria.length > 0 && (
        <ul className="grade-criteria">
          {grade.criteria.map((c, i) => (
            <li key={i} className={c.met ? "met" : "unmet"}>
              {c.met ? "✓" : "✗"} {c.criterion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
