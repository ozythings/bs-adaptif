import { RubricStatus } from '@core/models/rubric.model';
import { QuestionType } from '@core/models/enums';

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
  questionType?: QuestionType;
  criteria: RubricCriterionSpec[];
  status: RubricStatus;
}

export const RUBRIC_SPECS: RubricSpec[] = [
  {
    name: 'Kısa Cevap Değerlendirme', questionId: 5, questionType: QuestionType.SHORT_ANSWER,
    criteria: [
      {
        name: 'Doğru Cevap', description: 'Cevabın doğruluğu', maxPoints: 3,
        levels: [
          { score: 3, label: 'Mükemmel', description: 'Tam doğru cevap' },
          { score: 2, label: 'Kısmi', description: 'Kısmen doğru' },
          { score: 0, label: 'Yanlış', description: 'Yanlış cevap' },
        ],
      },
      {
        name: 'Açıklama', description: 'Cevabın açıklaması', maxPoints: 2,
        levels: [
          { score: 2, label: 'Detaylı', description: 'Detaylı açıklama' },
          { score: 1, label: 'Yüzeysel', description: 'Yüzeysel açıklama' },
          { score: 0, label: 'Eksik', description: 'Açıklama yok' },
        ],
      },
    ],
    status: RubricStatus.ACTIVE,
  },
  {
    name: 'Essay Değerlendirme', questionId: 6, questionType: QuestionType.ESSAY,
    criteria: [
      {
        name: 'İçerik', description: 'Konu hakimiyeti', maxPoints: 7,
        levels: [
          { score: 7, label: 'Kapsamlı', description: 'Konuyu tüm yönleriyle ele almış' },
          { score: 4, label: 'Yeterli', description: 'Temel noktaları içeriyor' },
          { score: 1, label: 'Zayıf', description: 'Konuya yüzeysel değinmiş' },
          { score: 0, label: 'Yetersiz', description: 'Konuyla ilgisiz' },
        ],
      },
      {
        name: 'Yapı', description: 'Yazı düzeni ve akış', maxPoints: 3,
        levels: [
          { score: 3, label: 'Akıcı', description: 'Mantıklı akış ve düzen' },
          { score: 2, label: 'Kabul edilebilir', description: 'Kısmi düzen' },
          { score: 0, label: 'Dağınık', description: 'Düzen yok' },
        ],
      },
    ],
    status: RubricStatus.ACTIVE,
  },
];
