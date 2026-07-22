import { OutcomeLevel, OutcomeStatus } from './enums';

export interface LearningOutcome {
  id: number;
  code: string;
  name: string;
  description: string;
  courseId: number;
  level: OutcomeLevel;
  prerequisiteIds: number[];
  sortOrder: number;
  status: OutcomeStatus;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}
