import { Routes } from '@angular/router';

export const EXAM_BUILDER_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./exam-builder.page').then(m => m.ExamBuilderPage) }
];
