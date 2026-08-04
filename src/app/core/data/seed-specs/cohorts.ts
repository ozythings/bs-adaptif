export interface CohortSpec {
  name: string;
  programId: number;
  termId: number;
  studentIds: number[];
}

export const COHORT_SPECS: CohortSpec[] = [
  { name: '2026 Bahar Grubu A', programId: 100, termId: 1, studentIds: [1, 2, 3, 4, 5] },
  { name: '2026 Bahar Grubu B', programId: 100, termId: 1, studentIds: [6, 7, 8, 9, 10] },
  { name: '2026 Güz Grubu', programId: 101, termId: 2, studentIds: [11, 12, 13] },
];
