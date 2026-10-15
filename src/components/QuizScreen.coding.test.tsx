import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuizScreen from "./QuizScreen";
import ResultsScreen from "./ResultsScreen";
import type { CodingAnswer, CodingQuestion, McqQuestion, QuizAnswer, UserAnswer } from "../types";

const mcq: McqQuestion = {
  id: 1,
  question: "What is React?",
  options: { A: "Library", B: "Framework", C: "Language", D: "Tool" },
  correctAnswer: "A",
  explanation: "React is a library",
  topic: "React",
  difficulty: "easy",
};

const task: CodingQuestion = {
  id: 2,
  type: "coding",
  prompt: "Write a sum(a, b) function.",
  language: "typescript",
  starterCode: "export function sum(a: number, b: number) {\n}\n",
  referenceSolution: "export function sum(a: number, b: number) {\n  return a + b;\n}\n",
  rubric: ["Returns a + b"],
  topic: "TypeScript - Basics",
  difficulty: "easy",
};

const renderQuiz = (questions: (McqQuestion | CodingQuestion)[], onQuizComplete = vi.fn()) => {
  render(<QuizScreen questions={questions} onQuizComplete={onQuizComplete} onReset={vi.fn()} />);
  return onQuizComplete;
};

const editor = () => screen.findByLabelText("Your solution");

describe("QuizScreen - coding tasks", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the task with the starter code in a code editor", async () => {
    renderQuiz([task]);
    expect(screen.getByText("Write a sum(a, b) function.")).toBeInTheDocument();
    expect(await editor()).toHaveTextContent("export function sum(a: number, b: number) {");
    expect(screen.queryByText("Show Explanation")).not.toBeInTheDocument();
  });

  it("reveals the reference solution and rubric on demand", async () => {
    renderQuiz([task]);
    expect(screen.queryByText("Returns a + b")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Show reference solution"));
    expect(await screen.findByLabelText("Reference solution")).toHaveTextContent("return a + b;");
    expect(screen.getByText("Returns a + b")).toBeInTheDocument();
  });

  it("needs a self-assessment before moving on, and reports it as the answer", async () => {
    const onComplete = renderQuiz([task]);
    await editor();
    const finish = screen.getByText("Finish Quiz");
    expect(finish).toBeDisabled();

    fireEvent.click(screen.getByText("✓ Solved it"));
    expect(finish).toBeEnabled();
    fireEvent.click(finish);

    const [answers] = onComplete.mock.calls[0] as [QuizAnswer[]];
    expect(answers).toEqual([
      expect.objectContaining({ kind: "coding", questionId: 2, verdict: "pass", isCorrect: true, code: task.starterCode }),
    ]);
  });

  it("does not treat keys typed in the editor as quiz shortcuts", async () => {
    const onComplete = renderQuiz([mcq, task]);
    fireEvent.click(screen.getByText("Library"));
    fireEvent.click(screen.getByText("Next Question"));
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();

    const content = await editor();
    fireEvent.click(screen.getByText("✓ Solved it"));
    for (const key of ["Backspace", "Enter", " ", "a", "1"]) fireEvent.keyDown(content, { key });

    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("still navigates with Enter and Backspace outside the editor", async () => {
    const onComplete = renderQuiz([mcq, task]);
    fireEvent.click(screen.getByText("Library"));
    fireEvent.keyDown(document, { key: "Enter" });
    await editor();

    fireEvent.click(screen.getByText("✗ Not yet"));
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onComplete).toHaveBeenCalledWith([
      expect.objectContaining({ questionId: 1, isCorrect: true }),
      expect.objectContaining({ kind: "coding", verdict: "fail", isCorrect: false }),
    ]);
  });

  it("restores the coding draft when going back to a task", async () => {
    renderQuiz([task, mcq]);
    await editor();
    fireEvent.click(screen.getByText("✗ Not yet"));
    fireEvent.click(screen.getByText("Next Question"));
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Backspace" });
    await editor();
    expect(screen.getByText("✗ Not yet").className).toContain("selected");
  });
});

describe("ResultsScreen - coding tasks", () => {
  const right: UserAnswer = {
    questionId: 1,
    question: mcq.question,
    options: mcq.options,
    selectedAnswer: "A",
    correctAnswer: "A",
    explanation: mcq.explanation,
    isCorrect: true,
    topic: mcq.topic,
  };
  const failed: CodingAnswer = {
    kind: "coding",
    questionId: 2,
    prompt: task.prompt,
    code: "export function sum() {}",
    referenceSolution: task.referenceSolution,
    verdict: "fail",
    isCorrect: false,
    topic: task.topic,
  };

  it("scores multiple-choice and coding separately", () => {
    render(<ResultsScreen answers={[right, failed]} onRestart={vi.fn()} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("1 / 1 correct")).toBeInTheDocument();
    expect(screen.getByText(/Live coding:/)).toHaveTextContent("Live coding: 0 / 1 solved (self-assessed)");
  });

  it("lists unsolved tasks with the user's code and the reference solution", () => {
    render(<ResultsScreen answers={[failed]} onRestart={vi.fn()} />);
    expect(screen.queryByText(/% *$/)).not.toBeInTheDocument();
    expect(screen.getByText("export function sum() {}")).toBeInTheDocument();
    expect(screen.getByText(/return a \+ b;/)).toBeInTheDocument();
  });
});
