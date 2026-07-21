export interface DistractorAnalysis {
  optionKey: string;
  optionValue: string;
  selectionRate: number;
  isCorrect: boolean;
}

export interface ItemAnalysis {
  id: number;
  questionId: number;
  examId: number;
  difficultyIndex: number;
  discriminationIndex: number;
  pointBiserial: number;
  distractorAnalysis: DistractorAnalysis[];
  upperGroupRate: number;
  lowerGroupRate: number;
  sampleSize: number;
  status: ItemAnalysisStatus;
  calculatedAt: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type ItemAnalysisStatus = 'pending' | 'computed' | 'stale';
