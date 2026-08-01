import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { dateRangeValidator } from '@shared/validators/date-range.validator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { AuditLogService, AuditLogSearchRequest } from './data-access/audit-log.facade';
import { StatusTextPipe, DateFormatPipe } from '@shared/pipes';
import { ErrorStateComponent } from '@shared/components';
import { DebounceDirective } from '@shared/directives';
import { AuditAction, UserRole } from '@core/models/enums';
import { AuditLogEntry } from '@core/models/audit-log-entry.model';
import { PageResponse } from '@core/api/mock-api.types';

const ACTION_COLORS: Record<string, string> = {
  [AuditAction.CREATE]: 'bg-green-100 text-green-700',
  [AuditAction.UPDATE]: 'bg-blue-100 text-blue-700',
  [AuditAction.DELETE]: 'bg-red-100 text-red-700',
  [AuditAction.APPROVE]: 'bg-emerald-100 text-emerald-700',
  [AuditAction.REJECT]: 'bg-orange-100 text-orange-700',
  [AuditAction.CANCEL]: 'bg-gray-100 text-gray-700',
  [AuditAction.SWITCH]: 'bg-purple-100 text-purple-700',
  [AuditAction.RESTORE]: 'bg-teal-100 text-teal-700',
  [AuditAction.PUBLISH]: 'bg-indigo-100 text-indigo-700',
  [AuditAction.GRADE]: 'bg-amber-100 text-amber-700',
  [AuditAction.OVERRIDE]: 'bg-rose-100 text-rose-700',
  [AuditAction.VIEW]: 'bg-slate-100 text-slate-700',
  [AuditAction.SUBMIT]: 'bg-cyan-100 text-cyan-700',
  [AuditAction.SESSION_END]: 'bg-fuchsia-100 text-fuchsia-700',
  [AuditAction.SESSION_EXPIRE]: 'bg-orange-100 text-orange-700',
};

const ROLE_COLORS: Record<string, string> = {
  [UserRole.PLATFORM_ADMIN]: 'bg-red-100 text-red-700',
  [UserRole.ADMIN]: 'bg-red-100 text-red-700',
  [UserRole.INSTRUCTOR]: 'bg-blue-100 text-blue-700',
  [UserRole.PARTICIPANT]: 'bg-green-100 text-green-700',
  [UserRole.ASSESSMENT_SPECIALIST]: 'bg-purple-100 text-purple-700',
  [UserRole.PROGRAM_MANAGER]: 'bg-amber-100 text-amber-700',
  [UserRole.OBSERVER]: 'bg-gray-100 text-gray-700',
};

const ENTITIES = ['Course', 'Exam', 'Question', 'Enrollment', 'Attempt', 'Session'];
const ACTIONS = Object.values(AuditAction);

