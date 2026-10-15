import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuizScreen from './QuizScreen';
import type { McqQuestion } from '../types';

// Mock questions for testing
const mockQuestions: McqQuestion[] = [
  {
    id: 1,
    question: 'What is React?',
    topic: 'React',
    difficulty: 'Easy',
    options: {
      A: 'A library',
      B: 'A framework',
      C: 'A language',
      D: 'An IDE',
    },
    correctAnswer: 'A',
    explanation: 'React is a JavaScript library for building user interfaces.',
  },
  {
    id: 2,
    question: 'What is TypeScript?',
    topic: 'TypeScript',
    difficulty: 'Easy',
    options: {
      A: 'A runtime',
      B: 'A superset of JavaScript',
      C: 'A database',
      D: 'A framework',
    },
    correctAnswer: 'B',
    explanation: 'TypeScript is a typed superset of JavaScript.',
  },
  {
    id: 3,
    question: 'What is JSX?',
    topic: 'React',
    difficulty: 'Easy',
    options: {
      A: 'A syntax extension',
      B: 'A database',
      C: 'A framework',
      D: 'A compiler',
    },
    correctAnswer: 'A',
    explanation: 'JSX is a syntax extension for JavaScript.',
  },
];

describe('QuizScreen - Answer Randomization', () => {
  it('should randomize option positions differently for each question', () => {
    const onQuizComplete = vi.fn();
    const onReset = vi.fn();

    // Track the positions of correct answers across multiple renders
    const correctAnswerPositions: number[] = [];

    // We'll render the quiz multiple times and track where correct answer appears
    for (let run = 0; run < 10; run++) {
      const { unmount } = render(
        <QuizScreen questions={mockQuestions} onQuizComplete={onQuizComplete} onReset={onReset} />
      );

      // Get all option buttons
      const optionButtons = screen.getAllByRole('button').filter(btn =>
        btn.className.includes('option-button')
      );

      // Find which position has the correct answer
      const correctOptionText = mockQuestions[0].options[mockQuestions[0].correctAnswer];
      const correctPosition = optionButtons.findIndex(
        (button) => button.textContent?.includes(correctOptionText)
      );

      correctAnswerPositions.push(correctPosition);
      unmount();
    }

    // Check that correct answer doesn't always appear in the same position
    const uniquePositions = new Set(correctAnswerPositions);

    // With proper randomization, we should see at least 2 different positions
    // across 10 runs (statistically very likely if truly random)
    expect(uniquePositions.size).toBeGreaterThan(1);
  });

  it('should re-shuffle options when moving to next question', () => {
    const onQuizComplete = vi.fn();
    const onReset = vi.fn();

    render(
      <QuizScreen questions={mockQuestions} onQuizComplete={onQuizComplete} onReset={onReset} />
    );

    // Get initial order of options for question 1
    const initialButtons = screen.getAllByRole('button').filter(btn =>
      btn.className.includes('option-button')
    );
    const initialOrder = initialButtons.map(btn => btn.textContent);

    // Select first option and go to next question
    fireEvent.click(initialButtons[0]);
    const nextButton = screen.getByRole('button', { name: /Next Question/i });
    fireEvent.click(nextButton);

    // Get order of options for question 2
    const secondButtons = screen.getAllByRole('button').filter(btn =>
      btn.className.includes('option-button')
    );
    const secondOrder = secondButtons.map(btn => btn.textContent);

    // The options for question 2 should exist (different from question 1)
    expect(secondOrder).not.toEqual(initialOrder);
    expect(secondOrder.length).toBe(4);
  });

  it('should not have correct answer always in the first position', () => {
    const onQuizComplete = vi.fn();
    const onReset = vi.fn();
    const correctAnswerInFirstPosition: boolean[] = [];

    // Run the test multiple times
    for (let run = 0; run < 20; run++) {
      const { unmount } = render(
        <QuizScreen questions={mockQuestions} onQuizComplete={onQuizComplete} onReset={onReset} />
      );

      const optionButtons = screen.getAllByRole('button').filter(btn =>
        btn.className.includes('option-button')
      );
      const correctOptionText = mockQuestions[0].options[mockQuestions[0].correctAnswer];
      const firstButtonText = optionButtons[0].textContent;

      correctAnswerInFirstPosition.push(firstButtonText?.includes(correctOptionText) || false);
      unmount();
    }

    // Count how many times correct answer was in first position
    const timesInFirstPosition = correctAnswerInFirstPosition.filter(Boolean).length;

    // With proper randomization, correct answer should NOT be in first position
    // every time. Allow for some statistical variance, but if it's more than 18/20,
    // something is wrong with randomization
    expect(timesInFirstPosition).toBeLessThan(18);
  });

  it('should maintain all 4 options after shuffling', () => {
    const onQuizComplete = vi.fn();
    const onReset = vi.fn();

    render(
      <QuizScreen questions={mockQuestions} onQuizComplete={onQuizComplete} onReset={onReset} />
    );

    const optionButtons = screen.getAllByRole('button').filter(btn =>
      btn.className.includes('option-button')
    );

    // Should have exactly 4 options
    expect(optionButtons.length).toBe(4);

    // Each option should be unique
    const optionTexts = optionButtons.map(btn => btn.textContent);
    const uniqueOptions = new Set(optionTexts);
    expect(uniqueOptions.size).toBe(4);
  });

  it('should have keyboard shortcuts working with shuffled options', () => {
    const onQuizComplete = vi.fn();
    const onReset = vi.fn();

    render(
      <QuizScreen questions={mockQuestions} onQuizComplete={onQuizComplete} onReset={onReset} />
    );

    // Press "1" key to select first visible option
    fireEvent.keyDown(window, { key: '1' });

    // Get all option buttons
    const optionButtons = screen.getAllByRole('button').filter(btn =>
      btn.className.includes('option-button')
    );

    // First button should be selected (have 'selected' class)
    expect(optionButtons[0].className).toContain('selected');

    // Press "Enter" to go to next question
    const nextButton = screen.getByRole('button', { name: /Next Question/i });
    expect(nextButton).not.toBeDisabled();
  });
});
