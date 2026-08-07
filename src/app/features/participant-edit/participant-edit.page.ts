import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ParticipantFacade } from './data-access/participant.facade';
import { NotificationService } from '@core/observability/notification.service';
import { ErrorStateComponent } from '@shared/components';
import { emailValidator } from '@shared/validators/email.validator';
import { phoneValidator } from '@shared/validators/phone.validator';
import { schoolNumberValidator } from '@shared/validators/school-number.validator';
import { Participant } from '@core/models/participant.model';

@Component({
  selector: 'app-participant-edit',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatDatepickerModule, MatTooltipModule, ErrorStateComponent
  ],
  template: `
    <div class="max-w-2xl mx-auto space-y-4">
      @if (loading()) {
        <div class="flex justify-center py-12"><mat-spinner diameter="40" /></div>
      } @else if (error(); as err) {
        <app-error-state [title]="'Hata'" [message]="err" [retryable]="true" (retry)="loadData()" />
      } @else if (participant(); as p) {
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <button mat-icon-button routerLink="/learning/dashboard" matTooltip="Geri Dön">
                <mat-icon>arrow_back</mat-icon>
              </button>
            </div>
            <h1 class="text-2xl font-bold text-gray-900">Profil Düzenle</h1>
            <p class="text-gray-500">{{ p.firstName }} {{ p.lastName }} ({{ p.schoolNumber }})</p>
          </div>
        </div>

        <mat-card appearance="outlined" class="p-5">
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Ad</mat-label>
                <input matInput formControlName="firstName" placeholder="Ad">
                @if (form.controls['firstName'].hasError('required')) {
                  <mat-error>Ad zorunludur</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Soyad</mat-label>
                <input matInput formControlName="lastName" placeholder="Soyad">
                @if (form.controls['lastName'].hasError('required')) {
                  <mat-error>Soyad zorunludur</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Okul Numarası</mat-label>
                <input matInput formControlName="schoolNumber" placeholder="Örn: 2024001">
                @if (form.controls['schoolNumber'].hasError('required')) {
                  <mat-error>Okul numarası zorunludur</mat-error>
                } @else if (form.controls['schoolNumber'].hasError('schoolNumber')) {
                  <mat-error>Geçersiz okul numarası (1-10 haneli rakam)</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>E-posta</mat-label>
                <input matInput formControlName="email" placeholder="ornek@okul.com">
                @if (form.controls['email'].hasError('required')) {
                  <mat-error>E-posta zorunludur</mat-error>
                } @else if (form.controls['email'].hasError('email')) {
                  <mat-error>Geçersiz e-posta formatı</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Telefon</mat-label>
                <input matInput formControlName="phone" placeholder="Örn: 05321234567">
                @if (form.controls['phone'].hasError('required')) {
                  <mat-error>Telefon zorunludur</mat-error>
                } @else if (form.controls['phone'].hasError('phone')) {
                  <mat-error>Geçersiz telefon (05XX veya +90 ile başlamalı)</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Doğum Tarihi</mat-label>
                <input matInput [matDatepicker]="birthPicker" formControlName="birthDate" placeholder="GG/AA/YYYY">
                <mat-datepicker-toggle matIconSuffix [for]="birthPicker"></mat-datepicker-toggle>
                <mat-datepicker #birthPicker></mat-datepicker>
              </mat-form-field>
            </div>

            <div class="flex gap-2 mt-4">
              <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                <mat-icon>save</mat-icon> Kaydet
              </button>
              <button mat-stroked-button type="button" routerLink="/learning/dashboard">İptal</button>
            </div>
          </form>
        </mat-card>
      }
    </div>
  `
})
export class ParticipantEditPage implements OnInit {
  private facade = inject(ParticipantFacade);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private notification = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  participant = signal<Participant | undefined>(undefined);
  participantId = 0;

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      schoolNumber: ['', [Validators.required, schoolNumberValidator()]],
      email: ['', [Validators.required, emailValidator()]],
      phone: ['', [Validators.required, phoneValidator()]],
      birthDate: [null as Date | null],
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(id)) {
      this.error.set('Geçersiz katılımcı ID');
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
          this.error.set('Katılımcı bulunamadı');
        } else {
          this.participant.set(p);
          this.form.patchValue({
            firstName: p.firstName,
            lastName: p.lastName,
            schoolNumber: p.schoolNumber,
            email: p.email,
            phone: p.phone,
            birthDate: p.birthDate ? new Date(p.birthDate) : null,
          });
        }
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e.message || 'Katılımcı yüklenemedi');
        this.loading.set(false);
      }
    });
  }

  save(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const v = this.form.value;
    this.facade.updateParticipant(this.participantId, {
      firstName: v.firstName,
      lastName: v.lastName,
      schoolNumber: v.schoolNumber,
      email: v.email,
      phone: v.phone,
      birthDate: v.birthDate ? this.toDateStr(v.birthDate) : undefined,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.notification.show('Profil güncellendi', 'success');
      },
      error: (e) => {
        this.saving.set(false);
        this.notification.show(e.message || 'Güncelleme başarısız', 'error');
      }
    });
  }

  private toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
