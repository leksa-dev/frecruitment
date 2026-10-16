import { describe, it, expect, vi } from "vitest";
import { GradeError, gradeSolution } from "./grade";
import type { CodingQuestion, GradeResult } from "../types";

const task: CodingQuestion = {
  id: 355,
  type: "coding",
  prompt: "Implement sum.",
  language: "typescript",
  starterCode: "",
  referenceSolution: "SECRET reference",
  rubric: ["Returns a + b"],
  topic: "TS",
  difficulty: "easy",
};
const grade: GradeResult = { verdict: "partial", score: 60, feedback: "Close.", issues: ["Misses b"], criteria: [{ criterion: "Returns a + b", met: false }] };

const fetchReturning = (status: number, body: unknown) => vi.fn(async () => Response.json(body, { status })) as unknown as typeof fetch;

describe("gradeSolution", () => {
  it("sends only the task id and the code, and returns the grade", async () => {
    const fetchFn = fetchReturning(200, grade);
    expect(await gradeSolution(task, "const x = 1;", { url: "https://grader/grade", fetchFn })).toEqual(grade);
    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://grader/grade");
    expect(JSON.parse(init.body as string)).toEqual({ questionId: 355, userCode: "const x = 1;" });
  });

  it("classifies failures so the UI can fall back to self-assessment", async () => {
    const url = "https://grader/grade";
    await expect(gradeSolution(task, "x", { url, fetchFn: fetchReturning(429, { error: "Too many checks." }) })).rejects.toMatchObject({
      kind: "rate_limited",
      message: "Too many checks.",
    });
    await expect(gradeSolution(task, "x", { url, fetchFn: fetchReturning(413, { error: "Too long." }) })).rejects.toMatchObject({ kind: "rejected" });
    await expect(gradeSolution(task, "x", { url, fetchFn: fetchReturning(502, {}) })).rejects.toMatchObject({ kind: "unavailable" });
    await expect(gradeSolution(task, "x", { url, fetchFn: fetchReturning(200, { verdict: "great" }) })).rejects.toMatchObject({ kind: "unavailable" });
    const offline = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    await expect(gradeSolution(task, "x", { url, fetchFn: offline })).rejects.toBeInstanceOf(GradeError);
  });

  it("is unavailable when no grader URL is configured", async () => {
    await expect(gradeSolution(task, "x", { url: "" })).rejects.toMatchObject({ kind: "unavailable" });
  });
});
