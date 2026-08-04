import { Routes } from '@angular/router';

export const COHORT_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./cohort-page.component').then(m => m.CohortPageComponent) }
];
