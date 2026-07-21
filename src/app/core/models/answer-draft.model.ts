export interface AnswerDraft {
  id: number;
  sessionId: number;
  questionId: number;
  answer: string;
  version: number;
  isSynced: boolean;
  syncStatus: 'pending' | 'synced' | 'conflict' | 'error';
  lastSavedAt: string;
  createdAt: string;
  updatedAt: string;
}
