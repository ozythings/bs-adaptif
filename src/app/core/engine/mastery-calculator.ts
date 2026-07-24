import { MasteryLevel } from '@core/models/enums';
import { DifficultyBreakdown } from '@core/models/mastery-score.model';

export type { DifficultyBreakdown };

export interface MasteryInput {
  recentAnswers: number[];
  avgDifficulty: number;
  repeatCount: number;
  questionDifficulty?: number;
  difficultyBreakdown?: DifficultyBreakdown;
}

export interface MasteryResult {
  score: number;
  level: MasteryLevel;
  difficultyWeightedAverage: number;
  difficultyBreakdown: DifficultyBreakdown;
}

export const DIFFICULTY_WEIGHTS: Record<keyof DifficultyBreakdown, number> = {
  easy: 0.3,
  medium: 0.6,
  hard: 0.9,
};

export const EMPTY_BREAKDOWN: DifficultyBreakdown = {
  easy: { correct: 0, total: 0, successRate: 0 },
  medium: { correct: 0, total: 0, successRate: 0 },
  hard: { correct: 0, total: 0, successRate: 0 },
};

export const RECENT_WINDOW = 6;

export function calculateMastery(input: MasteryInput): MasteryResult {
  const windowed = input.recentAnswers.slice(-RECENT_WINDOW);

  const difficultyWeightedAverage =
    input.questionDifficulty !== undefined && input.recentAnswers.length > 0
      ? (input.avgDifficulty * (input.recentAnswers.length - 1) + input.questionDifficulty) /
        input.recentAnswers.length
      : input.avgDifficulty;

  const fallbackBreakdown = (): DifficultyBreakdown => ({
    easy: { ...EMPTY_BREAKDOWN.easy },
    medium: { ...EMPTY_BREAKDOWN.medium },
    hard: { ...EMPTY_BREAKDOWN.hard },
  });

  if (windowed.length === 0) {
    return {
      score: 0,
      level: MasteryLevel.NOVICE,
      difficultyWeightedAverage: round2(difficultyWeightedAverage),
      difficultyBreakdown: input.difficultyBreakdown ?? fallbackBreakdown(),
    };
  }

  const recentAvg = windowed.reduce((s, a) => s + a, 0) / windowed.length;
  const recencyBonus = Math.min(input.repeatCount * 2.5, 12);
  const difficultyWeightedBase = 86 + difficultyWeightedAverage * 3;
  const repeatPenalty = (1 - recentAvg) * 15;

  const score = Math.round(
    Math.max(0, Math.min(100,
      (recentAvg * difficultyWeightedBase) + recencyBonus - repeatPenalty
    ))
  );

  const level = score >= 80 ? MasteryLevel.ADVANCED
    : score >= 60 ? MasteryLevel.PROFICIENT
    : score >= 40 ? MasteryLevel.EMERGING
    : MasteryLevel.NOVICE;

  return {
    score,
    level,
    difficultyWeightedAverage: round2(difficultyWeightedAverage),
    difficultyBreakdown: input.difficultyBreakdown ?? fallbackBreakdown(),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
