import { BlueprintStatus, Difficulty, QuestionType } from '@core/models/enums';

export interface BlueprintConstraintSpec {
  outcomeId: number;
  questionType: QuestionType;
  difficulty: Difficulty;
  minCount: number;
  maxCount: number;
  pointsPerQuestion: number;
}

export interface BlueprintSpec {
  name: string;
  examId: number;
  constraints: BlueprintConstraintSpec[];
}

export const BLUEPRINT_SPECS: BlueprintSpec[] = [
  // Sınav 1: Angular Temelleri Ara Sınav
  {
    name: 'Angular Ara Sınav Blueprint', examId: 1,
    constraints: [
      { outcomeId: 103, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.EASY, minCount: 1, maxCount: 2, pointsPerQuestion: 5 },
      { outcomeId: 103, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.MEDIUM, minCount: 1, maxCount: 1, pointsPerQuestion: 10 },
    ],
  },
  // Sınav 2: Angular Temelleri Final Sınavı
  {
    name: 'Angular Final Blueprint', examId: 2,
    constraints: [
      { outcomeId: 100, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.EASY, minCount: 2, maxCount: 3, pointsPerQuestion: 5 },
      { outcomeId: 101, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.MEDIUM, minCount: 1, maxCount: 2, pointsPerQuestion: 10 },
      { outcomeId: 103, questionType: QuestionType.TRUE_FALSE, difficulty: Difficulty.MEDIUM, minCount: 1, maxCount: 2, pointsPerQuestion: 5 },
    ],
  },
  // Sınav 3: RxJS Ara Sınav
  {
    name: 'RxJS Ara Sınav Blueprint', examId: 3,
    constraints: [
      { outcomeId: 106, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.EASY, minCount: 1, maxCount: 1, pointsPerQuestion: 5 },
      { outcomeId: 106, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.MEDIUM, minCount: 1, maxCount: 1, pointsPerQuestion: 10 },
    ],
  },
  // Sınav 4: TypeScript Final Sınavı
  {
    name: 'TypeScript Final Blueprint', examId: 4,
    constraints: [
      { outcomeId: 109, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.EASY, minCount: 2, maxCount: 2, pointsPerQuestion: 5 },
      { outcomeId: 109, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.MEDIUM, minCount: 2, maxCount: 2, pointsPerQuestion: 10 },
    ],
  },
  // Sınav 5: Tailwind CSS Ara Sınav
  {
    name: 'Tailwind CSS Ara Sınav Blueprint', examId: 5,
    constraints: [
      { outcomeId: 114, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.EASY, minCount: 2, maxCount: 2, pointsPerQuestion: 5 },
    ],
  },
  // Sınav 6: Node.js Final Sınavı
  {
    name: 'Node.js Final Blueprint', examId: 6,
    constraints: [
      { outcomeId: 111, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.EASY, minCount: 1, maxCount: 2, pointsPerQuestion: 5 },
      { outcomeId: 112, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.MEDIUM, minCount: 1, maxCount: 2, pointsPerQuestion: 10 },
    ],
  },
  // Sınav 7: React vs Angular Değerlendirme
  {
    name: 'React vs Angular Blueprint', examId: 7,
    constraints: [
      { outcomeId: 113, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.EASY, minCount: 2, maxCount: 2, pointsPerQuestion: 5 },
      { outcomeId: 113, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.MEDIUM, minCount: 2, maxCount: 2, pointsPerQuestion: 10 },
    ],
  },
];
