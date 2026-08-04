import { CourseStatus } from '@core/models/enums';

export interface CourseSpec {
  title: string;
  description: string;
  instructorId: number;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  status: CourseStatus;
  passingScore: number;
}

export const COURSE_SPECS: CourseSpec[] = [
  { title: 'Angular Temelleri', description: "Angular framework'ünün temellerini öğrenin. Component, directive, pipe, service konuları işlenir.", instructorId: 1, startDate: '2026-02-01T09:00:00Z', endDate: '2026-12-15T17:00:00Z', maxParticipants: 25, status: CourseStatus.ACTIVE, passingScore: 70 },
  { title: 'İleri Düzey RxJS', description: 'Reactive programming ve RxJS kütüphanesinin ileri konuları. Observable, Subject, operators detaylı incelenir.', instructorId: 2, startDate: '2026-03-01T09:00:00Z', endDate: '2026-12-01T17:00:00Z', maxParticipants: 20, status: CourseStatus.ACTIVE, passingScore: 75 },
  { title: 'TypeScript Girişi', description: 'TypeScript dilinin temelleri. Tip sistemi, interface, generic types ve decorator konuları.', instructorId: 1, startDate: '2026-01-10T09:00:00Z', endDate: '2026-12-20T17:00:00Z', maxParticipants: 30, status: CourseStatus.ACTIVE, passingScore: 65 },
  { title: 'Node.js Backend', description: 'Node.js ile backend geliştirme. Express.js, REST API, middleware ve authentication.', instructorId: 3, startDate: '2026-05-01T09:00:00Z', endDate: '2026-12-15T17:00:00Z', maxParticipants: 20, status: CourseStatus.ACTIVE, passingScore: 70 },
  { title: 'React vs Angular', description: "İki popüler framework'ün karşılaştırılması. Mimari, performans, ekosistem farkları.", instructorId: 2, startDate: '2026-02-01T09:00:00Z', endDate: '2026-12-01T17:00:00Z', maxParticipants: 15, status: CourseStatus.ACTIVE, passingScore: 70 },
  { title: 'Tailwind CSS ile UI', description: 'Utility-first CSS yaklaşımı. Tailwind CSS ile hızlı ve responsive arayüz geliştirme.', instructorId: 4, startDate: '2026-04-01T09:00:00Z', endDate: '2026-12-10T17:00:00Z', maxParticipants: 25, status: CourseStatus.ACTIVE, passingScore: 65 },
];
