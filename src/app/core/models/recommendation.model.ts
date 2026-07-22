import { RecommendationStatus } from './enums';

export interface Recommendation {
  id: number;
  studentId: number;
  contentType: 'content' | 'question';
  contentId: number;
  outcomeId: number;
  reason: string;
  reasonDetails: ReasonDetail[];
  priority: number;
  status: RecommendationStatus;
  isApplied: boolean;
  isDismissed: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReasonDetail {
  factor: string;
  weight: number;
  description: string;
}
