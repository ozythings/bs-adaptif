import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ParticipantFacade } from './data-access/participant.facade';
import { ErrorStateComponent } from '@shared/components';
import { Participant } from '@core/models/participant.model';

@Component({
  selector: 'app-participant-profile',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, ErrorStateComponent
  ],
  template: `
    <div class="max-w-2xl mx-auto space-y-4">
      @if (loading()) {
        <div class="flex justify-center py-12"><mat-spinner diameter="40" /></div>
      } @else if (error(); as err) {
        <app-error-state [title]="'Hata'" [message]="err" [retryable]="true" (retry)="loadData()" />
      } @else if (participant(); as p) {
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button mat-icon-button routerLink="/learning/dashboard" matTooltip="Geri Dön">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Profil</h1>
              <p class="text-gray-500">{{ p.firstName }} {{ p.lastName }} ({{ p.schoolNumber }})</p>
            </div>
          </div>
        </div>

        <mat-card appearance="outlined" class="p-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-gray-500 mb-1">Ad</p>
              <p class="font-medium">{{ p.firstName }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Soyad</p>
              <p class="font-medium">{{ p.lastName }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Okul Numarası</p>
              <p class="font-medium">{{ p.schoolNumber }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">E-posta</p>
              <p class="font-medium">{{ p.email }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Telefon</p>
              <p class="font-medium">{{ p.phone }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Doğum Tarihi</p>
              <p class="font-medium">{{ p.birthDate || '-' }}</p>
            </div>
          </div>
        </mat-card>
      }
    </div>
  `
})
export class ParticipantProfilePage implements OnInit {
  private facade = inject(ParticipantFacade);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  error = signal<string | null>(null);
  participant = signal<Participant | undefined>(undefined);
  participantId = 0;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(id)) {
      this.error.set('Geçersiz öğrenci ID');
      this.loading.set(false);
      return;
    }
    this.participantId = id;
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.facade.getParticipant(this.participantId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: p => {
        if (!p) {
          this.error.set('Öğrenci bulunamadı');
        } else {
          this.participant.set(p);
        }
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e.message || 'Öğrenci yüklenemedi');
        this.loading.set(false);
      }
    });
  }
}
