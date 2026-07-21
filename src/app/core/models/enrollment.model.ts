import { EnrollmentStatus } from './enums';

export interface Enrollment {
  id: number;
  courseId: number;
  participantId: number;
  enrollmentDate: string;
  status: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}
