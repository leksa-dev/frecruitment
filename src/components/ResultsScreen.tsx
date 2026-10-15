import { isCodingAnswer, type CodingAnswer, type QuizAnswer, type UserAnswer } from "../types";

interface ResultsScreenProps {
  answers: QuizAnswer[];
  onRestart: () => void;
  isRandomMode?: boolean;
}

export default function ResultsScreen({
  answers: allAnswers,
  onRestart,
  isRandomMode = false,
}: ResultsScreenProps) {
  // Coding tasks are scored separately from the multiple-choice questions.
  const answers = allAnswers.filter((a): a is UserAnswer => !isCodingAnswer(a));
  const codingAnswers = allAnswers.filter((a): a is CodingAnswer => isCodingAnswer(a));
  const solvedTasks = codingAnswers.filter((a) => a.isCorrect).length;
  const unsolvedTasks = codingAnswers.filter((a) => !a.isCorrect);
  const hasMcq = answers.length > 0;

  const correctAnswers = answers.filter((a) => a.isCorrect).length;
  const totalQuestions = answers.length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const wrongAnswers = answers.filter((a) => !a.isCorrect);

  // Calculate topics needing review (>20% wrong)
  const topicStats = answers.reduce((acc, answer) => {
    const topic = answer.topic;
    if (!acc[topic]) {
      acc[topic] = { total: 0, wrong: 0 };
    }
    acc[topic].total += 1;
    if (!answer.isCorrect) {
      acc[topic].wrong += 1;
    }
    return acc;
  }, {} as Record<string, { total: number; wrong: number }>);

  const topicsNeedingReview = Object.entries(topicStats)
    .filter(([, stats]) => (stats.wrong / stats.total) > 0.2)
    .map(([topic, stats]) => ({
      topic,
      wrongPercentage: Math.round((stats.wrong / stats.total) * 100),
      wrongCount: stats.wrong,
      totalCount: stats.total,
    }))
    .sort((a, b) => b.wrongPercentage - a.wrongPercentage);

  const getScoreMessage = () => {
    if (percentage >= 90) return "🎉 Excellent! You really know your stuff!";
    if (percentage >= 70) return "👍 Great job! Solid knowledge!";
    if (percentage >= 50) return "👌 Good effort! Keep learning!";
    return "📚 Keep studying! Practice makes perfect!";
  };

  const exportWrongAnswers = () => {
    let text = `Frontend Engineer Quiz - Review Sheet\n`;
    text += `Score: ${correctAnswers}/${totalQuestions} (${percentage}%)\n`;
    text += `Incorrect Answers: ${wrongAnswers.length}\n`;
    text += `Date: ${new Date().toLocaleDateString()}\n`;
    text += `\n${'='.repeat(80)}\n\n`;

    if (codingAnswers.length > 0) {
      text += `Live coding: ${solvedTasks}/${codingAnswers.length} solved (self-assessed)\n\n`;
    }

    wrongAnswers.forEach((answer, index) => {
      text += `Question ${index + 1}:\n`;
      text += `${answer.question}\n\n`;
      text += `Your Answer (${answer.selectedAnswer}): ${answer.options[answer.selectedAnswer]}\n`;
      text += `Correct Answer (${answer.correctAnswer}): ${answer.options[answer.correctAnswer]}\n\n`;
      text += `Explanation:\n${answer.explanation}\n`;
      text += `\n${'-'.repeat(80)}\n\n`;
    });

    unsolvedTasks.forEach((task, index) => {
      text += `Coding task ${index + 1}:\n${task.prompt}\n\n`;
      text += `Your code:\n${task.code}\n\n`;
      text += `Reference solution:\n${task.referenceSolution}\n`;
      text += `\n${'-'.repeat(80)}\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-review-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="results-screen">
      <div className="results-summary">
        <h1>Quiz Complete!</h1>
        {hasMcq && (
          <>
            <div className="score-circle">
              <div className="percentage">{percentage}%</div>
              <div className="score-text">
                {correctAnswers} / {totalQuestions} correct
              </div>
            </div>
            <p className="score-message">{getScoreMessage()}</p>
          </>
        )}
        {codingAnswers.length > 0 && (
          <p className="coding-score">
            Live coding: <strong>{solvedTasks} / {codingAnswers.length}</strong> solved (self-assessed)
          </p>
        )}
      </div>

      {!isRandomMode && topicsNeedingReview.length > 0 && (
        <div className="topics-review-section">
          <h2>Topics Needing Review</h2>
          <p className="topics-review-description">
            Topics where you got more than 20% of questions wrong:
          </p>
          <div className="topics-review-list">
            {topicsNeedingReview.map((topic) => (
              <div key={topic.topic} className="topic-review-item">
                <div className="topic-review-header">
                  <span className="topic-name">{topic.topic}</span>
                  <span className="topic-stats">
                    {topic.wrongCount}/{topic.totalCount} wrong ({topic.wrongPercentage}%)
                  </span>
                </div>
                <div className="topic-progress-bar">
                  <div
                    className="topic-progress-fill"
                    style={{ width: `${topic.wrongPercentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(wrongAnswers.length > 0 || unsolvedTasks.length > 0) && (
        <div className="wrong-answers-section">
          <div className="wrong-answers-header">
            <h2>Review Incorrect Answers ({wrongAnswers.length + unsolvedTasks.length})</h2>
            <button className="export-button" onClick={exportWrongAnswers}>
              📄 Export to Text File
            </button>
          </div>
          <div className="wrong-answers-list">
            {wrongAnswers.map((answer, index) => (
              <div key={answer.questionId} className="wrong-answer-item">
                <div className="wrong-answer-header">
                  <span className="wrong-answer-number">
                    Question #{index + 1}
                  </span>
                </div>
                <p className="wrong-answer-question">{answer.question}</p>
                <div className="answer-comparison">
                  <div className="your-answer incorrect">
                    <strong>Your Answer ({answer.selectedAnswer}):</strong> {answer.options[answer.selectedAnswer]}
                  </div>
                  <div className="correct-answer">
                    <strong>Correct Answer ({answer.correctAnswer}):</strong> {answer.options[answer.correctAnswer]}
                  </div>
                </div>
                <div className="explanation">
                  <strong>Explanation:</strong> {answer.explanation}
                </div>
              </div>
            ))}
            {unsolvedTasks.map((task) => (
              <div key={`coding-${task.questionId}`} className="wrong-answer-item coding-review">
                <p className="wrong-answer-question">{task.prompt}</p>
                <div className="answer-comparison">
                  <div className="your-answer incorrect">
                    <strong>Your code:</strong>
                    <pre>{task.code}</pre>
                  </div>
                  <div className="correct-answer">
                    <strong>Reference solution:</strong>
                    <pre>{task.referenceSolution}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasMcq && wrongAnswers.length === 0 && (
        <div className="perfect-score">
          <h2>🌟 Perfect Score! 🌟</h2>
          <p>You answered all questions correctly!</p>
        </div>
      )}

      <button className="restart-button" onClick={onRestart}>
        Start New Quiz
      </button>
    </div>
  );
}
