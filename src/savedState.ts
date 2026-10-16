import { isGradeResult } from "./api/grade";
import type { GradeResult, Question, QuizAnswer } from "./types";

/**
 * Shape checks for what comes back from localStorage. A corrupted or hand-edited
 * entry is read again on every load, so a bad item is dropped instead of
 * crashing the quiz each time.
 */
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isString = (v: unknown): v is string => typeof v === "string";
const isOptions = (v: unknown) => isObject(v) && ["A", "B", "C", "D"].every((k) => isString(v[k]));

export function isSavedQuestion(v: unknown): v is Question {
  if (!isObject(v) || typeof v.id !== "number" || !isString(v.topic)) return false;
  if (v.type === "coding") {
    return isString(v.prompt) && isString(v.starterCode) && isString(v.referenceSolution) && Array.isArray(v.rubric) && v.rubric.every(isString);
  }
  return isString(v.question) && isOptions(v.options) && isString(v.correctAnswer);
}

export function isSavedAnswer(v: unknown): v is QuizAnswer {
  if (!isObject(v) || typeof v.questionId !== "number" || typeof v.isCorrect !== "boolean" || !isString(v.topic)) return false;
  if (v.kind === "coding") {
    return isString(v.prompt) && isString(v.code) && isString(v.referenceSolution) && (v.grade === undefined || isGradeResult(v.grade));
  }
  return isString(v.question) && isOptions(v.options) && isString(v.selectedAnswer) && isString(v.correctAnswer);
}

/** Keeps only the well-formed items of a saved list. */
export const validItems = <T>(v: unknown, isItem: (item: unknown) => item is T): T[] => (Array.isArray(v) ? v.filter(isItem) : []);

export const savedGrade = (v: unknown): GradeResult | null => (isGradeResult(v) ? v : null);
