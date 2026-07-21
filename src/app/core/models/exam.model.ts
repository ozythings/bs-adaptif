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
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}
