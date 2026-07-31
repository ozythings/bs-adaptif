import { Routes } from '@angular/router';

export const COHORT_ANALYTICS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./cohort-analytics.page').then(m => m.CohortAnalyticsPage) }
];
