import { MasteryLevel } from './enums';

export interface DifficultyBreakdown {
  easy: { correct: number; total: number; successRate: number };
  medium: { correct: number; total: number; successRate: number };
  hard: { correct: number; total: number; successRate: number };
}

export interface MasterySnapshot {
  score: number;
  date: string;
}

export interface MasteryScore {
  id: number;
  studentId: number;
  outcomeId: number;
  masteryLevel: MasteryLevel;
  score: number;
  recentAnswers: number[];
  difficultyWeightedAverage: number;
  difficultyBreakdown?: DifficultyBreakdown;
  repeatCount: number;
  lastAssessedAt: string;
  calculatedAt: string;
  history: MasterySnapshot[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface MasteryInput {
  studentId: number;
  outcomeId: number;
  correctCount: number;
  totalCount: number;
  avgDifficulty: number;
  repeatCount: number;
}
