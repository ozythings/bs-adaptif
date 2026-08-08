import { OutcomeLevel, OutcomeStatus } from '@core/models/enums';

export interface OutcomeSpec {
  code: string;
  name: string;
  description: string;
  courseId: number;
  level: OutcomeLevel;
  prerequisiteIds: number[];
  sortOrder: number;
  status: OutcomeStatus;
}

export const OUTCOME_SPECS: OutcomeSpec[] = [
  { code: 'ANG-T-01', name: 'Angular Component Yapısı', description: 'Angular component mimarisini anlama', courseId: 1, level: OutcomeLevel.REMEMBER, prerequisiteIds: [], sortOrder: 1, status: OutcomeStatus.ACTIVE },
  { code: 'ANG-T-02', name: 'Data Binding', description: 'One-way ve two-way binding kullanımı', courseId: 1, level: OutcomeLevel.APPLY, prerequisiteIds: [100], sortOrder: 2, status: OutcomeStatus.ACTIVE },
  { code: 'ANG-T-03', name: 'Direktif ve Pipe', description: 'Yerleşik direktif ve pipe kullanımları', courseId: 1, level: OutcomeLevel.APPLY, prerequisiteIds: [100], sortOrder: 3, status: OutcomeStatus.ACTIVE },
  { code: 'ANG-T-04', name: 'Servis ve DI', description: 'Dependency Injection ve servis mimarisi', courseId: 1, level: OutcomeLevel.ANALYZE, prerequisiteIds: [101, 102], sortOrder: 4, status: OutcomeStatus.ACTIVE },
  { code: 'ANG-T-05', name: 'Reactive Forms', description: 'FormBuilder ve validasyon yönetimi', courseId: 1, level: OutcomeLevel.APPLY, prerequisiteIds: [103], sortOrder: 5, status: OutcomeStatus.ACTIVE },
  { code: 'ANG-T-06', name: 'Routing ve Guard', description: 'Router modülü ve route güvenliği', courseId: 1, level: OutcomeLevel.EVALUATE, prerequisiteIds: [103], sortOrder: 6, status: OutcomeStatus.ACTIVE },
  { code: 'RXJ-01', name: 'Observable Yapısı', description: 'Observable ve subscriber modelini anlama', courseId: 2, level: OutcomeLevel.REMEMBER, prerequisiteIds: [], sortOrder: 1, status: OutcomeStatus.ACTIVE },
  { code: 'RXJ-02', name: 'Operator Zinciri', description: 'Pipeable operatörlerle veri akışı', courseId: 2, level: OutcomeLevel.APPLY, prerequisiteIds: [106], sortOrder: 2, status: OutcomeStatus.ACTIVE },
  { code: 'RXJ-03', name: 'Subject Tipleri', description: 'Subject, BehaviorSubject, ReplaySubject kullanımı', courseId: 2, level: OutcomeLevel.ANALYZE, prerequisiteIds: [107], sortOrder: 3, status: OutcomeStatus.ACTIVE },
  { code: 'TS-01', name: 'Tip Sistemi', description: 'TypeScript temel tipleri ve tip çıkarması', courseId: 3, level: OutcomeLevel.REMEMBER, prerequisiteIds: [], sortOrder: 1, status: OutcomeStatus.ACTIVE },
  { code: 'TS-02', name: 'Generic Tipler', description: 'Generic fonksiyon ve sınıf tanımlama', courseId: 3, level: OutcomeLevel.ANALYZE, prerequisiteIds: [109], sortOrder: 2, status: OutcomeStatus.ACTIVE },
  { code: 'NJS-01', name: 'Event Loop ve Modüller', description: 'Node.js olay döngüsü ve modül sistemi', courseId: 4, level: OutcomeLevel.REMEMBER, prerequisiteIds: [], sortOrder: 1, status: OutcomeStatus.ACTIVE },
  { code: 'NJS-02', name: 'REST API Tasarımı', description: 'Express.js ile REST API geliştirme', courseId: 4, level: OutcomeLevel.CREATE, prerequisiteIds: [111], sortOrder: 2, status: OutcomeStatus.ACTIVE },
  { code: 'RVA-01', name: 'Mimari Karşılaştırma', description: 'React ve Angular mimari farkları', courseId: 5, level: OutcomeLevel.UNDERSTAND, prerequisiteIds: [], sortOrder: 1, status: OutcomeStatus.ACTIVE },
  { code: 'TWS-01', name: 'Utility-First CSS', description: 'Tailwind CSS utility yaklaşımı', courseId: 6, level: OutcomeLevel.REMEMBER, prerequisiteIds: [], sortOrder: 1, status: OutcomeStatus.ACTIVE },
  { code: 'TWS-02', name: 'Responsive Tasarım', description: 'Tailwind ile responsive düzen oluşturma', courseId: 6, level: OutcomeLevel.APPLY, prerequisiteIds: [114], sortOrder: 2, status: OutcomeStatus.ACTIVE },
];
