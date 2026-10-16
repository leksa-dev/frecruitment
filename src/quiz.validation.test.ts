import { describe, it, expect } from "vitest";
import quizData from "./quiz.json";

const LETTERS = ["A", "B", "C", "D"] as const;
const DIFFICULTIES = ["easy", "medium", "hard"];
const LANGUAGES = ["javascript", "typescript", "tsx"];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** Lowercase, no whitespace or punctuation: catches copies that differ only in formatting. */
export const normalizeQuestion = (text: string) =>
  text.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");

/** Every problem found in the quiz data, one readable line each (empty = valid). */
export function findQuizProblems(quiz: unknown[]): string[] {
  const problems: string[] = [];
  const ids = new Map<unknown, number>();
  const texts = new Map<string, unknown>();

  quiz.forEach((raw, index) => {
    const q = (raw ?? {}) as Record<string, unknown>;
    const label = `question #${index} (id ${String(q.id)})`;

    if (!Number.isInteger(q.id) || (q.id as number) < 1) problems.push(`${label}: id must be a positive integer`);
    else if (ids.has(q.id)) problems.push(`${label}: duplicate id (also at #${ids.get(q.id)})`);
    else ids.set(q.id, index);

    const isCoding = q.type === "coding";
    if (q.type !== undefined && q.type !== "mcq" && !isCoding) problems.push(`${label}: type must be "mcq" or "coding"`);

    // MCQ questions are identified by `question`, coding tasks by `prompt`.
    const text = isCoding ? q.prompt : q.question;
    if (!isNonEmptyString(text)) {
      problems.push(`${label}: empty ${isCoding ? "prompt" : "question"}`);
    } else {
      const key = normalizeQuestion(text);
      if (texts.has(key)) problems.push(`${label}: duplicate question text (same as id ${String(texts.get(key))})`);
      else texts.set(key, q.id);
    }

    if (!isNonEmptyString(q.topic)) problems.push(`${label}: empty topic`);
    if (!DIFFICULTIES.includes(q.difficulty as string)) {
      problems.push(`${label}: difficulty must be easy, medium or hard`);
    }

    if (isCoding) problems.push(...codingProblems(q).map((p) => `${label}: ${p}`));
    else problems.push(...mcqProblems(q).map((p) => `${label}: ${p}`));
  });

  return problems;
}

function mcqProblems(q: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const options = (q.options ?? {}) as Record<string, unknown>;
  const extraKeys = Object.keys(options).filter((k) => !(LETTERS as readonly string[]).includes(k));
  if (extraKeys.length) problems.push(`unexpected option keys ${extraKeys.join(", ")}`);
  for (const letter of LETTERS) {
    if (!isNonEmptyString(options[letter])) problems.push(`option ${letter} is empty`);
  }

  if (!(LETTERS as readonly unknown[]).includes(q.correctAnswer)) {
    problems.push("correctAnswer must be one of A–D");
  }
  if (!isNonEmptyString(q.explanation)) problems.push("empty explanation");
  return problems;
}

/**
 * Same limits as the pipeline (learning-pipeline src/shared/question.ts CODING_LIMITS)
 * and the grader Worker: a task over them is skipped by the grader and rejected by the pipeline.
 */
const CODING_LIMITS = { prompt: 4000, code: 8000, criterion: 300, topic: 200, rubricItems: 8 };

function codingLimitProblems(q: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const tooLong = (field: string, value: unknown, max: number) => {
    if (typeof value === "string" && value.length > max) problems.push(`${field} longer than ${max} characters`);
  };
  tooLong("prompt", q.prompt, CODING_LIMITS.prompt);
  tooLong("starterCode", q.starterCode, CODING_LIMITS.code);
  tooLong("referenceSolution", q.referenceSolution, CODING_LIMITS.code);
  tooLong("topic", q.topic, CODING_LIMITS.topic);
  if (Array.isArray(q.rubric)) {
    if (q.rubric.length > CODING_LIMITS.rubricItems) problems.push(`rubric has more than ${CODING_LIMITS.rubricItems} criteria`);
    q.rubric.forEach((c, i) => tooLong(`rubric criterion ${i + 1}`, c, CODING_LIMITS.criterion));
  }
  return problems;
}

function codingProblems(q: Record<string, unknown>): string[] {
  const problems: string[] = codingLimitProblems(q);
  if (!LANGUAGES.includes(q.language as string)) problems.push("language must be javascript, typescript or tsx");
  if (typeof q.starterCode !== "string") problems.push("starterCode must be a string");
  if (!isNonEmptyString(q.referenceSolution)) problems.push("empty referenceSolution");
  if (!Array.isArray(q.rubric) || q.rubric.length === 0 || !q.rubric.every(isNonEmptyString)) {
    problems.push("rubric must be a non-empty list of criteria");
  }
  if ("options" in q || "correctAnswer" in q) problems.push("coding tasks have no options or correctAnswer");
  return problems;
}

