import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { CohortManagementFacade } from './cohort-management.facade';
import { Cohort } from '@core/models/cohort.model';
import { ErrorStateComponent, ConfirmDialogComponent } from '@shared/components';

@Component({
  selector: 'app-cohort-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule, MatTableModule, MatDialogModule, RouterLink, ErrorStateComponent, ConfirmDialogComponent],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Cohortlar</h1>
        <div class="flex items-center gap-2">
          <a mat-stroked-button routerLink="/cohorts/analytics">
            <mat-icon>analytics</mat-icon> Cohort Analizi
          </a>
          <button mat-raised-button color="primary" (click)="openNewForm()">
            <mat-icon>add</mat-icon> Yeni Cohort
          </button>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm p-3">
        <mat-form-field appearance="outline" class="w-full sm:w-72">
          <mat-label>Cohort Ara</mat-label>
          <input matInput [value]="searchTerm()" (input)="onSearch($event)" placeholder="İsim veya açıklama...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
      </div>

      @if (showForm()) {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="bg-white rounded-lg shadow-sm p-4 space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <mat-form-field appearance="outline">
              <mat-label>Cohort Adı</mat-label>
              <input matInput formControlName="name" placeholder="Örn: 2024 Güz Grubu">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Açıklama</mat-label>
              <input matInput formControlName="description" placeholder="Cohort açıklaması">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Dönem</mat-label>
              <mat-select formControlName="termId">
                <mat-option [value]="1">2026 Bahar</mat-option>
                <mat-option [value]="2">2026 Güz</mat-option>
                <mat-option [value]="3">2027 Bahar</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div class="flex gap-2">
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">
              {{ editingId() ? 'Güncelle' : 'Kaydet' }}
            </button>
            <button mat-button type="button" (click)="cancelForm()">İptal</button>
          </div>
        </form>
      }

      @if (loading()) {
        <div class="flex justify-center py-8"><mat-spinner diameter="32" /></div>
      } @else if (error()) {
        <app-error-state [title]="'Cohortlar yüklenemedi'" [message]="error()!" (retry)="loadData()" />
      } @else if (filteredCohorts().length === 0) {
        <div class="bg-white rounded-lg shadow-sm text-center p-12 text-gray-500">
          <mat-icon class="text-4xl mb-2">groups</mat-icon>
          <p>Henüz kohort bulunmuyor</p>
        </div>
      } @else {
        <div class="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table mat-table [dataSource]="filteredCohorts()" class="w-full">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef class="w-16">ID</th>
              <td mat-cell *matCellDef="let c">{{ c.id }}</td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Ad</th>
              <td mat-cell *matCellDef="let c" class="font-medium">{{ c.name }}</td>
            </ng-container>
            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Açıklama</th>
              <td mat-cell *matCellDef="let c">{{ c.description || '-' }}</td>
            </ng-container>
            <ng-container matColumnDef="studentCount">
              <th mat-header-cell *matHeaderCellDef class="w-24">Öğrenci</th>
              <td mat-cell *matCellDef="let c">{{ c.studentIds.length }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="w-28"></th>
              <td mat-cell *matCellDef="let c">
                <div class="flex items-center">
                  <button mat-icon-button (click)="onEdit(c)" matTooltip="Düzenle">
                    <mat-icon class="!text-gray-700">edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="onDelete(c)" matTooltip="Sil">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
        </div>
      }
    </div>
  `
})
export class CohortListComponent implements OnInit {
  private facade = inject(CohortManagementFacade);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  loading = signal(true);
  error = signal<string | null>(null);
  showForm = signal(false);
  editingId = signal<number | null>(null);
  cohorts = signal<Cohort[]>([]);
  searchTerm = signal('');

  filteredCohorts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.cohorts();
    return this.cohorts().filter(c =>
      c.name.toLowerCase().includes(term) ||
      (c.description ?? '').toLowerCase().includes(term)
    );
  });

  columns = ['id', 'name', 'description', 'studentCount', 'actions'];

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    termId: [1, Validators.required],
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.facade.getCohorts().subscribe({
      next: data => {
        this.cohorts.set(data);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.message || 'Cohortlar yüklenirken hata oluştu');
        this.loading.set(false);
      }
    });
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  openNewForm(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', description: '', termId: 1 });
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  onEdit(cohort: Cohort): void {
    this.editingId.set(cohort.id);
    this.showForm.set(true);
    this.form.patchValue({
      name: cohort.name,
      description: cohort.description ?? '',
      termId: cohort.termId,
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const editId = this.editingId();
    const data = this.form.value as { name: string; description: string; termId: number };

    if (editId) {
      this.facade.updateCohort(editId, { name: data.name, description: data.description }).subscribe(() => {
        this.showForm.set(false);
        this.editingId.set(null);
        this.loadData();
      });
    } else {
      this.facade.createCohort({ ...data, programId: 100 }).subscribe(() => {
        this.showForm.set(false);
    this.form.reset({ name: '', description: '', termId: 1 });
        this.loadData();
      });
    }
  }

  onDelete(cohort: Cohort): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Cohortu Sil',
        message: `"${cohort.name}" kohortunu silmek istediğinize emin misiniz?`,
        confirmLabel: 'Sil',
        cancelLabel: 'İptal',
      },
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.facade.deleteCohort(cohort.id).subscribe(() => this.loadData());
    });
  }

}
