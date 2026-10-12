import { describe, it, expect } from "vitest";
import quizData from "./quiz.json";

const LETTERS = ["A", "B", "C", "D"] as const;
const DIFFICULTIES = ["easy", "medium", "hard"];

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

    if (!isNonEmptyString(q.question)) {
      problems.push(`${label}: empty question`);
    } else {
      const key = normalizeQuestion(q.question);
      if (texts.has(key)) problems.push(`${label}: duplicate question text (same as id ${String(texts.get(key))})`);
      else texts.set(key, q.id);
    }

    const options = (q.options ?? {}) as Record<string, unknown>;
    const extraKeys = Object.keys(options).filter((k) => !(LETTERS as readonly string[]).includes(k));
    if (extraKeys.length) problems.push(`${label}: unexpected option keys ${extraKeys.join(", ")}`);
    for (const letter of LETTERS) {
      if (!isNonEmptyString(options[letter])) problems.push(`${label}: option ${letter} is empty`);
    }

    if (!(LETTERS as readonly unknown[]).includes(q.correctAnswer)) {
      problems.push(`${label}: correctAnswer must be one of A–D`);
    }
    if (!isNonEmptyString(q.explanation)) problems.push(`${label}: empty explanation`);
    if (!isNonEmptyString(q.topic)) problems.push(`${label}: empty topic`);
    if (!DIFFICULTIES.includes(q.difficulty as string)) {
      problems.push(`${label}: difficulty must be easy, medium or hard`);
    }
  });

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
});
