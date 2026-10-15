/** Multiple-choice question. Older entries in quiz.json have no `type`. */
export interface McqQuestion {
  type?: 'mcq';
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  topic: string;
  difficulty: string;
}

export type CodingLanguage = 'javascript' | 'typescript' | 'tsx';

/** Live-coding task: write code in the editor, then compare with the reference solution. */
export interface CodingQuestion {
  type: 'coding';
  id: number;
  prompt: string;
  language: CodingLanguage;
  starterCode: string;
  referenceSolution: string;
  /** What a good solution must do; shown with the reference solution. */
  rubric: string[];
  topic: string;
  difficulty: string;
}

export type Question = McqQuestion | CodingQuestion;

export const isCodingQuestion = (q: Question): q is CodingQuestion => q.type === 'coding';

export interface QuizData {
  quiz: Question[];
}

/** Answer to a multiple-choice question. */
export interface UserAnswer {
  questionId: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  selectedAnswer: 'A' | 'B' | 'C' | 'D';
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  isCorrect: boolean;
  topic: string;
}

export type CodingVerdict = 'pass' | 'fail';

/** Result of a coding task (self-assessed for now). */
export interface CodingAnswer {
  kind: 'coding';
  questionId: number;
  prompt: string;
  code: string;
  referenceSolution: string;
  verdict: CodingVerdict;
  isCorrect: boolean;
  topic: string;
}

export type QuizAnswer = UserAnswer | CodingAnswer;

export const isCodingAnswer = (a: QuizAnswer): a is CodingAnswer => 'kind' in a && a.kind === 'coding';

export type QuizMode = 'all' | 'random';

/** Which question types a quiz includes. */
export type QuestionTypeFilter = 'all' | 'mcq' | 'coding';

export type Screen = 'welcome' | 'quiz' | 'results';
