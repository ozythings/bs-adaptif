import { ContentFormat, ContentStatus, Difficulty } from './enums';

export interface ContentItem {
  id: number;
  title: string;
  description: string;
  format: ContentFormat;
  difficulty?: Difficulty;
  durationMinutes: number;
  outcomeIds: number[];
  courseId: number;
  prerequisiteContentIds: number[];
  status: ContentStatus;
  isLocked: boolean;
  isRequired: boolean;
  sortOrder: number;
  url?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}
