import { Difficulty, QuestionStatus, QuestionType } from './enums';

export interface Question {
  id: number;
  examId: number;
  questionText: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: number | string;
  solution?: string;
  difficulty: Difficulty;
  points: number;
  status: QuestionStatus;
  outcomeIds?: number[];
  tags?: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}
