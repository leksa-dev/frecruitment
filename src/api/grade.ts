import type { CodingQuestion, GradeResult } from "../types";

export const GRADER_URL = import.meta.env.VITE_GRADER_URL ?? "";

/** Why grading did not produce a result; the UI falls back to self-assessment. */
export class GradeError extends Error {
  readonly kind: "unavailable" | "rate_limited" | "rejected";

  constructor(message: string, kind: GradeError["kind"]) {
    super(message);
    this.kind = kind;
  }
}

const VERDICTS = ["pass", "partial", "fail"];

function isGradeResult(value: unknown): value is GradeResult {
  const v = value as GradeResult;
  return (
    typeof v === "object" &&
    v !== null &&
    VERDICTS.includes(v.verdict) &&
    typeof v.score === "number" &&
    typeof v.feedback === "string" &&
    Array.isArray(v.issues) &&
    Array.isArray(v.criteria)
  );
}

/**
 * Sends the code to the grader Worker. Only the task id travels with it: the
 * Worker reads the task, rubric and reference solution from the published quiz.
 */
export async function gradeSolution(
  question: CodingQuestion,
  code: string,
  opts: { url?: string; fetchFn?: typeof fetch; timeoutMs?: number } = {},
): Promise<GradeResult> {
  const url = opts.url ?? GRADER_URL;
  if (!url) throw new GradeError("AI grading is not set up.", "unavailable");
  let res: Response;
  try {
    res = await (opts.fetchFn ?? fetch)(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, userCode: code }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
    });
  } catch {
    throw new GradeError("The AI grader is not reachable right now.", "unavailable");
  }
  const body: unknown = await res.json().catch(() => null);
  if (res.ok && isGradeResult(body)) return body;

  const message = (body as { error?: unknown } | null)?.error;
  const text = typeof message === "string" ? message : `The AI grader failed (HTTP ${res.status}).`;
  if (res.status === 429) throw new GradeError(text, "rate_limited");
  if (res.status === 400 || res.status === 404 || res.status === 413) throw new GradeError(text, "rejected");
  throw new GradeError(text, "unavailable");
}
