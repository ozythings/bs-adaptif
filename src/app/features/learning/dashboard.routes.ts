import { Routes } from '@angular/router';

export const LEARNING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard.page').then(m => m.DashboardPage)
  }
];
