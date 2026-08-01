import { Routes } from '@angular/router';

export const ITEM_ANALYSIS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./item-analysis.page').then(m => m.ItemAnalysisPage) }
];
