import { ContentFormat, ContentStatus, Difficulty } from '@core/models/enums';

export interface ContentSpec {
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
}

export const CONTENT_SPECS: ContentSpec[] = [
  { title: 'Component Giriş', description: 'Angular component yapısına giriş', format: ContentFormat.VIDEO, difficulty: Difficulty.EASY, durationMinutes: 15, outcomeIds: [100], courseId: 1, prerequisiteContentIds: [], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 1, url: '/assets/videos/component-intro.mp4' },
  { title: 'Binding Türleri', description: 'One-way ve two-way binding örnekleri', format: ContentFormat.INTERACTIVE, difficulty: Difficulty.MEDIUM, durationMinutes: 20, outcomeIds: [101], courseId: 1, prerequisiteContentIds: [100], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 2 },
  { title: 'Direktif Kullanımı', description: 'NgIf, NgFor, NgSwitch direktifleri', format: ContentFormat.TEXT, difficulty: Difficulty.EASY, durationMinutes: 10, outcomeIds: [102], courseId: 1, prerequisiteContentIds: [100], status: ContentStatus.ACTIVE, isLocked: false, isRequired: false, sortOrder: 3 },
  { title: 'Pipe Kullanım Kılavuzu', description: 'Yerleşik ve custom pipe örnekleri', format: ContentFormat.QUIZ, difficulty: Difficulty.EASY, durationMinutes: 15, outcomeIds: [102], courseId: 1, prerequisiteContentIds: [102], status: ContentStatus.ACTIVE, isLocked: false, isRequired: false, sortOrder: 4 },
  { title: 'Servis ve DI Mekanizması', description: 'Dependency injection ve servis katmanı', format: ContentFormat.VIDEO, difficulty: Difficulty.MEDIUM, durationMinutes: 25, outcomeIds: [103], courseId: 1, prerequisiteContentIds: [101], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 5 },
  { title: 'FormBuilder ile Karmaşık Formlar', description: 'Reactive Forms ve validasyon', format: ContentFormat.INTERACTIVE, difficulty: Difficulty.HARD, durationMinutes: 30, outcomeIds: [104], courseId: 1, prerequisiteContentIds: [104], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 6 },
  { title: 'Router ve Guard Eğitimi', description: 'Route ayarları ve route guard mekanizması', format: ContentFormat.VIDEO, difficulty: Difficulty.HARD, durationMinutes: 20, outcomeIds: [105], courseId: 1, prerequisiteContentIds: [104], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 7 },
  { title: 'Observable ile Tanış', description: 'RxJS Observable yapısına giriş', format: ContentFormat.VIDEO, difficulty: Difficulty.EASY, durationMinutes: 12, outcomeIds: [106], courseId: 2, prerequisiteContentIds: [], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 1 },
  { title: 'Pipeable Operatörler', description: 'Map, filter, debounceTime operatörleri', format: ContentFormat.INTERACTIVE, difficulty: Difficulty.MEDIUM, durationMinutes: 25, outcomeIds: [107], courseId: 2, prerequisiteContentIds: [107], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 2 },
  { title: 'Subject ve Çeşitleri', description: 'Subject, BehaviorSubject, ReplaySubject', format: ContentFormat.TEXT, difficulty: Difficulty.MEDIUM, durationMinutes: 15, outcomeIds: [108], courseId: 2, prerequisiteContentIds: [108], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 3 },
];
