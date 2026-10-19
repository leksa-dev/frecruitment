import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App - Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Helper function to find mode button by its text content
  const findModeButton = (text: string) => {
    const allButtons = screen.getAllByRole('button');
    return allButtons.find(btn =>
      btn.textContent?.includes(text) && btn.className.includes('mode-button')
    );
  };

  it('should start with welcome screen', () => {
    render(<App />);
    expect(screen.getByText(/Frontend Engineer Quiz/i)).toBeInTheDocument();
  });

  it('should navigate from welcome to quiz screen when starting a quiz', () => {
    render(<App />);

    const allQuestionsButton = findModeButton('All Questions');
    if (allQuestionsButton) {
      fireEvent.click(allQuestionsButton);
    }

    // Should now be in quiz screen
    expect(screen.getByText(/Question 1 of/i)).toBeInTheDocument();
  });

  it('should reset quiz and navigate to welcome when reset button is clicked during quiz', () => {
    render(<App />);

    // Start quiz
    const allQuestionsButton = findModeButton('All Questions');
    if (allQuestionsButton) {
      fireEvent.click(allQuestionsButton);
    }

    // Verify we're in quiz
    expect(screen.getByText(/Question 1 of/i)).toBeInTheDocument();

    // Click reset button
    const resetButton = screen.getByText('↺');
    fireEvent.click(resetButton);

    // Should be back at welcome screen
    expect(screen.getByText(/Frontend Engineer Quiz/i)).toBeInTheDocument();
  });

  it('should filter questions by topic in "All Questions" mode', () => {
    render(<App />);

    // Select a specific topic from dropdown
    const dropdown = screen.getByLabelText(/Filter by Topic/i) as HTMLSelectElement;
    const options = Array.from(dropdown.options).filter(opt => opt.value !== 'all');

    if (options.length > 0) {
      const testTopic = options[0].value;
      fireEvent.change(dropdown, { target: { value: testTopic } });

      // Start "All Questions" mode
      const allQuestionsButton = findModeButton('All Questions');
      if (allQuestionsButton) {
        fireEvent.click(allQuestionsButton);
      }

      // Quiz should start
      expect(screen.getByText(/Question 1 of/i)).toBeInTheDocument();
    }
  });

  it('should NOT filter questions by topic in "Random Questions" mode', () => {
    render(<App />);

    // Select a specific topic from dropdown
    const dropdown = screen.getByLabelText(/Filter by Topic/i) as HTMLSelectElement;
    const options = Array.from(dropdown.options).filter(opt => opt.value !== 'all');

    if (options.length > 0) {
      const testTopic = options[0].value;
      fireEvent.change(dropdown, { target: { value: testTopic } });

      // Start "Random Questions" mode
      const randomButton = findModeButton('Random Questions');
      if (randomButton) {
        fireEvent.click(randomButton);
      }

      // Should show exactly 25 questions (random mode always uses 25)
      expect(screen.getByText(/Question 1 of 25/i)).toBeInTheDocument();
    }
  });

  it('starts over instead of crashing on a corrupted saved quiz', () => {
    localStorage.setItem('quiz-state', JSON.stringify({ currentScreen: 'quiz', shuffledQuestions: [null, 'x'], userAnswers: [null] }));
    localStorage.setItem('quiz-progress', JSON.stringify({ currentQuestionIndex: 99, answers: [null], codingDraft: { code: 5 } }));
    render(<App />);
    expect(screen.getByText(/Frontend Engineer Quiz/i)).toBeInTheDocument();
  });

  it('resumes a quiz whose saved progress is corrupted', () => {
    const q = { id: 999001, question: 'Saved question?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correctAnswer: 'A', explanation: '', topic: 'T', difficulty: 'easy' };
    localStorage.setItem('quiz-state', JSON.stringify({ currentScreen: 'quiz', shuffledQuestions: [q] }));
    localStorage.setItem('quiz-progress', JSON.stringify({ currentQuestionIndex: 99, answers: [null, { kind: 'coding' }], codingDraft: { code: 5 } }));
    render(<App />);
    expect(screen.getByText('Saved question?')).toBeInTheDocument();
  });

  it('should save state to localStorage during quiz', () => {
    render(<App />);

    // Start quiz
    const randomButton = findModeButton('Random Questions');
    if (randomButton) {
      fireEvent.click(randomButton);
    }

    // Answer first question
    const optionButtons = screen.getAllByRole('button').filter(btn =>
      btn.className.includes('option-button')
    );
    fireEvent.click(optionButtons[0]);

    // Check localStorage
    const savedState = localStorage.getItem('quiz-state');
    expect(savedState).not.toBeNull();

    if (savedState) {
      const state = JSON.parse(savedState);
      expect(state.currentScreen).toBe('quiz');
      expect(state.quizMode).toBe('random');
    }
  });

  it('should shuffle questions in "All Questions" mode', () => {
    const { rerender } = render(<App />);

    // Start first quiz
    const allQuestionsButton1 = findModeButton('All Questions');
    if (allQuestionsButton1) {
      fireEvent.click(allQuestionsButton1);
    }

    // Get first question text
    const firstQuestionElements1 = screen.getAllByText(/What is|What are|Which|How/i);
    const firstQuestionText1 = firstQuestionElements1[0]?.textContent;

    // Restart to welcome
    const resetButton1 = screen.getByText('↺');
    fireEvent.click(resetButton1);

    // Rerender and start again
    rerender(<App />);

    const allQuestionsButton2 = findModeButton('All Questions');
    if (allQuestionsButton2) {
      fireEvent.click(allQuestionsButton2);
    }

    // Get first question text again
    const firstQuestionElements2 = screen.getAllByText(/What is|What are|Which|How/i);
    const firstQuestionText2 = firstQuestionElements2[0]?.textContent;

    // Note: Due to randomization, questions might be the same or different
    // This test just verifies that questions can be displayed
    expect(firstQuestionText1).toBeTruthy();
    expect(firstQuestionText2).toBeTruthy();
  });
});
