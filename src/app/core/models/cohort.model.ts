export interface Cohort {
  id: number;
  name: string;
  programId: number;
  termId: number;
  studentIds: number[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CohortComparisonMetric {
  metric: string;
  cohortValues: { cohortId: number; value: number }[];
  average: number;
  minCohortSize: number;
}
