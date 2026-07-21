export interface RubricCriterion {
  id: number;
  name: string;
  description: string;
  maxPoints: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  score: number;
  label: string;
  description: string;
}

export interface RubricScore {
  criterionId: number;
  score: number;
  comment: string;
}

export interface Rubric {
  id: number;
  name: string;
  questionId: number;
  criteria: RubricCriterion[];
  status: RubricStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export enum RubricStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

export interface GradingResult {
  attemptId: number;
  questionId: number;
  scores: RubricScore[];
  totalScore: number;
  comment: string;
  gradedBy: number;
  gradedAt: string;
  previousScore?: number;
  changeReason?: string;
}
