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
  {
    name: 'Angular Final Blueprint', examId: 1,
    constraints: [
      { outcomeId: 100, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.EASY, minCount: 2, maxCount: 3, pointsPerQuestion: 5 },
      { outcomeId: 101, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.MEDIUM, minCount: 1, maxCount: 2, pointsPerQuestion: 10 },
      { outcomeId: 103, questionType: QuestionType.TRUE_FALSE, difficulty: Difficulty.MEDIUM, minCount: 1, maxCount: 2, pointsPerQuestion: 10 },
    ],
  },
  {
    name: 'RxJS Ara Sinav Blueprint', examId: 2,
    constraints: [
      { outcomeId: 106, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.EASY, minCount: 1, maxCount: 2, pointsPerQuestion: 5 },
      { outcomeId: 107, questionType: QuestionType.SHORT_ANSWER, difficulty: Difficulty.MEDIUM, minCount: 1, maxCount: 2, pointsPerQuestion: 10 },
    ],
  },
  {
    name: 'TypeScript Final Blueprint', examId: 3,
    constraints: [
      { outcomeId: 109, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.EASY, minCount: 2, maxCount: 2, pointsPerQuestion: 5 },
      { outcomeId: 110, questionType: QuestionType.MULTIPLE_CHOICE, difficulty: Difficulty.MEDIUM, minCount: 1, maxCount: 2, pointsPerQuestion: 10 },
    ],
  },
];
