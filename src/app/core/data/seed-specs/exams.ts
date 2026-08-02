import { ExamStatus } from '@core/models/enums';

export interface ExamSpec {
  title: string;
  courseId: number;
  passingScore: number;
  duration: number;
  wrongAnswerPenalty: number;
  status: ExamStatus;
  startDate: string;
  endDate: string;
}

export const EXAM_SPECS: ExamSpec[] = [
  { title: 'Angular Temelleri Final Sınavı', courseId: 1, passingScore: 70, duration: 60, wrongAnswerPenalty: 4, status: ExamStatus.PUBLISHED, startDate: '2026-06-01T00:00:00Z', endDate: '2026-12-31T23:59:59Z' },
  { title: 'RxJS Ara Sınav', courseId: 2, passingScore: 75, duration: 45, wrongAnswerPenalty: 4, status: ExamStatus.PUBLISHED, startDate: '2026-07-01T00:00:00Z', endDate: '2026-09-30T23:59:59Z' },
  { title: 'TypeScript Final Sınavı', courseId: 3, passingScore: 65, duration: 75, wrongAnswerPenalty: 4, status: ExamStatus.ARCHIVED, startDate: '2026-01-01T00:00:00Z', endDate: '2026-04-30T23:59:59Z' },
  { title: 'Tailwind CSS Ara Sınav', courseId: 6, passingScore: 65, duration: 40, wrongAnswerPenalty: 4, status: ExamStatus.PUBLISHED, startDate: '2026-09-01T00:00:00Z', endDate: '2026-09-30T23:59:59Z' },
  { title: 'Node.js Final Sınavı', courseId: 4, passingScore: 70, duration: 60, wrongAnswerPenalty: 4, status: ExamStatus.PUBLISHED, startDate: '2026-03-01T00:00:00Z', endDate: '2026-12-31T23:59:59Z' },
  { title: 'React vs Angular Değerlendirme', courseId: 5, passingScore: 70, duration: 45, wrongAnswerPenalty: 4, status: ExamStatus.PUBLISHED, startDate: '2026-01-01T00:00:00Z', endDate: '2026-08-15T23:59:59Z' },
  { title: 'Angular Temelleri Ara Sınav', courseId: 1, passingScore: 60, duration: 30, wrongAnswerPenalty: 4, status: ExamStatus.ARCHIVED, startDate: '2026-01-15T00:00:00Z', endDate: '2026-03-31T23:59:59Z' },
];
