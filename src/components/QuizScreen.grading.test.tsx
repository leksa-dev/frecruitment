import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { EditorView } from "@codemirror/view";
import QuizScreen from "./QuizScreen";
import ResultsScreen from "./ResultsScreen";
import type { CodingAnswer, CodingQuestion, GradeResult, QuizAnswer } from "../types";

const gradeSolution = vi.fn();
vi.mock("../api/grade", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/grade")>();
  return { ...actual, GRADER_URL: "https://grader.example/grade", gradeSolution: (...args: unknown[]) => gradeSolution(...args) };
});
const { GradeError } = await import("../api/grade");

const task: CodingQuestion = {
  id: 7,
  type: "coding",
  prompt: "Write a sum(a, b) function.",
  language: "typescript",
  starterCode: "export function sum(a: number, b: number) {\n}\n",
  referenceSolution: "export const sum = (a: number, b: number) => a + b;\n",
  rubric: ["Returns a + b"],
  topic: "TypeScript - Basics",
  difficulty: "easy",
};
const passGrade: GradeResult = { verdict: "pass", score: 95, feedback: "Correct and concise.", issues: [], criteria: [{ criterion: "Returns a + b", met: true }] };
const partialGrade: GradeResult = { verdict: "partial", score: 55, feedback: "Almost.", issues: ["Ignores b"], criteria: [{ criterion: "Returns a + b", met: false }] };

const renderQuiz = () => {
  const onComplete = vi.fn();
  render(<QuizScreen questions={[task]} onQuizComplete={onComplete} onReset={vi.fn()} />);
  return onComplete;
};

const typeInEditor = async (text: string) => {
  const content = await screen.findByLabelText("Your solution");
  const view = EditorView.findFromDOM(content)!;
  act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }));
};

describe("QuizScreen - AI grading", () => {
  beforeEach(() => {
    localStorage.clear();
    gradeSolution.mockReset();
  });

  it("checks the code with AI, shows the grade and uses it as the answer", async () => {
    gradeSolution.mockResolvedValue(passGrade);
    const onComplete = renderQuiz();
    await typeInEditor("export const sum = (a: number, b: number) => a + b;");
    expect(screen.queryByText("✓ Solved it")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Check with AI"));
    expect(await screen.findByText("Correct and concise.")).toBeInTheDocument();
    expect(screen.getByText("95/100")).toBeInTheDocument();
    expect(gradeSolution).toHaveBeenCalledWith(task, "export const sum = (a: number, b: number) => a + b;");

    fireEvent.click(screen.getByText("Finish Quiz"));
    const [answers] = onComplete.mock.calls[0] as [QuizAnswer[]];
    expect(answers[0]).toMatchObject({ kind: "coding", verdict: "pass", isCorrect: true, grade: passGrade });
  });

  it("treats a partial grade as not solved yet", async () => {
    gradeSolution.mockResolvedValue(partialGrade);
    const onComplete = renderQuiz();
    await typeInEditor("export const sum = (a: number) => a;");
    fireEvent.click(screen.getByText("Check with AI"));
    expect(await screen.findByText("Ignores b")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Finish Quiz"));
    expect((onComplete.mock.calls[0] as [QuizAnswer[]])[0][0]).toMatchObject({ verdict: "fail", isCorrect: false });
  });

  it("drops the grade when the code changes after checking", async () => {
    gradeSolution.mockResolvedValue(passGrade);
    renderQuiz();
    await typeInEditor("export const sum = (a: number, b: number) => a + b;");
    fireEvent.click(screen.getByText("Check with AI"));
    await screen.findByText("Correct and concise.");

    await typeInEditor("export const sum = () => 0;");
    expect(screen.queryByText("Correct and concise.")).not.toBeInTheDocument();
    expect(screen.getByText("Finish Quiz")).toBeDisabled();
  });

  it("falls back to self-assessment when the grader is unavailable or rate limited", async () => {
    gradeSolution.mockRejectedValue(new GradeError("Too many checks. Wait a minute and try again.", "rate_limited"));
    const onComplete = renderQuiz();
    await typeInEditor("export const sum = (a: number, b: number) => a + b;");
    fireEvent.click(screen.getByText("Check with AI"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many checks");
    fireEvent.click(screen.getByText("✓ Solved it"));
    fireEvent.click(screen.getByText("Finish Quiz"));
    const answer = (onComplete.mock.calls[0] as [QuizAnswer[]])[0][0] as CodingAnswer;
    expect(answer).toMatchObject({ verdict: "pass" });
    expect(answer.grade).toBeUndefined();
  });

  it("keeps the grade in the saved progress", async () => {
    gradeSolution.mockResolvedValue(passGrade);
    renderQuiz();
    await typeInEditor("export const sum = (a: number, b: number) => a + b;");
    fireEvent.click(screen.getByText("Check with AI"));
    await screen.findByText("Correct and concise.");
    expect(JSON.parse(localStorage.getItem("quiz-progress")!).codingDraft.grade).toEqual(passGrade);
  });
});

describe("ResultsScreen - AI grades", () => {
  it("shows the AI grade of unsolved tasks and how tasks were graded", () => {
    const answer: CodingAnswer = {
      kind: "coding",
      questionId: 7,
      prompt: task.prompt,
      code: "export const sum = (a: number) => a;",
      referenceSolution: task.referenceSolution,
      verdict: "fail",
      isCorrect: false,
      topic: task.topic,
      grade: partialGrade,
    };
    render(<ResultsScreen answers={[answer]} onRestart={vi.fn()} />);
    expect(screen.getByText(/Live coding:/)).toHaveTextContent("0 / 1 solved (AI-graded)");
    expect(screen.getByText("Ignores b")).toBeInTheDocument();
    expect(screen.getByText("55/100")).toBeInTheDocument();
  });
});
