import { Routes } from '@angular/router';

export const QUESTIONS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./question-bank.page').then(m => m.QuestionBankPage) },
];
