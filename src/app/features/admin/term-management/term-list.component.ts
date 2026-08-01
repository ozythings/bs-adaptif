import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ConfirmDialogComponent } from '@shared/components';
import { Term } from '@core/models/term.model';

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

let nextId = 4;

@Component({
  selector: 'app-term-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Dönem Yönetimi</h1>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon> Yeni Dönem
        </button>
      </div>

      @if (showForm()) {
        <mat-card class="p-4">
          <h2 class="text-lg font-semibold text-gray-900 mb-3">{{ editingId() ? 'Dönem Düzenle' : 'Yeni Dönem Ekle' }}</h2>
          <form [formGroup]="termForm" (ngSubmit)="save()">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Dönem Adı</mat-label>
                <input matInput formControlName="name" placeholder="Örn: 2025 Güz">
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Başlangıç Tarihi</mat-label>
                <input matInput [matDatepicker]="startPicker" formControlName="startDate">
                <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
                <mat-datepicker #startPicker></mat-datepicker>
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Bitiş Tarihi</mat-label>
                <input matInput [matDatepicker]="endPicker" formControlName="endDate">
                <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
                <mat-datepicker #endPicker></mat-datepicker>
              </mat-form-field>
              <div class="flex items-center h-full pb-5">
                <mat-slide-toggle formControlName="isActive">Aktif</mat-slide-toggle>
              </div>
            </div>
            <div class="flex gap-2">
              <button mat-raised-button color="primary" type="submit" [disabled]="termForm.invalid">
                <mat-icon>save</mat-icon> Kaydet
              </button>
              <button mat-stroked-button type="button" (click)="cancelForm()">İptal</button>
            </div>
          </form>
        </mat-card>
      }

      <mat-card class="overflow-x-auto">
        @if (terms().length === 0) {
          <div class="text-center p-8 text-gray-500">
            <mat-icon class="text-4xl mb-2">event</mat-icon>
            <p>Henüz dönem bulunmuyor</p>
          </div>
        } @else {
          <table mat-table [dataSource]="terms()" class="w-full">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Dönem Adı</th>
              <td mat-cell *matCellDef="let t">{{ t.name }}</td>
            </ng-container>
            <ng-container matColumnDef="startDate">
              <th mat-header-cell *matHeaderCellDef>Başlangıç</th>
              <td mat-cell *matCellDef="let t">{{ t.startDate }}</td>
            </ng-container>
            <ng-container matColumnDef="endDate">
              <th mat-header-cell *matHeaderCellDef>Bitiş</th>
              <td mat-cell *matCellDef="let t">{{ t.endDate }}</td>
            </ng-container>
            <ng-container matColumnDef="isActive">
              <th mat-header-cell *matHeaderCellDef>Durum</th>
              <td mat-cell *matCellDef="let t">
                @if (t.isActive) {
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <mat-icon class="text-sm">check_circle</mat-icon> Aktif
                  </span>
                } @else {
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    <mat-icon class="text-sm">remove_circle</mat-icon> Pasif
                  </span>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="w-28"></th>
              <td mat-cell *matCellDef="let t">
                <button mat-icon-button color="primary" (click)="editTerm(t)" title="Düzenle">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="deleteTerm(t)" title="Sil">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        }
      </mat-card>
    </div>
  `
})
export class TermListComponent {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  terms = signal<Term[]>([
    { id: 1, name: '2024 Güz', startDate: '2024-09-15', endDate: '2025-01-15', isActive: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { id: 2, name: '2025 Bahar', startDate: '2025-02-10', endDate: '2025-06-10', isActive: false, createdAt: '2024-01-01', updatedAt: '2024-06-01' },
    { id: 3, name: '2025 Güz', startDate: '2025-09-15', endDate: '2026-01-15', isActive: true, createdAt: '2025-01-01', updatedAt: '2025-08-01' },
  ]);

  showForm = signal(false);
  editingId = signal<number | null>(null);
  displayedColumns = ['name', 'startDate', 'endDate', 'isActive', 'actions'];

  termForm = this.fb.group({
    name: ['', Validators.required],
    startDate: [null as Date | null, Validators.required],
    endDate: [null as Date | null, Validators.required],
    isActive: [false],
  });

  openCreateDialog(): void {
    this.editingId.set(null);
    this.termForm.reset({ name: '', startDate: null, endDate: null, isActive: false });
    this.showForm.set(true);
  }

  editTerm(term: Term): void {
    this.editingId.set(term.id);
    this.termForm.patchValue({
      name: term.name,
      startDate: new Date(term.startDate),
      endDate: new Date(term.endDate),
      isActive: term.isActive,
    });
    this.showForm.set(true);
  }

  save(): void {
    if (this.termForm.invalid) return;
    const fv = this.termForm.value;
    const now = todayStr();
    const id = this.editingId();
    const startStr = this.toDateString(fv.startDate!);
    const endStr = this.toDateString(fv.endDate!);

    if (id) {
      this.terms.update(list =>
        list.map(t => t.id === id ? { ...t, name: fv.name!, startDate: startStr, endDate: endStr, isActive: fv.isActive!, updatedAt: now } : t)
      );
    } else {
      const newTerm: Term = {
        id: nextId++,
        name: fv.name!,
        startDate: startStr,
        endDate: endStr,
        isActive: fv.isActive!,
        createdAt: now,
        updatedAt: now,
      };
      this.terms.update(list => [...list, newTerm]);
    }
    this.cancelForm();
  }

  private toDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  deleteTerm(term: Term): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Dönem Sil',
        message: `"${term.name}" dönemini silmek istediğinize emin misiniz?`,
        confirmLabel: 'Sil',
        cancelLabel: 'İptal',
      },
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.terms.update(list => list.filter(t => t.id !== term.id));
      if (this.editingId() === term.id) this.cancelForm();
    });
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }
}
