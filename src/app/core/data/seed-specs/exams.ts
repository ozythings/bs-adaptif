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
  { title: 'Angular Temelleri Ara Sınav',     courseId: 1, passingScore: 60, duration: 30, wrongAnswerPenalty: 4, status: ExamStatus.ARCHIVED,  startDate: '2026-08-03T09:00:00Z', endDate: '2026-08-08T17:00:00Z' },
  { title: 'Angular Temelleri Final Sınavı',   courseId: 1, passingScore: 70, duration: 60, wrongAnswerPenalty: 4, status: ExamStatus.PUBLISHED, startDate: '2026-08-14T09:00:00Z', endDate: '2026-08-18T17:00:00Z' },
  { title: 'RxJS Ara Sınav',                   courseId: 2, passingScore: 75, duration: 45, wrongAnswerPenalty: 4, status: ExamStatus.PUBLISHED, startDate: '2026-08-05T09:00:00Z', endDate: '2026-08-10T17:00:00Z' },
  { title: 'TypeScript Final Sınavı',          courseId: 3, passingScore: 65, duration: 75, wrongAnswerPenalty: 4, status: ExamStatus.ARCHIVED,  startDate: '2026-08-16T09:00:00Z', endDate: '2026-08-20T17:00:00Z' },
  { title: 'Tailwind CSS Ara Sınav',           courseId: 6, passingScore: 65, duration: 40, wrongAnswerPenalty: 4, status: ExamStatus.ARCHIVED,  startDate: '2026-08-07T09:00:00Z', endDate: '2026-08-12T17:00:00Z' },
  { title: 'Node.js Final Sınavı',             courseId: 4, passingScore: 70, duration: 60, wrongAnswerPenalty: 4, status: ExamStatus.PUBLISHED, startDate: '2026-08-18T09:00:00Z', endDate: '2026-08-21T17:00:00Z' },
  { title: 'React vs Angular Değerlendirme',   courseId: 5, passingScore: 70, duration: 45, wrongAnswerPenalty: 4, status: ExamStatus.ARCHIVED,  startDate: '2026-08-04T09:00:00Z', endDate: '2026-08-09T17:00:00Z' },
];
