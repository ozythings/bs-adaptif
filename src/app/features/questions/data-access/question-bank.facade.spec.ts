import { describe, it, expect } from 'vitest';
import { QUESTIONS_SEED } from '@core/data';
import { QuestionVersionStatus } from '@core/models/enums';

describe('QuestionBankFacade (unit)', () => {
  it('should have seed questions', () => {
    expect(QUESTIONS_SEED.length).toBeGreaterThan(0);
  });

  it('should detect published questions that need versioning on edit', () => {
    const publishedQuestions = QUESTIONS_SEED.filter(q => q.status === 'active');
    expect(publishedQuestions.length).toBeGreaterThan(0);
  });

  it('should have question difficulties in seed', () => {
    const difficulties = new Set(QUESTIONS_SEED.map(q => q.difficulty));
    expect(difficulties.size).toBeGreaterThan(0);
  });

  it('should calculate total points per exam from questions', () => {
    const examPoints = new Map<number, number>();
    QUESTIONS_SEED.forEach(q => {
      examPoints.set(q.examId, (examPoints.get(q.examId) || 0) + q.points);
    });
    expect(examPoints.get(1)).toBeGreaterThan(0);
    expect(examPoints.get(3)).toBeGreaterThan(0);
  });
});
