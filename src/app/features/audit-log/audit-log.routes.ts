import { Routes } from '@angular/router';

export const AUDIT_LOG_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./audit-log-list.component').then(m => m.AuditLogListComponent) }
];
