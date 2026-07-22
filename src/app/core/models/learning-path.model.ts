import { Recommendation } from './recommendation.model';
import { ContentItem } from './content-item.model';

export interface LearningPath {
  id: number;
  studentId: number;
  courseId: number;
  items: LearningPathItem[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface LearningPathItem {
  contentId: number;
  outcomeId: number;
  order: number;
  recommendation: Recommendation;
  reason: string;
}
