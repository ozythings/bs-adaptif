import { Component,  inject,  signal,  computed,  DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { Attempt } from '@core/models/attempt.model';
import { GradingFacade } from './data-access/grading.facade';
import { ErrorStateComponent } from '@shared/components';
import { DebounceDirective } from '@shared/directives';
import { PermissionService } from '@core/auth/permission.service';

@Component({
  selector: 'app-grading-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatTableModule, MatProgressSpinnerModule, MatPaginatorModule, MatSortModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSlideToggleModule, MatChipsModule, ErrorStateComponent, DebounceDirective],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Sınav Değerlendirmeleri</h1>
        <div class="flex items-center gap-3">
          <mat-slide-toggle [checked]="showCompleted()" (change)="toggleMode($event.checked)">
            Değerlendirilenler
          </mat-slide-toggle>
          @if (canModify()) {
            <button mat-raised-button color="primary" routerLink="/grading/rubrics">
              <mat-icon>assignment</mat-icon> Rubrik Yönetimi
            </button>
          }
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm p-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Sınav Ara</mat-label>
          <mat-select [value]="examFilter()" (selectionChange)="onExamFilterChange($event.value)">
            <mat-option [value]="0">Tüm Sınavlar</mat-option>
            @for (e of examTitles(); track e.id) {
              <mat-option [value]="e.id">{{ e.title }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Öğrenci Ara</mat-label>
          <input matInput [value]="searchText()" [appDebounce]="300" (debouncedChange)="onSearch($event)" placeholder="Öğrenci adı ile ara...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm overflow-x-auto">
        @if (loading()) {
          <div class="flex justify-center py-12">
            <mat-spinner diameter="40" />
          </div>
        } @else if (error(); as err) {
          <app-error-state [title]="'Hata'" [message]="err" [retryable]="true" (retry)="loadData()" />
        } @else if (pagedAttempts().length === 0) {
          <div class="text-center p-8 text-gray-500">
            <mat-icon class="text-4xl mb-2">fact_check</mat-icon>
            <p>{{ showCompleted() ? 'Değerlendirilmiş sınav bulunmuyor' : 'Değerlendirme bekleyen sınav bulunmuyor' }}</p>
          </div>
        } @else {
          <table mat-table matSort [dataSource]="pagedAttempts()" class="w-full" (matSortChange)="onSort($event)">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
              <td mat-cell *matCellDef="let a">{{ a.id }}</td>
            </ng-container>

            <ng-container matColumnDef="student">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Öğrenci</th>
              <td mat-cell *matCellDef="let a">
                <a [routerLink]="['/grading', a.id]" class="text-blue-600 hover:underline">{{ getStudentName(a.studentId) }}</a>
              </td>
            </ng-container>

            <ng-container matColumnDef="exam">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Sınav</th>
              <td mat-cell *matCellDef="let a">{{ getExamName(a.examId) }}</td>
            </ng-container>

            <ng-container matColumnDef="autoScore">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Otomatik Puan</th>
              <td mat-cell *matCellDef="let a" class="font-medium">{{ a.totalScore }} / {{ a.maxScore }}</td>
            </ng-container>

            <ng-container matColumnDef="manualScore">
              <th mat-header-cell *matHeaderCellDef>Manuel Puan</th>
              <td mat-cell *matCellDef="let a">
                @if (getManualScore(a); as ms) {
                  <span class="font-medium text-indigo-600">{{ ms }}</span>
                } @else {
                  <span class="text-gray-400">-</span>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Durum</th>
              <td mat-cell *matCellDef="let a">
                <span class="px-2 py-1 rounded-full text-xs font-medium"
                  [class.bg-yellow-100]="a.status === 'draft'"
                  [class.text-yellow-700]="a.status === 'draft'"
                  [class.bg-green-100]="a.status === 'finalized'"
                  [class.text-green-700]="a.status === 'finalized'">
                  {{ a.status === 'draft' ? 'Bekliyor' : 'Sonuçlandı' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>İşlemler</th>
              <td mat-cell *matCellDef="let a">
                <button mat-stroked-button color="primary" [routerLink]="['/grading', a.id]">
                  <mat-icon>{{ a.status === 'finalized' ? 'visibility' : 'rate_review' }}</mat-icon>
                  {{ a.status === 'finalized' ? 'Görüntüle' : 'Değerlendir' }}
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
          <mat-paginator
            [pageSize]="pageSize()"
            [pageSizeOptions]="[5, 10, 25]"
            [length]="totalCount()"
            [pageIndex]="pageIndex()"
            (page)="onPage($event)"
            showFirstLastButtons>
          </mat-paginator>
        }
      </div>
    </div>
  `
})
export class GradingListPage {
  private gradingFacade = inject(GradingFacade);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private permissionService = inject(PermissionService);

  canModify = computed(() =>
    this.permissionService.hasAnyPermission(['grading_grade'])
  );

  loading = signal(true);
  error = signal<string | null>(null);
  showCompleted = signal(false);
  examFilter = signal(0);
  searchText = signal('');
  pageSize = signal(10);
  pageIndex = signal(0);

  attempts = signal<Attempt[]>([]);
  examTitles = signal<{ id: number; title: string }[]>([]);

  displayedColumns = ['id', 'student', 'exam', 'autoScore', 'manualScore', 'status', 'actions'];

  filteredAttempts = computed(() => {
    const filterId = this.examFilter();
    const search = this.searchText().toLowerCase();
    return this.attempts().filter(a => {
      const matchExam = filterId === 0 || a.examId === filterId;
      const matchSearch = !search || this.getStudentName(a.studentId).toLowerCase().includes(search);
      return matchExam && matchSearch;
    });
  });

  totalCount = computed(() => this.filteredAttempts().length);

  sortColumn = signal('');
  sortDirection = signal<'asc' | 'desc' | ''>('');

  sortedAttempts = computed(() => {
    const data = [...this.filteredAttempts()];
    const col = this.sortColumn();
    const dir = this.sortDirection();
    if (!col || !dir) return data;
    data.sort((a, b) => {
      let va: any, vb: any;
      switch (col) {
        case 'id': va = a.id; vb = b.id; break;
        case 'student': va = this.getStudentName(a.studentId); vb = this.getStudentName(b.studentId); break;
        case 'exam': va = this.getExamName(a.examId); vb = this.getExamName(b.examId); break;
        case 'autoScore': va = a.totalScore; vb = b.totalScore; break;
        case 'status': va = a.status; vb = b.status; break;
        default: return 0;
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return dir === 'asc' ? cmp : -cmp;
    });
    return data;
  });

  pagedAttempts = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.sortedAttempts().slice(start, start + this.pageSize());
  });

  onSort(sort: Sort): void {
    this.sortColumn.set(sort.active);
    this.sortDirection.set(sort.direction);
  }

  constructor() {
    const qp = this.route.snapshot.queryParamMap;
    if (qp.get('exam')) this.examFilter.set(Number(qp.get('exam')));
    if (qp.get('search')) this.searchText.set(qp.get('search')!);
    if (qp.get('page')) this.pageIndex.set(Number(qp.get('page')));
    if (qp.get('pageSize')) this.pageSize.set(Number(qp.get('pageSize')));
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.examTitles.set(this.gradingFacade.getExamTitles());
    (this.showCompleted() ? this.gradingFacade.getCompletedAttempts() : this.gradingFacade.getPendingGrading()).subscribe({
      next: (data) => {
        this.attempts.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Değerlendirme listesi yüklenirken hata oluştu');
        this.loading.set(false);
      }
    });
  }

  toggleMode(checked: boolean): void {
    this.showCompleted.set(checked);
    this.pageIndex.set(0);
    this.searchText.set('');
    this.examFilter.set(0);
    this.loadData();
  }

  onExamFilterChange(value: number): void {
    this.examFilter.set(value);
    this.pageIndex.set(0);
    this.syncUrl();
  }

  onSearch(term: string): void {
    this.searchText.set(term);
    this.pageIndex.set(0);
    this.syncUrl();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.syncUrl();
  }

  syncUrl(): void {
    const params: Record<string, any> = {};
    if (this.examFilter() !== 0) params['exam'] = this.examFilter();
    if (this.searchText()) params['search'] = this.searchText();
    if (this.pageIndex() > 0) params['page'] = this.pageIndex();
    if (this.pageSize() !== 10) params['pageSize'] = this.pageSize();
    this.router.navigate([], { queryParams: params, replaceUrl: true });
  }

  getStudentName(id: number): string {
    return this.gradingFacade.getStudentName(id);
  }

  getExamName(id: number): string {
    return this.gradingFacade.getExamName(id);
  }

  getManualScore(attempt: Attempt): number | null {
    const manualScores = attempt.questionResponses
      .filter(r => r.manualScore !== undefined)
      .map(r => r.manualScore!);
    return manualScores.length > 0 ? manualScores.reduce((a, b) => a + b, 0) : null;
  }
}
