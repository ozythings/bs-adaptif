import { Routes } from '@angular/router';

export const PARTICIPANT_EDIT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./participant-edit.page').then(m => m.ParticipantEditPage)
  }
];
