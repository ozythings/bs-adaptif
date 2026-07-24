import { RubricStatus } from '@core/models/rubric.model';

export interface RubricLevelSpec {
  score: number;
  label: string;
  description: string;
}

export interface RubricCriterionSpec {
  name: string;
  description: string;
  maxPoints: number;
  levels: RubricLevelSpec[];
}

export interface RubricSpec {
  name: string;
  questionId: number;
  criteria: RubricCriterionSpec[];
  status: RubricStatus;
}

export const RUBRIC_SPECS: RubricSpec[] = [
  {
    name: 'Kisa Cevap Degerlendirme', questionId: 0,
    criteria: [
      {
        name: 'Dogru Cevap', description: 'Cevabin dogrulugu', maxPoints: 5,
        levels: [
          { score: 5, label: 'Mukemmel', description: 'Tam dogru cevap' },
          { score: 3, label: 'Kismi', description: 'Kismen dogru' },
          { score: 0, label: 'Yanlis', description: 'Yanlis cevap' },
        ],
      },
      {
        name: 'Aciklama', description: 'Cevabin aciklamasi', maxPoints: 3,
        levels: [
          { score: 3, label: 'Detayli', description: 'Detayli aciklama' },
          { score: 1, label: 'Yuzeysel', description: 'Yuzeysel aciklama' },
          { score: 0, label: 'Eksik', description: 'Aciklama yok' },
        ],
      },
    ],
    status: RubricStatus.ACTIVE,
  },
  {
    name: 'Essay Degerlendirme', questionId: 0,
    criteria: [
      {
        name: 'Icerik', description: 'Konu hakimiyeti', maxPoints: 10,
        levels: [
          { score: 10, label: 'Kapsamli', description: 'Konuyu tum yonleriyle ele almis' },
          { score: 6, label: 'Yeterli', description: 'Temel noktalari iceriyor' },
          { score: 2, label: 'Zayif', description: 'Konuya yuzeysel deginmis' },
          { score: 0, label: 'Yetersiz', description: 'Konuyla ilgisiz' },
        ],
      },
      {
        name: 'Yapi', description: 'Yazi duzeni ve akis', maxPoints: 5,
        levels: [
          { score: 5, label: 'Akici', description: 'Mantikli akis ve duzen' },
          { score: 3, label: 'Kabul edilebilir', description: 'Kismi duzen' },
          { score: 0, label: 'Dagimik', description: 'Duzen yok' },
        ],
      },
    ],
    status: RubricStatus.ACTIVE,
  },
];
