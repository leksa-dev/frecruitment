import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import CodingQuestion from "./CodingQuestion";
import {
  isCodingAnswer,
  isCodingQuestion,
  type CodingVerdict,
  type McqQuestion,
  type Question,
  type QuizAnswer,
} from "../types";

interface QuizScreenProps {
  questions: Question[];
  onQuizComplete: (answers: QuizAnswer[]) => void;
  onReset: () => void;
}

const QUIZ_PROGRESS_KEY = "quiz-progress";

/** Work in progress on the current coding task. */
interface CodingDraft {
  code: string;
  verdict: CodingVerdict | null;
}

interface QuizProgress {
  currentQuestionIndex: number;
  answers: QuizAnswer[];
  selectedAnswer: string | null;
  codingDraft?: CodingDraft | null;
}

type OptionKey = "A" | "B" | "C" | "D";

/** Keys typed into the code editor (or any text field) are not quiz shortcuts. */
const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.closest(".cm-editor") !== null);

export default function QuizScreen({
  questions,
  onQuizComplete,
  onReset,
}: QuizScreenProps) {
  // Load saved progress
  const loadProgress = (): QuizProgress | null => {
    try {
      const saved = localStorage.getItem(QUIZ_PROGRESS_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const savedProgress = loadProgress();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    savedProgress?.currentQuestionIndex || 0
  );
  const [selectedAnswer, setSelectedAnswer] = useState<OptionKey | null>(
    (savedProgress?.selectedAnswer as OptionKey) || null
  );
  const [answers, setAnswers] = useState<QuizAnswer[]>(
    savedProgress?.answers || []
  );
  const [codingDraft, setCodingDraft] = useState<CodingDraft | null>(
    savedProgress?.codingDraft ?? null
  );
  const [showExplanation, setShowExplanation] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const codingQuestion = isCodingQuestion(currentQuestion) ? currentQuestion : null;
  const code = codingDraft?.code ?? codingQuestion?.starterCode ?? "";
  const canAdvance = codingQuestion ? codingDraft?.verdict != null : selectedAnswer !== null;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Shuffle options for current question
  // We want to re-shuffle every time the question changes
  const shuffledOptions = useMemo(() => {
    const optionKeys: OptionKey[] = ["A", "B", "C", "D"];
    const shuffled = [...optionKeys].sort(() => Math.random() - 0.5);
    return shuffled;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex]);

  const handleAnswerSelect = (answer: "A" | "B" | "C" | "D") => {
    setSelectedAnswer(answer);
  };

  const handleNext = useCallback(() => {
    let newAnswer: QuizAnswer;
    if (isCodingQuestion(currentQuestion)) {
      if (!codingDraft?.verdict) return;
      newAnswer = {
        kind: "coding",
        questionId: currentQuestion.id,
        prompt: currentQuestion.prompt,
        code: codingDraft.code,
        referenceSolution: currentQuestion.referenceSolution,
        verdict: codingDraft.verdict,
        isCorrect: codingDraft.verdict === "pass",
        topic: currentQuestion.topic,
      };
    } else {
      if (!selectedAnswer) return;
      newAnswer = {
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        options: currentQuestion.options,
        selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
        isCorrect: selectedAnswer === currentQuestion.correctAnswer,
        topic: currentQuestion.topic,
      };
    }

    setAnswers((prevAnswers) => {
      const updatedAnswers = [...prevAnswers, newAnswer];

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
        setCodingDraft(null);
        setShowExplanation(false);
      } else {
        onQuizComplete(updatedAnswers);
      }

      return updatedAnswers;
    });
  }, [
    selectedAnswer,
    codingDraft,
    currentQuestion,
    currentQuestionIndex,
    questions.length,
    onQuizComplete,
  ]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowExplanation(false);

      // Restore previous answer if exists
      setAnswers((prevAnswers) => {
        if (prevAnswers.length > 0) {
          const previousAnswer = prevAnswers[prevAnswers.length - 1];
          if (isCodingAnswer(previousAnswer)) {
            setSelectedAnswer(null);
            setCodingDraft({ code: previousAnswer.code, verdict: previousAnswer.verdict });
          } else {
            setSelectedAnswer(previousAnswer.selectedAnswer);
            setCodingDraft(null);
          }
          return prevAnswers.slice(0, -1); // Remove last answer
        }
        setSelectedAnswer(null);
        setCodingDraft(null);
        return prevAnswers;
      });
    }
  }, [currentQuestionIndex]);

  // Save progress to localStorage
  useEffect(() => {
    const progress: QuizProgress = {
      currentQuestionIndex,
      answers,
      selectedAnswer,
      codingDraft,
    };
    localStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(progress));
  }, [currentQuestionIndex, answers, selectedAnswer, codingDraft]);

  // Clear progress when quiz completes
  useEffect(() => {
    return () => {
      if (
        currentQuestionIndex === questions.length - 1 &&
        answers.length === questions.length
      ) {
        localStorage.removeItem(QUIZ_PROGRESS_KEY);
      }
    };
  }, [currentQuestionIndex, answers.length, questions.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();

      // Coding tasks have no options or explanation: only Enter and Backspace apply.
      if (codingQuestion) {
        if (key === "enter") handleNext();
        else if (key === "backspace") {
          event.preventDefault();
          handlePrevious();
        }
        return;
      }

      // A, B, C, D or 1, 2, 3, 4 to select answer based on screen position
      if (key === "a" || key === "1") {
        setSelectedAnswer(shuffledOptions[0]); // First option on screen
      } else if (key === "b" || key === "2") {
        setSelectedAnswer(shuffledOptions[1]); // Second option on screen
      } else if (key === "c" || key === "3") {
        setSelectedAnswer(shuffledOptions[2]); // Third option on screen
      } else if (key === "d" || key === "4") {
        setSelectedAnswer(shuffledOptions[3]); // Fourth option on screen
      }
      // Enter to go to next question
      else if (key === "enter") {
        handleNext();
      }
      // Space to toggle explanation
      else if (key === " ") {
        event.preventDefault(); // Prevent page scroll
        setShowExplanation((prev) => !prev);
      }
      // Backspace to go to previous question
      else if (key === "backspace") {
        event.preventDefault();
        handlePrevious();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleNext, handlePrevious, shuffledOptions, codingQuestion]);

  return (
    <div className="quiz-screen">
      <div className="quiz-header">
        <div className="progress-bar-container">
          <button
            className="previous-button-small"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            title="Previous question (Backspace)"
          >
            ←
          </button>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <button
            className="reset-button-small"
            onClick={onReset}
            title="Reset quiz"
          >
            ↺
          </button>
        </div>
        <p className="question-counter">
          Question {currentQuestionIndex + 1} of {questions.length}
        </p>
      </div>

      <div className="question-container">
        {isCodingQuestion(currentQuestion) ? (
          <>
            <CodingQuestion
              key={currentQuestion.id}
              question={currentQuestion}
              code={code}
              onCodeChange={(next) => setCodingDraft((d) => ({ code: next, verdict: d?.verdict ?? null }))}
              verdict={codingDraft?.verdict ?? null}
              onVerdict={(verdict) => setCodingDraft((d) => ({ code: d?.code ?? currentQuestion.starterCode, verdict }))}
            />
            <NextButton disabled={!canAdvance} isLast={currentQuestionIndex === questions.length - 1} onClick={handleNext} />
          </>
        ) : (
          <McqBody
            question={currentQuestion}
            shuffledOptions={shuffledOptions}
            selectedAnswer={selectedAnswer}
            onSelect={handleAnswerSelect}
            showExplanation={showExplanation}
            onToggleExplanation={() => setShowExplanation(!showExplanation)}
            next={<NextButton disabled={!canAdvance} isLast={currentQuestionIndex === questions.length - 1} onClick={handleNext} />}
          />
        )}
      </div>
    </div>
  );
}

