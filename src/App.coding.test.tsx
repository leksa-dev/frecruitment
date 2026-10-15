import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

vi.mock("./quiz.json", () => ({
  default: {
    quiz: [
      {
        id: 1,
        question: "What is React?",
        options: { A: "Library", B: "Framework", C: "Language", D: "Tool" },
        correctAnswer: "A",
        explanation: "React is a library",
        topic: "React - Basics",
        difficulty: "easy",
      },
      {
        id: 2,
        type: "coding",
        prompt: "Write a useToggle hook.",
        language: "tsx",
        starterCode: "",
        referenceSolution: "export const useToggle = () => {};",
        rubric: ["Returns [value, toggle]"],
        topic: "React - Hooks",
        difficulty: "medium",
      },
    ],
  },
}));

const start = (label: string) =>
  fireEvent.click(screen.getAllByRole("button").find((b) => b.className.includes("mode-button") && b.textContent?.includes(label))!);

describe("App - question type filter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts a quiz with only coding tasks", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Question Type/i), { target: { value: "coding" } });
    start("All Questions");
    expect(screen.getByText("Question 1 of 1")).toBeInTheDocument();
    expect(screen.getByText("Write a useToggle hook.")).toBeInTheDocument();
  });

  it("starts a quiz with only multiple-choice questions", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Question Type/i), { target: { value: "mcq" } });
    start("Random Questions");
    expect(screen.getByText("Question 1 of 1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("What is React?");
  });

  it("includes both types by default and counts coding tasks in the type picker", () => {
    render(<App />);
    expect(screen.getByRole("option", { name: "Live Coding (1)" })).toBeEnabled();
    start("All Questions");
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
  });

  it("restores a quiz in progress with the current text of its questions", () => {
    const stale = { id: 2, type: "coding", prompt: "OLD wording of the task", language: "tsx", starterCode: "", referenceSolution: "x", rubric: ["x"], topic: "React - Hooks", difficulty: "medium" };
    const removed = { ...stale, id: 99, prompt: "A task that was removed from quiz.json" };
    localStorage.setItem("quiz-state", JSON.stringify({ currentScreen: "quiz", quizMode: "all", userAnswers: [], shuffledQuestions: [stale, removed] }));
    render(<App />);
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Write a useToggle hook.")).toBeInTheDocument();
    expect(screen.queryByText("OLD wording of the task")).not.toBeInTheDocument();
  });
});
