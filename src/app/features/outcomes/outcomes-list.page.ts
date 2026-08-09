import { Component,  inject,  signal,  computed,  OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { uniqueCodeValidator } from '@shared/validators/unique-code.validator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSortModule, Sort } from '@angular/material/sort';
import { OutcomesFacade } from './data-access/outcomes.facade';
import { LearningOutcome } from '@core/models/learning-outcome.model';
import { OutcomeLevel, OutcomeStatus } from '@core/models/enums';
import { StatusTextPipe } from '@shared/pipes';
import { ErrorStateComponent, ConfirmDialogComponent } from '@shared/components';
import { PermissionService } from '@core/auth/permission.service';

@Component({
  selector: 'app-outcomes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule, MatButtonModule, MatIconModule, MatCardModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatTableModule, MatPaginatorModule, MatDialogModule, MatSortModule, StatusTextPipe, ErrorStateComponent],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Kazanımlar</h1>
        <div class="flex gap-2">
          <button mat-stroked-button routerLink="/outcomes/map">
            <mat-icon>account_tree</mat-icon> Grafik
          </button>
          @if (canModify()) {
            <button mat-raised-button color="primary" (click)="openNewForm()">
              <mat-icon>add</mat-icon> Yeni
            </button>
          }
        </div>
      </div>

      @if (canModify() && showForm()) {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="bg-white rounded-lg shadow-sm p-4 space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <mat-form-field appearance="outline">
              <mat-label>Kod</mat-label>
              <input matInput formControlName="code" placeholder="ANG-01">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Ad</mat-label>
              <input matInput formControlName="name">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Seviye</mat-label>
              <mat-select formControlName="level">
                @for (l of levels; track l) { <mat-option [value]="l">{{ l | statusText }}</mat-option> }
              </mat-select>
            </mat-form-field>
          </div>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Açıklama</mat-label>
            <textarea matInput formControlName="description" rows="2"></textarea>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Önkoşullar</mat-label>
            <mat-select formControlName="prerequisiteIds" multiple>
              @for (o of facade.outcomes(); track o.id) {
                <mat-option [value]="o.id">{{ o.code }} - {{ o.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Ders</mat-label>
            <mat-select formControlName="courseId">
              @for (c of facade.courses; track c.id) {
                <mat-option [value]="c.id">{{ c.title }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <div class="flex gap-2">
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">
              {{ editingOutcomeId() ? 'Güncelle' : 'Kaydet' }}
            </button>
            <button mat-button type="button" (click)="cancelForm()">İptal</button>
          </div>
        </form>
      }

      <div class="bg-white rounded-lg shadow-sm p-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Kazanım Ara</mat-label>
          <input matInput [(ngModel)]="searchText" (ngModelChange)="onSearch()" placeholder="Kod veya ad ile ara...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Seviye</mat-label>
          <mat-select [value]="levelFilter()" (selectionChange)="onLevelChange($event.value)">
            <mat-option [value]="null">Tümü</mat-option>
            @for (lvl of levelOptions; track lvl.value) {
              <mat-option [value]="lvl.value">{{ lvl.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Durum</mat-label>
          <mat-select [value]="statusFilter()" (selectionChange)="onStatusChange($event.value)">
            <mat-option [value]="null">Tümü</mat-option>
            <mat-option [value]="OutcomeStatus.ACTIVE">Aktif</mat-option>
            <mat-option [value]="OutcomeStatus.INACTIVE">Pasif</mat-option>
          </mat-select>
        </mat-form-field>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-8"><mat-spinner diameter="32" /></div>
      } @else if (error()) {
        <app-error-state [title]="'Kazanımlar yüklenemedi'" [message]="error()!" (retry)="loadData()" />
      } @else if (filteredCount() === 0) {
        <div class="bg-white rounded-lg shadow-sm text-center p-12 text-gray-500">
          <mat-icon class="text-4xl mb-2">school</mat-icon>
          <p>Kazanım bulunamadı</p>
        </div>
      } @else {
        <div class="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table mat-table matSort [dataSource]="pagedOutcomes()" class="w-full" (matSortChange)="onSort($event)">
            <ng-container matColumnDef="code">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Kod</th>
              <td mat-cell *matCellDef="let o"><strong>{{ o.code }}</strong></td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Ad</th>
              <td mat-cell *matCellDef="let o">{{ o.name }}</td>
            </ng-container>
            <ng-container matColumnDef="level">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Seviye</th>
              <td mat-cell *matCellDef="let o">{{ o.level | statusText }}</td>
            </ng-container>
            <ng-container matColumnDef="prerequisites">
              <th mat-header-cell *matHeaderCellDef>Önkoşul</th>
              <td mat-cell *matCellDef="let o">
                @for (p of getPrereqCodes(o); track p) { <span class="tag">{{ p }}</span> }
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
               <td mat-cell *matCellDef="let o">
                @if (canModify()) {
                  <button mat-icon-button (click)="onEdit(o)" matTooltip="Düzenle">
                    <mat-icon class="!text-gray-700">edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="onDelete(o)" matTooltip="Sil">
                    <mat-icon>delete</mat-icon>
                  </button>
                }
               </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
          <mat-paginator
            [pageSize]="pageSize()"
            [pageSizeOptions]="[5, 10, 25]"
            [length]="filteredCount()"
            [pageIndex]="pageIndex()"
            (page)="onPage($event)"
            showFirstLastButtons>
          </mat-paginator>
        </div>
      }
    </div>
  `,
  styles: ['.tag { display: inline-block; padding: 2px 6px; margin: 1px; background: #e0f2fe; border-radius: 4px; font-size: 11px; }']
})
export class OutcomesListPage implements OnInit {
  protected facade = inject(OutcomesFacade);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private permissionService = inject(PermissionService);

  canModify = computed(() =>
    this.permissionService.hasAnyPermission(['outcome_create', 'outcome_update', 'outcome_delete'])
  );

  ngOnInit() {
    const qp = this.route.snapshot.queryParamMap;
    if (qp.get('search')) this.searchText = qp.get('search')!;
    if (qp.get('level')) this.levelFilter.set(qp.get('level') as OutcomeLevel);
    if (qp.get('status')) this.statusFilter.set(qp.get('status') as OutcomeStatus);
    if (qp.get('page')) this.pageIndex.set(Number(qp.get('page')));
    if (qp.get('pageSize')) this.pageSize.set(Number(qp.get('pageSize')));
    this.loadData();
  }

  loading = signal(false);
  error = signal<string | null>(null);
  showForm = signal(false);
  editingOutcomeId = signal<number | null>(null);
  searchText = '';
  pageSize = signal(10);
  pageIndex = signal(0);
  levelFilter = signal<OutcomeLevel | null>(null);
  statusFilter = signal<OutcomeStatus | null>(null);
  levels = Object.values(OutcomeLevel);
  readonly OutcomeStatus = OutcomeStatus;
  columns = ['code', 'name', 'level', 'prerequisites', 'actions'];

  levelOptions = [
    { value: OutcomeLevel.REMEMBER, label: 'Hatırlama' },
    { value: OutcomeLevel.UNDERSTAND, label: 'Anlama' },
    { value: OutcomeLevel.APPLY, label: 'Uygulama' },
    { value: OutcomeLevel.ANALYZE, label: 'Çözümleme' },
    { value: OutcomeLevel.EVALUATE, label: 'Değerlendirme' },
    { value: OutcomeLevel.CREATE, label: 'Oluşturma' },
  ];

  filteredOutcomes = computed(() => {
    const s = this.searchText.toLowerCase();
    const level = this.levelFilter();
    const status = this.statusFilter();
    return this.facade.outcomes().filter(o =>
      (!s || o.code.toLowerCase().includes(s) || o.name.toLowerCase().includes(s)) &&
      (!level || o.level === level) &&
      (!status || o.status === status)
    );
  });

  sortColumn = signal('');
  sortDirection = signal<'asc' | 'desc' | ''>('');

  sortedOutcomes = computed(() => {
    const data = [...this.filteredOutcomes()];
    const col = this.sortColumn();
    const dir = this.sortDirection();
    if (!col || !dir) return data;
    data.sort((a, b) => {
      const va = col === 'code' ? a.code : col === 'name' ? a.name : String(a.level);
      const vb = col === 'code' ? b.code : col === 'name' ? b.name : String(b.level);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return dir === 'asc' ? cmp : -cmp;
    });
    return data;
  });

  filteredCount = computed(() => this.filteredOutcomes().length);

  pagedOutcomes = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.sortedOutcomes().slice(start, start + this.pageSize());
  });

  onSort(sort: Sort): void {
    this.sortColumn.set(sort.active);
    this.sortDirection.set(sort.direction);
  }

  form = this.fb.group({
    code: ['', [Validators.required], [uniqueCodeValidator(this.facade.outcomes().map(o => o.code))]],
    name: ['', Validators.required],
    description: [''],
    level: [OutcomeLevel.REMEMBER, Validators.required],
    courseId: [1, Validators.required],
    prerequisiteIds: [[] as number[]],
    isActive: [true],
    status: [OutcomeStatus.ACTIVE],
    sortOrder: [0]
  });

  loadData(): void {
    this.error.set(null);
    if (this.facade.outcomes().length === 0) {
      this.loading.set(true);
      this.facade.getByCourse(1).subscribe({
        next: () => this.loading.set(false),
        error: e => { this.error.set(e.message || 'Kazanımlar yüklenemedi'); this.loading.set(false); }
      });
    }
  }

  onSearch(): void {
    this.pageIndex.set(0);
    this.syncUrl();
  }

  onLevelChange(level: OutcomeLevel | null): void {
    this.levelFilter.set(level);
    this.pageIndex.set(0);
    this.syncUrl();
  }

  onStatusChange(status: OutcomeStatus | null): void {
    this.statusFilter.set(status);
    this.pageIndex.set(0);
    this.syncUrl();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.syncUrl();
  }

  private syncUrl(): void {
    const params: Record<string, any> = {};
    if (this.searchText) params['search'] = this.searchText;
    if (this.levelFilter()) params['level'] = this.levelFilter();
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.pageIndex() > 0) params['page'] = this.pageIndex();
    if (this.pageSize() !== 10) params['pageSize'] = this.pageSize();
    this.router.navigate([], { queryParams: params, replaceUrl: true });
  }

  getPrereqCodes(outcome: LearningOutcome): string[] {
    return outcome.prerequisiteIds.map(id => {
      const o = this.facade.outcomes().find(x => x.id === id);
      return o ? o.code : '';
    }).filter(Boolean);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const editId = this.editingOutcomeId();
    if (editId) {
      this.facade.update(editId, this.form.value as any).subscribe(() => {
        this.showForm.set(false);
        this.editingOutcomeId.set(null);
        this.form.reset({ courseId: 1, level: OutcomeLevel.REMEMBER, isActive: true, status: OutcomeStatus.ACTIVE, prerequisiteIds: [], sortOrder: 0 });
      });
    } else {
      this.facade.create(this.form.value as any).subscribe(() => {
        this.showForm.set(false);
        this.form.reset({ courseId: 1, level: OutcomeLevel.REMEMBER, isActive: true, status: OutcomeStatus.ACTIVE, prerequisiteIds: [], sortOrder: 0 });
      });
    }
  }

  openNewForm(): void {
    this.editingOutcomeId.set(null);
    const codeControl = this.form.get('code');
    if (codeControl) {
      codeControl.clearAsyncValidators();
      codeControl.setAsyncValidators([uniqueCodeValidator(this.facade.outcomes().map(o => o.code))]);
      codeControl.updateValueAndValidity();
    }
    this.form.reset({ courseId: 1, level: OutcomeLevel.REMEMBER, isActive: true, status: OutcomeStatus.ACTIVE, prerequisiteIds: [], sortOrder: 0 });
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingOutcomeId.set(null);
  }

  onEdit(outcome: LearningOutcome): void {
    this.editingOutcomeId.set(outcome.id);
    this.showForm.set(true);
    const codeControl = this.form.get('code');
    if (codeControl) {
      codeControl.clearAsyncValidators();
      codeControl.setAsyncValidators([uniqueCodeValidator(
        this.facade.outcomes().map(o => o.code).filter(c => c !== outcome.code),
        outcome.code
      )]);
      codeControl.updateValueAndValidity();
    }
    this.form.patchValue({
      code: outcome.code,
      name: outcome.name,
      description: outcome.description,
      level: outcome.level,
      courseId: outcome.courseId,
      prerequisiteIds: outcome.prerequisiteIds,
      isActive: outcome.isActive,
      status: outcome.status,
      sortOrder: outcome.sortOrder,
    });
  }

  onDelete(outcome: LearningOutcome): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Kazanımı Sil',
        message: `"${outcome.name}" kazanımını silmek istediğinize emin misiniz?`,
        confirmLabel: 'Sil',
        cancelLabel: 'İptal',
      },
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.facade.delete(outcome.id).subscribe();
    });
  }
}
