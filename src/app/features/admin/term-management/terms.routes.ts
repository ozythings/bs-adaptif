import { Routes } from '@angular/router';

export const TERMS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./term-list.component').then(m => m.TermListComponent) }
];
