import { CourseStatus } from './enums';

export interface Course {
  id: number;
  title: string;
  description: string;
  instructorId: number;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  status: CourseStatus;
  passingScore: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}
