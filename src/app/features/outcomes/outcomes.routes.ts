import { Routes } from '@angular/router';

export const OUTCOMES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./outcomes-list.page').then(m => m.OutcomesListPage)
  },
  {
    path: 'map',
    loadComponent: () => import('./outcome-map.page').then(m => m.OutcomeMapPage)
  }
];
