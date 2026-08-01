import { QuestionType, Difficulty, QuestionVersionStatus } from './enums';

export interface QuestionOption {
  key: string;
  value: string;
  isCorrect: boolean;
}

export interface QuestionVersion {
  id: number;
  questionId: number;
  version: number;
  stem: string;
  type: QuestionType;
  options: QuestionOption[];
  correctAnswer: string;
  solution: string;
  difficulty: Difficulty;
  points: number;
  partialPoints: boolean;
  partialPointsRules?: { threshold: number; points: number }[];
  outcomeIds: number[];
  tags: string[];
  status: QuestionVersionStatus;
  changeNote: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionSummary {
  id: number;
  stem: string;
  type: QuestionType;
  difficulty: Difficulty;
  points: number;
  solution?: string;
  outcomeIds: number[];
  tags: string[];
  status: QuestionVersionStatus;
  currentVersion: number;
  latestVersionId: number;
  createdAt: string;
  updatedAt: string;
}
