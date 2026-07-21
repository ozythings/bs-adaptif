import { SessionStatus } from './enums';
import { Question } from './question.model';

export interface ExamSession {
  id: number;
  token: string;
  examId: number;
  userId: number;
  startedAt: string;
  serverTimeReference: string;
  durationMinutes: number;
  timeRemainingSeconds: number;
  status: SessionStatus;
  questionOrder: number[];
  currentQuestionIndex: number;
  markedQuestions: number[];
  connectionStatus: 'online' | 'offline' | 'reconnecting';
  version: number;
  questionVersionIds: Record<number, number> | null;
  questionSnapshots: Question[];
  createdAt: string;
  updatedAt: string;
}
