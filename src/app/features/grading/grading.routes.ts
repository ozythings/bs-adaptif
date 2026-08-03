import { Routes } from '@angular/router';

export const GRADING_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./grading-list.page').then(m => m.GradingListPage) },
  { path: 'rubrics', loadComponent: () => import('./rubric-management.page').then(m => m.RubricManagementPage) },
  { path: ':attemptId', loadComponent: () => import('./grading-detail.page').then(m => m.GradingDetailPage) }
];
