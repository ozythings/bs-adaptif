import { ExamStatus } from './enums';

export interface Exam {
  id: number;
  courseId: number;
  title: string;
  questionCount: number;
  passingScore: number;
  duration: number;
  wrongAnswerPenalty: number;
  status: ExamStatus;
  version: number;
  questionVersionIds: Record<number, number> | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}
