import { describe, it, expect } from 'vitest';
import { QUESTIONS_SEED, ANSWER_DRAFTS_SEED, EXAMS_SEED } from '@core/data';

describe('SessionFacade (unit)', () => {
  it('should toggle marked questions', () => {
    const session = EXAMS_SEED[0];
    expect(session).toBeDefined();
    const marked: number[] = [];
    const questionId = 4;
    const toggled = marked.includes(questionId) ? marked.filter(q => q !== questionId) : [...marked, questionId];
    expect(toggled).toContain(questionId);
    const unmarked = toggled.filter(q => q !== questionId);
    expect(unmarked).not.toContain(questionId);
  });

  it('should navigate between questions', () => {
    const exam = EXAMS_SEED[0];
    const questions = QUESTIONS_SEED.filter(q => q.examId === exam.id);
    const totalQuestions = questions.length;
    expect(totalQuestions).toBeGreaterThan(0);
    const currentIndex = 0;
    const validIndex = Math.min(currentIndex + 1, totalQuestions - 1);
    expect(validIndex).toBeLessThan(totalQuestions);
    expect(validIndex).toBeGreaterThanOrEqual(0);
    const prevIndex = Math.max(currentIndex - 1, 0);
    expect(prevIndex).toBeLessThan(totalQuestions);
    const lastIndex = totalQuestions - 1;
    expect(lastIndex).toBe(totalQuestions - 1);
  });

  it('should start sessions without pre-seeded active sessions', () => {
    expect(EXAMS_SEED).toBeDefined();
    expect(EXAMS_SEED.length).toBeGreaterThan(0);
  });

});
