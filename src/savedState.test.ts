import { describe, expect, it } from "vitest";
import { isGradeResult } from "./api/grade";
import { isSavedAnswer, isSavedQuestion, validItems } from "./savedState";

const mcq = { id: 1, question: "Q?", options: { A: "a", B: "b", C: "c", D: "d" }, correctAnswer: "A", explanation: "", topic: "T", difficulty: "easy" };
const grade = { verdict: "pass", score: 90, feedback: "Good.", issues: ["x"], criteria: [{ criterion: "c", met: true }] };

describe("saved state checks", () => {
  it("keeps well-formed questions and answers and drops the rest", () => {
    const coding = { id: 2, type: "coding", prompt: "P", starterCode: "", referenceSolution: "R", rubric: ["c"], topic: "T" };
    expect(validItems([mcq, null, 3, { id: "1" }, coding], isSavedQuestion)).toEqual([mcq, coding]);
    expect(validItems("not a list", isSavedQuestion)).toEqual([]);

    const answer = { questionId: 1, question: "Q?", options: mcq.options, selectedAnswer: "B", correctAnswer: "A", explanation: "", isCorrect: false, topic: "T" };
    const codingAnswer = { kind: "coding", questionId: 2, prompt: "P", code: "c", referenceSolution: "R", verdict: "pass", isCorrect: true, topic: "T", grade };
    expect(validItems([answer, null, codingAnswer, { ...codingAnswer, grade: { ...grade, issues: undefined } }], isSavedAnswer)).toEqual([answer, codingAnswer]);
  });

  it("rejects grades whose list items React could not render", () => {
    expect(isGradeResult(grade)).toBe(true);
    expect(isGradeResult({ ...grade, issues: [{ text: "x" }] })).toBe(false);
    expect(isGradeResult({ ...grade, criteria: ["c"] })).toBe(false);
  });
});
