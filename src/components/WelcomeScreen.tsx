import { useState } from "react";
import quizData from "../quiz.json";
import { isCodingQuestion, type Question, type QuestionTypeFilter, type QuizMode } from "../types";

interface WelcomeScreenProps {
  onStartQuiz: (mode: QuizMode, topic?: string, type?: QuestionTypeFilter) => void;
}

const allQuestions = quizData.quiz as Question[];
const codingCount = allQuestions.filter(isCodingQuestion).length;

export default function WelcomeScreen({ onStartQuiz }: WelcomeScreenProps) {
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<QuestionTypeFilter>("all");

  // The type is only passed when it narrows the quiz.
  const startAll = (topic?: string) =>
    selectedType === "all" ? onStartQuiz("all", topic) : onStartQuiz("all", topic, selectedType);
  const startRandom = () =>
    selectedType === "all" ? onStartQuiz("random") : onStartQuiz("random", undefined, selectedType);

  const questionsOfType = allQuestions.filter(
    (q) => selectedType === "all" || (selectedType === "coding") === isCodingQuestion(q)
  );

  // Get unique topic prefixes (part before " - " or full name if no dash)
  const topicPrefixes = Array.from(
    new Set(
      questionsOfType.map((q) => {
        const dashIndex = q.topic.indexOf(" - ");
        return dashIndex !== -1 ? q.topic.substring(0, dashIndex) : q.topic;
      })
    )
  ).sort();

  return (
    <div className="welcome-screen">
      <h1>Frontend Engineer Quiz</h1>
      <p>Test your knowledge on React, JavaScript, TypeScript and more!</p>

      <div className="topic-selector">
        <label htmlFor="type-select">Question Type:</label>
        <select
          id="type-select"
          value={selectedType}
          onChange={(e) => {
            setSelectedType(e.target.value as QuestionTypeFilter);
            setSelectedTopic("all");
          }}
          className="topic-dropdown"
        >
          <option value="all">All Types</option>
          <option value="mcq">Multiple Choice</option>
          <option value="coding" disabled={codingCount === 0}>
            Live Coding ({codingCount})
          </option>
        </select>
      </div>

      <div className="topic-selector">
        <label htmlFor="topic-select">Filter by Topic:</label>
        <select
          id="topic-select"
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="topic-dropdown"
        >
          <option value="all">All Topics</option>
          {topicPrefixes.map((prefix) => (
            <option key={prefix} value={prefix}>
              {prefix}
            </option>
          ))}
        </select>
      </div>

      <div className="quiz-modes">
        <button
          className="mode-button"
          onClick={() =>
            startAll(selectedTopic === "all" ? undefined : selectedTopic)
          }
        >
          All Questions
          <span className="mode-description">
            {selectedTopic === "all"
              ? "All questions"
              : `All questions from ${selectedTopic}`}
          </span>
        </button>

        <button className="mode-button" onClick={startRandom}>
          Random Questions
          <span className="mode-description">25 random questions</span>
        </button>
      </div>
    </div>
  );
}
