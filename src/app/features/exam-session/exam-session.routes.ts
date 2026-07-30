import { Routes } from '@angular/router';

export const EXAM_SESSION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./exam-session.page').then(m => m.ExamSessionPage)
  }
];
