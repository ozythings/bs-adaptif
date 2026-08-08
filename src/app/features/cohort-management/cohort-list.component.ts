import { Component, inject, signal, computed, OnInit, viewChild, TemplateRef } from '@angular/core';
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
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { CohortManagementFacade } from './cohort-management.facade';
import { Cohort } from '@core/models/cohort.model';
import { EntityStore } from '@core/state/entity.store';
import { ErrorStateComponent, ConfirmDialogComponent } from '@shared/components';
import { PermissionService } from '@core/auth/permission.service';

@Component({
  selector: 'app-cohort-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule, MatTableModule, MatSortModule, MatDialogModule, RouterLink, ErrorStateComponent, ConfirmDialogComponent],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Cohortlar</h1>
        <div class="flex items-center gap-2">
          <a mat-stroked-button [routerLink]="['/cohorts/analytics']" [queryParams]="{cohorts: cohorts().map(c => c.id).join(',')}">
            <mat-icon>analytics</mat-icon> Cohort Analizi
          </a>
          @if (canModify()) {
            <button mat-raised-button color="primary" (click)="openNewForm()">
              <mat-icon>add</mat-icon> Yeni Cohort
            </button>
          }
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
          <table mat-table matSort [dataSource]="filteredCohorts()" class="w-full" (matSortChange)="onSort($event)">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="w-16">ID</th>
              <td mat-cell *matCellDef="let c">{{ c.id }}</td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Ad</th>
              <td mat-cell *matCellDef="let c" class="font-medium">{{ c.name }}</td>
            </ng-container>
            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Açıklama</th>
              <td mat-cell *matCellDef="let c">{{ c.description || '-' }}</td>
            </ng-container>
            <ng-container matColumnDef="studentCount">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="w-24">Öğrenci</th>
              <td mat-cell *matCellDef="let c">{{ c.studentIds.length }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="w-40"></th>
              <td mat-cell *matCellDef="let c">
                @if (canModify()) {
                  <div class="flex items-center">
                    <button class mat-icon-button (click)="openStudentDialog(c)" matTooltip="Öğrenciler">
                      <mat-icon class="!text-gray-700">people</mat-icon>
                    </button>
                    <button mat-icon-button (click)="onEdit(c)" matTooltip="Düzenle">
                      <mat-icon class="!text-gray-700">edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="onDelete(c)" matTooltip="Sil">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
        </div>
      }
    </div>

    <ng-template #studentDialog>
      <h2 mat-dialog-title>Öğrenci Yönetimi — {{ editingCohort()?.name }}</h2>
      <mat-dialog-content class="min-w-[400px] !pt-4 !pb-2">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Öğrenci Ara</mat-label>
          <input matInput [value]="participantSearch()" (input)="participantSearch.set($any($event.target).value)" placeholder="İsim veya numara...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full" class="mt-3">
          <mat-label>Öğrenciler</mat-label>
          <mat-select [value]="selectedStudentIds()" (selectionChange)="selectedStudentIds.set($event.value)" multiple>
            @for (p of filteredParticipants(); track p.id) {
              <mat-option [value]="p.id">{{ p.firstName }} {{ p.lastName }} ({{ p.schoolNumber }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>İptal</button>
        <button mat-raised-button color="primary" (click)="saveStudents()">Kaydet</button>
      </mat-dialog-actions>
    </ng-template>
  `
})
export class CohortListComponent implements OnInit {
  private facade = inject(CohortManagementFacade);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private store = inject(EntityStore);
  private permissionService = inject(PermissionService);

  canModify = computed(() =>
    this.permissionService.hasAnyPermission(['cohort_create', 'cohort_update', 'cohort_delete'])
  );

  loading = signal(true);
  error = signal<string | null>(null);
  showForm = signal(false);
  editingId = signal<number | null>(null);
  cohorts = signal<Cohort[]>([]);
  searchTerm = signal('');
  sortColumn = signal('');
  sortDirection = signal<'asc' | 'desc' | ''>('');

  filteredCohorts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const list = this.cohorts();
    const filtered = term
      ? list.filter(c => c.name.toLowerCase().includes(term) || (c.description ?? '').toLowerCase().includes(term))
      : [...list];
    const col = this.sortColumn();
    const dir = this.sortDirection();
    if (col && dir) {
      filtered.sort((a, b) => {
        let va: any, vb: any;
        switch (col) {
          case 'id': va = a.id; vb = b.id; break;
          case 'name': va = a.name.toLowerCase(); vb = b.name.toLowerCase(); break;
          case 'description': va = (a.description ?? '').toLowerCase(); vb = (b.description ?? '').toLowerCase(); break;
          case 'studentCount': va = a.studentIds.length; vb = b.studentIds.length; break;
          default: return 0;
        }
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return dir === 'asc' ? cmp : -cmp;
      });
    }
    return filtered;
  });

  onSort(sort: Sort): void {
    this.sortColumn.set(sort.active);
    this.sortDirection.set(sort.direction);
  }

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

  studentDialogTpl = viewChild<TemplateRef<any>>('studentDialog');
  editingCohort = signal<Cohort | null>(null);
  selectedStudentIds = signal<number[]>([]);
  participantSearch = signal('');

  filteredParticipants = computed(() => {
    const search = this.participantSearch().toLowerCase();
    const all = this.store.participants();
    if (!search) return all;
    return all.filter(p =>
      p.firstName.toLowerCase().includes(search) ||
      p.lastName.toLowerCase().includes(search) ||
      p.schoolNumber.includes(search)
    );
  });

  openStudentDialog(cohort: Cohort): void {
    this.editingCohort.set(cohort);
    this.selectedStudentIds.set([...cohort.studentIds]);
    const tpl = this.studentDialogTpl();
    if (tpl) this.dialog.open(tpl).afterClosed().subscribe(() => this.editingCohort.set(null));
  }

  saveStudents(): void {
    const cohort = this.editingCohort();
    if (!cohort) return;
    this.facade.updateCohort(cohort.id, { studentIds: this.selectedStudentIds() }).subscribe(() => {
      this.loadData();
      this.dialog.closeAll();
    });
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
