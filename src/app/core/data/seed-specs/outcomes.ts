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
  { code: 'ANG-T-01', name: 'Angular Component Yapisi', description: 'Angular component mimarisini anlama', courseId: 1, level: OutcomeLevel.REMEMBER, prerequisiteIds: [], sortOrder: 1, status: OutcomeStatus.ACTIVE },
  { code: 'ANG-T-02', name: 'Data Binding', description: 'One-way ve two-way binding kullanimi', courseId: 1, level: OutcomeLevel.APPLY, prerequisiteIds: [100], sortOrder: 2, status: OutcomeStatus.ACTIVE },
  { code: 'ANG-T-03', name: 'Direktif ve Pipe', description: 'Yerlesik direktif ve pipe kullanimlari', courseId: 1, level: OutcomeLevel.APPLY, prerequisiteIds: [100], sortOrder: 3, status: OutcomeStatus.ACTIVE },
  { code: 'ANG-T-04', name: 'Servis ve DI', description: 'Dependency Injection ve servis mimarisi', courseId: 1, level: OutcomeLevel.ANALYZE, prerequisiteIds: [101, 102], sortOrder: 4, status: OutcomeStatus.ACTIVE },
  { code: 'ANG-T-05', name: 'Reactive Forms', description: 'FormBuilder ve validasyon yonetimi', courseId: 1, level: OutcomeLevel.APPLY, prerequisiteIds: [103], sortOrder: 5, status: OutcomeStatus.ACTIVE },
  { code: 'ANG-T-06', name: 'Routing ve Guard', description: 'Router modulu ve route guvenligi', courseId: 1, level: OutcomeLevel.EVALUATE, prerequisiteIds: [103], sortOrder: 6, status: OutcomeStatus.ACTIVE },
  { code: 'RXJ-01', name: 'Observable Yapisi', description: 'Observable ve subscriber modelini anlama', courseId: 2, level: OutcomeLevel.REMEMBER, prerequisiteIds: [], sortOrder: 1, status: OutcomeStatus.ACTIVE },
  { code: 'RXJ-02', name: 'Operator Zinciri', description: 'Pipeable operatorlerle veri akisi', courseId: 2, level: OutcomeLevel.APPLY, prerequisiteIds: [106], sortOrder: 2, status: OutcomeStatus.ACTIVE },
  { code: 'RXJ-03', name: 'Subject Tipleri', description: 'Subject, BehaviorSubject, ReplaySubject kullanimi', courseId: 2, level: OutcomeLevel.ANALYZE, prerequisiteIds: [107], sortOrder: 3, status: OutcomeStatus.ACTIVE },
  { code: 'TS-01', name: 'Tip Sistemi', description: 'TypeScript temel tipleri ve tip cikarimi', courseId: 3, level: OutcomeLevel.REMEMBER, prerequisiteIds: [], sortOrder: 1, status: OutcomeStatus.ACTIVE },
  { code: 'TS-02', name: 'Generic Tipler', description: 'Generic fonksiyon ve sinif tanimlama', courseId: 3, level: OutcomeLevel.ANALYZE, prerequisiteIds: [109], sortOrder: 2, status: OutcomeStatus.ACTIVE },
  { code: 'NJS-01', name: 'Event Loop ve Moduller', description: 'Node.js olay dongusu ve modul sistemi', courseId: 4, level: OutcomeLevel.REMEMBER, prerequisiteIds: [], sortOrder: 1, status: OutcomeStatus.ACTIVE },
  { code: 'NJS-02', name: 'REST API Tasarimi', description: 'Express.js ile REST API gelistirme', courseId: 4, level: OutcomeLevel.CREATE, prerequisiteIds: [111], sortOrder: 2, status: OutcomeStatus.ACTIVE },
  { code: 'RVA-01', name: 'Mimari Karsilastirma', description: 'React ve Angular mimari farklari', courseId: 5, level: OutcomeLevel.UNDERSTAND, prerequisiteIds: [], sortOrder: 1, status: OutcomeStatus.ACTIVE },
  { code: 'TWS-01', name: 'Utility-First CSS', description: 'Tailwind CSS utility yaklasimi', courseId: 6, level: OutcomeLevel.REMEMBER, prerequisiteIds: [], sortOrder: 1, status: OutcomeStatus.ACTIVE },
  { code: 'TWS-02', name: 'Responsive Tasarim', description: 'Tailwind ile responsive duzen olusturma', courseId: 6, level: OutcomeLevel.APPLY, prerequisiteIds: [114], sortOrder: 2, status: OutcomeStatus.ACTIVE },
];
