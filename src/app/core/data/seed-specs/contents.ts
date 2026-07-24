import { ContentFormat, ContentStatus } from '@core/models/enums';

export interface ContentSpec {
  title: string;
  description: string;
  format: ContentFormat;
  durationMinutes: number;
  outcomeIds: number[];
  courseId: number;
  prerequisiteContentIds: number[];
  status: ContentStatus;
  isLocked: boolean;
  isRequired: boolean;
  sortOrder: number;
  url?: string;
}

export const CONTENT_SPECS: ContentSpec[] = [
  { title: 'Component Giris', description: 'Angular component yapisina giris', format: ContentFormat.VIDEO, durationMinutes: 15, outcomeIds: [100], courseId: 1, prerequisiteContentIds: [], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 1, url: '/assets/videos/component-intro.mp4' },
  { title: 'Binding Turleri', description: 'One-way ve two-way binding ornekleri', format: ContentFormat.INTERACTIVE, durationMinutes: 20, outcomeIds: [101], courseId: 1, prerequisiteContentIds: [100], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 2 },
  { title: 'Direktif Kullanimi', description: 'NgIf, NgFor, NgSwitch direktifleri', format: ContentFormat.TEXT, durationMinutes: 10, outcomeIds: [102], courseId: 1, prerequisiteContentIds: [100], status: ContentStatus.ACTIVE, isLocked: false, isRequired: false, sortOrder: 3 },
  { title: 'Pipe Kullanim Kilavuzu', description: 'Yerlesik ve custom pipe ornekleri', format: ContentFormat.QUIZ, durationMinutes: 15, outcomeIds: [102], courseId: 1, prerequisiteContentIds: [102], status: ContentStatus.ACTIVE, isLocked: false, isRequired: false, sortOrder: 4 },
  { title: 'Servis ve DI Mekanizmasi', description: 'Dependency injection ve servis katmani', format: ContentFormat.VIDEO, durationMinutes: 25, outcomeIds: [103], courseId: 1, prerequisiteContentIds: [101], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 5 },
  { title: 'FormBuilder ile Karmasik Formlar', description: 'Reactive Forms ve validasyon', format: ContentFormat.INTERACTIVE, durationMinutes: 30, outcomeIds: [104], courseId: 1, prerequisiteContentIds: [104], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 6 },
  { title: 'Router ve Guard Egitimi', description: 'Route ayarlari ve route guard mekanizmasi', format: ContentFormat.VIDEO, durationMinutes: 20, outcomeIds: [105], courseId: 1, prerequisiteContentIds: [104], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 7 },
  { title: 'Observable ile Tanis', description: 'RxJS Observable yapisina giris', format: ContentFormat.VIDEO, durationMinutes: 12, outcomeIds: [106], courseId: 2, prerequisiteContentIds: [], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 1 },
  { title: 'Pipeable Operatorler', description: 'Map, filter, debounceTime operatorleri', format: ContentFormat.INTERACTIVE, durationMinutes: 25, outcomeIds: [107], courseId: 2, prerequisiteContentIds: [107], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 2 },
  { title: 'Subject ve Cesitleri', description: 'Subject, BehaviorSubject, ReplaySubject', format: ContentFormat.TEXT, durationMinutes: 15, outcomeIds: [108], courseId: 2, prerequisiteContentIds: [108], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 3 },
];
