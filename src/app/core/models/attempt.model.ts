import { ResultStatus } from './enums';

export interface QuestionResponse {
  questionId: number;
  answer: string;
  isCorrect: boolean;
  autoScore: number;
  manualScore?: number;
  maxScore: number;
  gradedBy?: number;
  gradedAt?: string;
  gradingNote?: string;
}

export interface Attempt {
  id: number;
  examId: number;
  sessionToken: string;
  studentId: number;
  instructorId?: number;
  startedAt: string;
  submittedAt?: string;
  status: ResultStatus;
  questionResponses: QuestionResponse[];
  totalScore: number;
  maxScore: number;
  scorePercentage: number;
  gradingCompletedAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
