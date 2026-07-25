import { describe, it, expect } from 'vitest';
import { autoScore, calculateAttemptScore } from './score-engine';
import { QuestionType, Difficulty } from '@core/models/enums';
import { QuestionResponse } from '@core/models/attempt.model';
import { Question } from '@core/models/question.model';

describe('autoScore', () => {
  const mcQuestion: Question = { id: 1, examId: 1, questionText: 'Test?', type: QuestionType.MULTIPLE_CHOICE, options: ['A', 'B', 'C', 'D'], correctAnswer: 1, difficulty: Difficulty.EASY, points: 10, status: { } as any, version: 1, createdAt: '', updatedAt: '' };

  it('should return full points for correct multiple choice answer', () => {
    const response: QuestionResponse = { questionId: 1, answer: '1', isCorrect: false, autoScore: 0, maxScore: 10 };
    const result = autoScore({ response, question: mcQuestion });
    expect(result.autoScore).toBe(10);
    expect(result.isCorrect).toBe(true);
  });

  it('should return 0 for wrong answer', () => {
    const response: QuestionResponse = { questionId: 1, answer: '2', isCorrect: false, autoScore: 0, maxScore: 10 };
    const result = autoScore({ response, question: mcQuestion });
    expect(result.autoScore).toBe(0);
    expect(result.isCorrect).toBe(false);
  });

  it('should return 0 for essay type', () => {
    const essayQ: Question = { ...mcQuestion, type: QuestionType.ESSAY, correctAnswer: 0 };
    const response: QuestionResponse = { questionId: 1, answer: 'some text', isCorrect: false, autoScore: 0, maxScore: 10 };
    const result = autoScore({ response, question: essayQ });
    expect(result.autoScore).toBe(0);
  });

  it('should return full points for correct true/false', () => {
    const tfQ: Question = { ...mcQuestion, type: QuestionType.TRUE_FALSE, correctAnswer: 1, points: 5 };
    const response: QuestionResponse = { questionId: 1, answer: '1', isCorrect: false, autoScore: 0, maxScore: 5 };
    const result = autoScore({ response, question: tfQ });
    expect(result.autoScore).toBe(5);
  });

  it('should respect existing manual score', () => {
    const response: QuestionResponse = { questionId: 1, answer: '1', isCorrect: false, autoScore: 0, maxScore: 10, manualScore: 8 };
    const result = autoScore({ response, question: mcQuestion });
    expect(result.autoScore).toBe(10);
  });
});

describe('calculateAttemptScore', () => {
  const questions: Question[] = [
    { id: 1, examId: 1, questionText: 'Q1', type: QuestionType.MULTIPLE_CHOICE, options: ['A', 'B'], correctAnswer: 0, difficulty: Difficulty.EASY, points: 10, status: { } as any, version: 1, createdAt: '', updatedAt: '' },
    { id: 2, examId: 1, questionText: 'Q2', type: QuestionType.TRUE_FALSE, options: ['T', 'F'], correctAnswer: 1, difficulty: Difficulty.MEDIUM, points: 5, status: { } as any, version: 1, createdAt: '', updatedAt: '' },
  ];

  it('should compute total and percentage for mixed answers', () => {
    const responses: QuestionResponse[] = [
      { questionId: 1, answer: '0', isCorrect: false, autoScore: 0, maxScore: 10 },
      { questionId: 2, answer: '1', isCorrect: false, autoScore: 0, maxScore: 5 },
    ];
    const result = calculateAttemptScore(responses, questions);
    expect(result.totalScore).toBe(15);
    expect(result.maxScore).toBe(15);
    expect(result.scorePercentage).toBe(100);
  });

  it('should use manualScore when present', () => {
    const responses: QuestionResponse[] = [
      { questionId: 1, answer: '0', isCorrect: false, autoScore: 0, maxScore: 10, manualScore: 7 },
    ];
    const result = calculateAttemptScore(responses, questions);
    expect(result.totalScore).toBe(7);
  });
});