@Component({
  selector: 'app-audit-log-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatIconModule, MatProgressSpinnerModule, MatSortModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, StatusTextPipe, DateFormatPipe, ErrorStateComponent, DebounceDirective],
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-bold text-gray-900">Denetim Günlüğü</h1>

      <div class="bg-white rounded-lg shadow-sm p-3">
        <form [formGroup]="filterForm" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>İşlem Türü</mat-label>
            <mat-select formControlName="action">
              <mat-option value="">Tümü</mat-option>
              @for (a of actionTypes; track a) {
                <mat-option [value]="a">{{ a | statusText }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Nesne Türü</mat-label>
            <mat-select formControlName="entity">
              <mat-option value="">Tümü</mat-option>
              @for (e of entities; track e) {
                <mat-option [value]="e">{{ e }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Başlangıç</mat-label>
            <input matInput [matDatepicker]="fromPicker" formControlName="dateFrom">
            <mat-datepicker-toggle matIconSuffix [for]="fromPicker"></mat-datepicker-toggle>
            <mat-datepicker #fromPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Bitiş</mat-label>
            <input matInput [matDatepicker]="toPicker" formControlName="dateTo">
            <mat-datepicker-toggle matIconSuffix [for]="toPicker"></mat-datepicker-toggle>
            <mat-datepicker #toPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full sm:col-span-2">
            <mat-label>Kullanıcı Ara</mat-label>
            <input matInput formControlName="search" placeholder="Kullanıcı adı ile ara...">
          </mat-form-field>
        </form>
      </div>

      <div class="bg-white rounded-lg shadow-sm overflow-x-auto">
        @if (loading()) {
          <div class="flex justify-center py-12">
            <mat-spinner diameter="40" />
          </div>
        } @else if (error(); as err) {
          <app-error-state [title]="'Hata'" [message]="err" [retryable]="true" (retry)="loadData()" />
        } @else if (response()?.items?.length === 0) {
          <div class="text-center p-8 text-gray-500">
            <mat-icon class="text-4xl mb-2">history</mat-icon>
            <p>Henüz log kaydı yok</p>
          </div>
        } @else {
          <div class="virtual-scroll-wrapper" style="max-height: 600px; overflow-y: auto;">
          <table mat-table [dataSource]="sourceItems()" matSort [matSortActive]="sortColumn()" [matSortDirection]="sortDirection()" (matSortChange)="onSort($event)" multiTemplateDataRows class="w-full">
            <ng-container matColumnDef="timestamp">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Tarih</th>
              <td mat-cell *matCellDef="let l">{{ l.timestamp | dateFormat:'long' }}</td>
            </ng-container>

            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>İşlem</th>
              <td mat-cell *matCellDef="let l">
                <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap" [class]="actionColor(l.action)">{{ l.action | statusText }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="entity">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Nesne</th>
              <td mat-cell *matCellDef="let l">{{ l.entity }} #{{ l.entityId }}</td>
            </ng-container>

            <ng-container matColumnDef="user">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Kullanıcı</th>
              <td mat-cell *matCellDef="let l">
                <div class="flex items-center gap-1.5">
                  <span>{{ l.user }}</span>
                  <span class="inline-block px-1.5 py-0.5 rounded text-xs font-medium" [class]="roleColor(l.role)">{{ l.role | statusText }}</span>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Açıklama</th>
              <td mat-cell *matCellDef="let l" class="text-sm">{{ l.description }}</td>
            </ng-container>

            <ng-container matColumnDef="detail">
              <th mat-header-cell *matHeaderCellDef>Detay</th>
              <td mat-cell *matCellDef="let l">
                @if (l.oldValue || l.newValue) {
                  <button mat-icon-button (click)="toggleDetail(l.id)" class="text-gray-500">
                    <mat-icon>{{ expandedIds().has(l.id) ? 'expand_less' : 'expand_more' }}</mat-icon>
                  </button>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="expandedDetail">
              <td mat-cell *matCellDef="let l" [attr.colspan]="displayedColumns.length">
                @if (expandedIds().has(l.id) && (l.oldValue || l.newValue)) {
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm p-3 bg-gray-50">
                    @if (l.oldValue) {
                      <div>
                        <span class="font-medium text-gray-600">Eski Değer:</span>
                        <div class="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                          @if (isObject(l.oldValue)) {
                            @for (entry of objectEntries(l.oldValue); track entry[0]) {
                              <div class="flex gap-2 py-0.5"><span class="text-gray-500 w-28 shrink-0">{{ entry[0] }}:</span><span class="text-gray-800 break-all">{{ entry[1] }}</span></div>
                            }
                          } @else {
                            <span class="text-gray-800">{{ l.oldValue }}</span>
                          }
                        </div>
                      </div>
                    }
                    @if (l.newValue) {
                      <div>
                        <span class="font-medium text-gray-600">Yeni Değer:</span>
                        <div class="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                          @if (isObject(l.newValue)) {
                            @for (entry of objectEntries(l.newValue); track entry[0]) {
                              <div class="flex gap-2 py-0.5"><span class="text-gray-500 w-28 shrink-0">{{ entry[0] }}:</span><span class="text-gray-800 break-all">{{ entry[1] }}</span></div>
                            }
                          } @else {
                            <span class="text-gray-800">{{ l.newValue }}</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            <tr mat-row *matRowDef="let row; columns: ['expandedDetail']; when: isExpanded"></tr>
          </table>
          </div>
          <mat-paginator
            [pageSize]="pageSize()"
            [pageSizeOptions]="[5, 10, 25, 50]"
            [length]="response()?.total ?? 0"
            [pageIndex]="pageIndex()"
            (page)="onPage($event)"
            showFirstLastButtons>
          </mat-paginator>
        }
      </div>
    </div>
  `
})
export class AuditLogListComponent {
  private auditLogService = inject(AuditLogService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  error = signal<string | null>(null);
  response = signal<PageResponse<AuditLogEntry> | null>(null);
  expandedIds = signal<Set<number>>(new Set());

  filterForm = this.fb.group({
    action: [''],
    entity: [''],
    dateFrom: [null as Date | null],
    dateTo: [null as Date | null],
    search: [''],
  }, { validators: dateRangeValidator('dateFrom', 'dateTo') });

  sortColumn = signal('timestamp');
  sortDirection = signal<'asc' | 'desc'>('asc');
  pageSize = signal(10);
  pageIndex = signal(0);

  actionTypes = ACTIONS;
  entities = ENTITIES;
  displayedColumns = ['timestamp', 'action', 'entity', 'user', 'description', 'detail'];

  constructor() {
    const qp = this.route.snapshot.queryParamMap;
    if (qp.get('action')) this.filterForm.patchValue({ action: qp.get('action') });
    if (qp.get('entity')) this.filterForm.patchValue({ entity: qp.get('entity') });
    if (qp.get('search')) this.filterForm.patchValue({ search: qp.get('search') });
    if (qp.get('dateFrom')) this.filterForm.patchValue({ dateFrom: new Date(qp.get('dateFrom')!) });
    if (qp.get('dateTo')) this.filterForm.patchValue({ dateTo: new Date(qp.get('dateTo')!) });
    if (qp.get('sortColumn')) this.sortColumn.set(qp.get('sortColumn')!);
    if (qp.get('sortDirection')) this.sortDirection.set(qp.get('sortDirection') as 'asc' | 'desc');
    if (qp.get('page')) this.pageIndex.set(Number(qp.get('page')));
    if (qp.get('pageSize')) this.pageSize.set(Number(qp.get('pageSize')));

    this.loadData();
    this.filterForm.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.pageIndex.set(0);
      this.loadData();
    });
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.loadData());
  }

  actionColor(action: string): string { return ACTION_COLORS[action] || 'bg-gray-100 text-gray-700'; }
  roleColor(role: string): string { return ROLE_COLORS[role] || 'bg-gray-100 text-gray-700'; }

  isObject(v: unknown): boolean {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
  }

  objectEntries(v: unknown): [string, string][] {
    if (typeof v !== 'object' || v === null) return [];
    return Object.entries(v).map(([key, value]) => [key, this.stringify(value)]);
  }

  private stringify(value: unknown): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    const fv = this.filterForm.value;
    const req: AuditLogSearchRequest = {
      page: this.pageIndex(),
      pageSize: this.pageSize(),
      sortColumn: this.sortColumn(),
      sortDirection: this.sortDirection(),
      action: (fv.action as AuditAction) || undefined,
      entity: fv.entity || undefined,
      search: fv.search || undefined,
      dateFrom: fv.dateFrom ? this.toDateStr(fv.dateFrom) : undefined,
      dateTo: fv.dateTo ? this.toDateStr(fv.dateTo) : undefined,
    };
    this.auditLogService.getPaginated(req).subscribe({
      next: (res) => { this.response.set(res); this.syncUrl(req); this.loading.set(false); },
      error: (err) => { this.error.set(err.message || 'Loglar yüklenirken hata oluştu'); this.loading.set(false); }
    });
  }

  private toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private syncUrl(req: AuditLogSearchRequest): void {
    const params: Record<string, string | number> = {};
    if (req.action) params['action'] = req.action;
    if (req.entity) params['entity'] = req.entity;
    if (req.search) params['search'] = req.search;
    if (req.dateFrom) params['dateFrom'] = req.dateFrom;
    if (req.dateTo) params['dateTo'] = req.dateTo;
    if (req.sortColumn && req.sortColumn !== 'timestamp') params['sortColumn'] = req.sortColumn;
    if (req.sortDirection && req.sortDirection !== 'asc') params['sortDirection'] = req.sortDirection;
    if (req.page) params['page'] = req.page;
    if (req.pageSize !== 10) params['pageSize'] = req.pageSize;
    this.router.navigate([], { queryParams: params, replaceUrl: true });
  }

  onSort(sort: Sort): void {
    this.sortColumn.set(sort.active || 'timestamp');
    this.sortDirection.set((sort.direction || 'asc') as 'asc' | 'desc');
    this.pageIndex.set(0);
    this.loadData();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadData();
  }

  isExpanded = (_index: number, row: AuditLogEntry): boolean =>
    this.expandedIds().has(row.id) && !!(row.oldValue || row.newValue);

  sourceItems = computed(() => {
    void this.expandedIds();
    const items = this.response()?.items ?? [];
    return [...items];
  });

  toggleDetail(id: number): void {
    this.expandedIds.update(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
}
