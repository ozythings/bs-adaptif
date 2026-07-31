import { describe, it, expect } from 'vitest';
import { ATTEMPTS_SEED, RUBRICS_SEED } from '@core/data';
import { ResultStatus } from '@core/models/enums';

describe('GradingFacade (unit)', () => {
  it('should have attempts awaiting grading', () => {
    const draft = ATTEMPTS_SEED.filter(a => a.status === ResultStatus.DRAFT);
    expect(draft.length).toBeGreaterThan(0);
  });

  it('should calculate total score from question responses', () => {
    const attempt = ATTEMPTS_SEED[0];
    const calculated = attempt.questionResponses.reduce((s, r) => s + r.autoScore + (r.manualScore || 0), 0);
    expect(calculated).toBe(attempt.totalScore);
  });

  it('should validate score percentage', () => {
    const attempt = ATTEMPTS_SEED.find(a => a.maxScore > 0)!;
    const expected = (attempt.totalScore / attempt.maxScore) * 100;
    expect(Math.abs(attempt.scorePercentage - Math.round(expected * 100) / 100)).toBeLessThan(0.01);
  });

  it('should require change reason for score override', () => {
    const finalized = ATTEMPTS_SEED.filter(a => a.status === ResultStatus.FINALIZED);
    finalized.forEach(a => {
      a.questionResponses.forEach(r => {
        if (r.manualScore !== undefined && r.manualScore !== r.autoScore) {
          expect(r.gradingNote).toBeTruthy();
        }
      });
    });
  });

  it('should have rubrics with valid criteria levels', () => {
    RUBRICS_SEED.forEach(r => {
      r.criteria.forEach(c => {
        expect(c.maxPoints).toBeGreaterThan(0);
        expect(c.levels.length).toBeGreaterThan(0);
        c.levels.forEach(l => {
          expect(l.score).toBeGreaterThanOrEqual(0);
          expect(l.score).toBeLessThanOrEqual(c.maxPoints);
        });
      });
    });
  });
});
