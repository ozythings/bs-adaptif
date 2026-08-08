import { Routes } from '@angular/router';

export const COHORT_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./cohort-list.component').then(m => m.CohortListComponent) },
  { path: 'analytics', loadComponent: () => import('../cohort-analytics/cohort-analytics.page').then(m => m.CohortAnalyticsPage) },
];
