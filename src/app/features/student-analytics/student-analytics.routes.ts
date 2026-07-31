import { Routes } from '@angular/router';

export const STUDENT_ANALYTICS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./student-analytics.page').then(m => m.StudentAnalyticsPage) }
];