function NextButton({ disabled, isLast, onClick }: { disabled: boolean; isLast: boolean; onClick: () => void }) {
  return (
    <button className="next-button" onClick={onClick} disabled={disabled}>
      {isLast ? "Finish Quiz" : "Next Question"}
    </button>
  );
}

function McqBody({
  question,
  shuffledOptions,
  selectedAnswer,
  onSelect,
  showExplanation,
  onToggleExplanation,
  next,
}: {
  question: McqQuestion;
  shuffledOptions: OptionKey[];
  selectedAnswer: OptionKey | null;
  onSelect: (key: OptionKey) => void;
  showExplanation: boolean;
  onToggleExplanation: () => void;
  next: ReactNode;
}) {
  return (
    <>
      <h2 className="question-text">{question.question}</h2>
      <p className="question-topic">{question.topic}</p>

      <div className="options">
        {shuffledOptions.map((key) => (
          <button
            key={key}
            className={`option-button ${selectedAnswer === key ? "selected" : ""}`}
            onClick={() => onSelect(key)}
          >
            <span className="option-text">{question.options[key]}</span>
          </button>
        ))}
      </div>

      {next}

      {showExplanation && (
        <div className="correct-answer-hint">
          <strong>Correct Answer:</strong> {question.options[question.correctAnswer]}
        </div>
      )}

      <button className="show-explanation-button" onClick={onToggleExplanation}>
        {showExplanation ? "Hide Explanation" : "Show Explanation"}
      </button>

      {showExplanation && (
        <div className="explanation-box">
          <p className="explanation-text">{question.explanation}</p>
        </div>
      )}
    </>
  );
}
