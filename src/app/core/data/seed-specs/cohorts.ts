export interface CohortSpec {
  name: string;
  programId: number;
  termId: number;
  studentIds: number[];
}

export const COHORT_SPECS: CohortSpec[] = [
  { name: '2024 Bahar Grubu A', programId: 100, termId: 100, studentIds: [1, 2, 3, 4, 5] },
  { name: '2024 Bahar Grubu B', programId: 100, termId: 100, studentIds: [6, 7, 8, 9, 10] },
  { name: '2024 Yaz Grubu', programId: 101, termId: 101, studentIds: [11, 12, 13] },
];