const validQuestion = {
  id: 1,
  question: "What does a closure remember?",
  options: { A: "Its lexical scope", B: "Nothing", C: "The DOM", D: "The call stack" },
  correctAnswer: "A",
  explanation: "A closure keeps access to variables of the scope it was created in.",
  topic: "JavaScript",
  difficulty: "medium",
};

const validCodingTask = {
  id: 2,
  type: "coding",
  prompt: "Write a debounce(fn, ms) function.",
  language: "javascript",
  starterCode: "function debounce(fn, ms) {\n}\n",
  referenceSolution: "function debounce(fn, ms) {\n  let t;\n  return (...a) => {\n    clearTimeout(t);\n    t = setTimeout(() => fn(...a), ms);\n  };\n}\n",
  rubric: ["Resets the timer on every call", "Passes the latest arguments"],
  topic: "JavaScript - Timers",
  difficulty: "medium",
};

describe("quiz.json validation", () => {
  it("has no invalid or duplicate questions", () => {
    expect(findQuizProblems(quizData.quiz)).toEqual([]);
  });

  it("accepts a valid question", () => {
    expect(findQuizProblems([validQuestion])).toEqual([]);
  });

  it("flags duplicate ids", () => {
    const problems = findQuizProblems([validQuestion, { ...validQuestion, question: "Another question?" }]);
    expect(problems).toEqual([expect.stringMatching(/duplicate id/)]);
  });

  it("flags questions that differ only in case, spacing or punctuation", () => {
    const copy = { ...validQuestion, id: 2, question: "what  does a CLOSURE remember" };
    expect(findQuizProblems([validQuestion, copy])).toEqual([expect.stringMatching(/duplicate question text \(same as id 1\)/)]);
  });

  it("flags missing fields and out-of-range values", () => {
    const broken = {
      ...validQuestion,
      options: { A: "x", B: " ", C: "y", D: "z", E: "extra" },
      correctAnswer: "E",
      explanation: "",
      topic: undefined,
      difficulty: "expert",
    };
    const problems = findQuizProblems([broken]);
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/unexpected option keys E/),
        expect.stringMatching(/option B is empty/),
        expect.stringMatching(/correctAnswer/),
        expect.stringMatching(/empty explanation/),
        expect.stringMatching(/empty topic/),
        expect.stringMatching(/difficulty/),
      ]),
    );
  });

  it("accepts a valid coding task next to multiple-choice questions", () => {
    expect(findQuizProblems([validQuestion, validCodingTask, { ...validQuestion, id: 3, type: "mcq", question: "Q3?" }])).toEqual([]);
  });

  it("flags broken coding tasks", () => {
    const broken = { ...validCodingTask, prompt: " ", language: "python", starterCode: undefined, referenceSolution: "", rubric: [] };
    expect(findQuizProblems([broken])).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/empty prompt/),
        expect.stringMatching(/language/),
        expect.stringMatching(/starterCode/),
        expect.stringMatching(/empty referenceSolution/),
        expect.stringMatching(/rubric/),
      ]),
    );
  });

  it("flags coding tasks over the grader's size limits", () => {
    const huge = {
      ...validCodingTask,
      prompt: "x".repeat(4001),
      referenceSolution: "y".repeat(8001),
      rubric: Array.from({ length: 9 }, (_, i) => `Criterion ${i}`),
    };
    expect(findQuizProblems([huge])).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/prompt longer than 4000/),
        expect.stringMatching(/referenceSolution longer than 8000/),
        expect.stringMatching(/more than 8 criteria/),
      ]),
    );
  });

  it("flags unknown types and coding tasks carrying MCQ fields", () => {
    expect(findQuizProblems([{ ...validQuestion, type: "essay" }])).toEqual([expect.stringMatching(/type must be/)]);
    expect(findQuizProblems([{ ...validCodingTask, correctAnswer: "A" }])).toEqual([expect.stringMatching(/no options or correctAnswer/)]);
  });

  it("detects a coding task duplicating another one's prompt", () => {
    const copy = { ...validCodingTask, id: 3, prompt: "write a DEBOUNCE(fn, ms) function" };
    expect(findQuizProblems([validCodingTask, copy])).toEqual([expect.stringMatching(/duplicate question text \(same as id 2\)/)]);
  });
});
