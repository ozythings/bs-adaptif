import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatButtonModule],
  template: `
    <div class="flex flex-col items-center justify-center py-20">
      <mat-icon class="text-8xl text-gray-300 mb-6">lock</mat-icon>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Erişim Reddedildi</h1>
      <p class="text-gray-500 mb-6">Bu sayfaya erişim yetkiniz bulunmuyor</p>
      <a mat-raised-button color="primary" routerLink="/learning/dashboard">Dashboard'a Dön</a>
    </div>
  `
})
export class AccessDeniedPage {}
