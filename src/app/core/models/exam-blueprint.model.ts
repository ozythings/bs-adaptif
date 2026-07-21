import { BlueprintStatus, Difficulty, QuestionType } from './enums';

export interface BlueprintConstraint {
  outcomeId: number;
  questionType: QuestionType;
  difficulty: Difficulty;
  minCount: number;
  maxCount: number;
  pointsPerQuestion: number;
}

export interface BlueprintSummary {
  totalQuestions: number;
  totalPoints: number;
  coverage: { outcomeId: number; selected: number; required: number }[];
  violations: string[];
}

export interface ExamBlueprint {
  id: number;
  name: string;
  examId: number;
  constraints: BlueprintConstraint[];
  status: BlueprintStatus;
  summary: BlueprintSummary;
  version: number;
  createdAt: string;
  updatedAt: string;
}
