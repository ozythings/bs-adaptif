import { Routes } from '@angular/router';

export const EXAMS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./exam-list').then(m => m.ExamListPage) }
];
