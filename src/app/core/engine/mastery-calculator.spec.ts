import { describe, it, expect } from 'vitest';
import { calculateMastery } from './mastery-calculator';
import { MasteryLevel } from '@core/models/enums';

describe('MasteryCalculator', () => {
  it('should return NOVICE for empty answers', () => {
    const result = calculateMastery({ recentAnswers: [], avgDifficulty: 0.5, repeatCount: 0 });
    expect(result.score).toBe(0);
    expect(result.level).toBe(MasteryLevel.NOVICE);
  });

  it('should return ADVANCED for perfect score with low repeat', () => {
    const result = calculateMastery({ recentAnswers: [1, 1, 1, 1, 1], avgDifficulty: 0.7, repeatCount: 1 });
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.level).toBe(MasteryLevel.ADVANCED);
  });

  it('should return PROFICIENT for good performance', () => {
    const result = calculateMastery({ recentAnswers: [1, 1, 0, 1, 1], avgDifficulty: 0.5, repeatCount: 2 });
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.score).toBeLessThan(80);
    expect(result.level).toBe(MasteryLevel.PROFICIENT);
  });

  it('should return EMERGING for mixed performance', () => {
    const result = calculateMastery({ recentAnswers: [1, 0, 0, 1], avgDifficulty: 0.4, repeatCount: 3 });
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThan(60);
    expect(result.level).toBe(MasteryLevel.EMERGING);
  });

  it('should return NOVICE for poor performance with high repeats', () => {
    const result = calculateMastery({ recentAnswers: [0, 0, 1, 0], avgDifficulty: 0.3, repeatCount: 5 });
    expect(result.score).toBeLessThan(40);
    expect(result.level).toBe(MasteryLevel.NOVICE);
  });

  it('should clamp score between 0 and 100', () => {
    const perfect = calculateMastery({ recentAnswers: [1, 1, 1], avgDifficulty: 1, repeatCount: 0 });
    expect(perfect.score).toBeLessThanOrEqual(100);
    const zero = calculateMastery({ recentAnswers: [0, 0, 0], avgDifficulty: 0, repeatCount: 10 });
    expect(zero.score).toBeGreaterThanOrEqual(0);
  });

  it('should blend the latest question difficulty into the weighted average', () => {
    const result = calculateMastery({
      recentAnswers: [1, 1],
      avgDifficulty: 0.3,
      repeatCount: 1,
      questionDifficulty: 0.9,
    });
    expect(result.difficultyWeightedAverage).toBeCloseTo(0.6, 2);
  });

  it('should keep the historical difficulty when no question difficulty is provided', () => {
    const result = calculateMastery({ recentAnswers: [1, 1], avgDifficulty: 0.45, repeatCount: 1 });
    expect(result.difficultyWeightedAverage).toBeCloseTo(0.45, 2);
  });

  it('should return difficultyWeightedAverage and breakdown in the result', () => {
    const breakdown = {
      easy: { correct: 3, total: 4, successRate: 0.75 },
      medium: { correct: 2, total: 5, successRate: 0.4 },
      hard: { correct: 1, total: 3, successRate: 0.33 },
    };
    const result = calculateMastery({ recentAnswers: [1, 0, 1], avgDifficulty: 0.5, repeatCount: 2, difficultyBreakdown: breakdown });
    expect(result.difficultyBreakdown).toEqual(breakdown);
  });

  it('should not penalize repetition when all answers are correct', () => {
    const result = calculateMastery({
      recentAnswers: Array(14).fill(1),
      avgDifficulty: 0.88,
      repeatCount: 14,
    });
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.level).toBe(MasteryLevel.ADVANCED);
  });

  it('should reach ~95 after 5 correct studies on medium difficulty', () => {
    const result = calculateMastery({
      recentAnswers: [1, 1, 1, 1, 1],
      avgDifficulty: 0.6,
      repeatCount: 5,
    });
    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.level).toBe(MasteryLevel.ADVANCED);
  });

  it('should drop old wrong answers out of the recent window', () => {
    const contaminated = [0, 1, 0, 0, 1, 1, 1, 1, 1, 1];
    const result = calculateMastery({
      recentAnswers: contaminated,
      avgDifficulty: 0.4,
      repeatCount: 6,
    });
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.level).toBe(MasteryLevel.ADVANCED);
  });

  it('should never decrease the score as correct answers accumulate', () => {
    const recentAnswers = [0, 1, 0, 0];
    const avgDifficulty = 0.5;

    let prevScore = -1;
    for (let repeat = 1; repeat <= 12; repeat++) {
      recentAnswers.push(1);
      const result = calculateMastery({
        recentAnswers: [...recentAnswers],
        avgDifficulty,
        repeatCount: repeat,
      });

      if (result.score < prevScore) {
        throw new Error(`Score decreased at repeat=${repeat}: ${prevScore} → ${result.score}`);
      }
      prevScore = result.score;
    }
  });
});
