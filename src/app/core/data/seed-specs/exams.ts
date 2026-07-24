import { ExamStatus } from '@core/models/enums';

export interface ExamSpec {
  title: string;
  courseId: number;
  passingScore: number;
  duration: number;
  wrongAnswerPenalty: number;
  status: ExamStatus;
}

export const EXAM_SPECS: ExamSpec[] = [
  { title: 'Angular Temelleri Final Sınavı', courseId: 1, passingScore: 70, duration: 60, wrongAnswerPenalty: 4, status: ExamStatus.PUBLISHED },
  { title: 'RxJS Ara Sınav', courseId: 2, passingScore: 75, duration: 45, wrongAnswerPenalty: 4, status: ExamStatus.PUBLISHED },
  { title: 'TypeScript Final Sınavı', courseId: 3, passingScore: 65, duration: 75, wrongAnswerPenalty: 4, status: ExamStatus.ARCHIVED },
  { title: 'Tailwind CSS Ara Sınav', courseId: 6, passingScore: 65, duration: 40, wrongAnswerPenalty: 4, status: ExamStatus.PUBLISHED },
  { title: 'Node.js Final Sınavı', courseId: 4, passingScore: 70, duration: 60, wrongAnswerPenalty: 4, status: ExamStatus.PUBLISHED },
  { title: 'React vs Angular Değerlendirme', courseId: 5, passingScore: 70, duration: 45, wrongAnswerPenalty: 4, status: ExamStatus.PUBLISHED },
  { title: 'Angular Temelleri Ara Sınav', courseId: 1, passingScore: 60, duration: 30, wrongAnswerPenalty: 4, status: ExamStatus.ARCHIVED },
];
