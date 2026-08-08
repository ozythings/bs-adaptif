import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CoursesFacade } from '../data-access/courses.facade';
import { ErrorStateComponent } from '@shared/components';
import { DebounceDirective } from '@shared/directives';
import { EnrollmentStatus } from '@core/models/enums';
import { COURSES_SEED } from '@core/data';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatIconModule, MatButtonModule, MatTableModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatPaginatorModule, MatProgressSpinnerModule,
    MatCardModule, MatTooltipModule, DebounceDirective,
  ],
  template: `
    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <button mat-icon-button routerLink="/courses" matTooltip="Geri Dön">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{{ courseTitle() }}</h1>
          <p class="text-sm text-gray-500">Kayıtlı öğrenciler</p>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <mat-spinner diameter="40" />
        </div>
      } @else {
        <div class="bg-white rounded-lg shadow-sm p-3">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>İsme göre filtrele</mat-label>
            <input matInput [value]="searchTerm()" [appDebounce]="300" (debouncedChange)="onSearch($event)" placeholder="Öğrenci adı veya numarası...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
        </div>

        <div class="bg-white rounded-lg shadow-sm overflow-x-auto">
          @if (filteredEnrollments().length === 0) {
            <div class="text-center p-8 text-gray-500">
              <mat-icon class="text-4xl mb-2">people</mat-icon>
              <p>Kayıtlı öğrenci bulunmuyor</p>
            </div>
          } @else {
            <table mat-table [dataSource]="paginatedEnrollments()" matSort (matSortChange)="onSort($event)" class="w-full">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Ad Soyad</th>
                <td mat-cell *matCellDef="let row">
                  <span class="font-medium text-gray-900">{{ row.participant.firstName }} {{ row.participant.lastName }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="schoolNumber">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Okul No</th>
                <td mat-cell *matCellDef="let row" class="text-gray-600">{{ row.participant.schoolNumber }}</td>
              </ng-container>
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>E-posta</th>
                <td mat-cell *matCellDef="let row" class="text-gray-600">{{ row.participant.email }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Durum</th>
                <td mat-cell *matCellDef="let row">
                  <span class="px-2 py-1 rounded-full text-xs font-medium"
                    [class.bg-green-100]="row.enrollment.status === 'approved'"
                    [class.text-green-700]="row.enrollment.status === 'approved'"
                    [class.bg-yellow-100]="row.enrollment.status === 'pending'"
                    [class.text-yellow-700]="row.enrollment.status === 'pending'"
                    [class.bg-blue-100]="row.enrollment.status === 'completed'"
                    [class.text-blue-700]="row.enrollment.status === 'completed'"
                    [class.bg-red-100]="row.enrollment.status === 'rejected'"
                    [class.text-red-700]="row.enrollment.status === 'rejected'">
                    {{ statusLabel(row.enrollment.status) }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="enrollmentDate">
                 <th mat-header-cell *matHeaderCellDef mat-sort-header>Kayıt Tarihi</th>
                <td mat-cell *matCellDef="let row" class="text-gray-500 text-xs">{{ formatDate(row.enrollment.enrollmentDate) }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
            <mat-paginator
              [length]="filteredEnrollments().length"
              [pageSize]="pageSize()"
              [pageIndex]="pageIndex()"
              [pageSizeOptions]="[5, 10, 25]"
              (page)="onPage($event)"
              showFirstLastButtons />
          }
        </div>
      }
    </div>
  `
})
export class CourseDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private facade = inject(CoursesFacade);

  loading = signal(true);
  courseId = 0;
  courseTitle = signal('');
  searchTerm = signal('');
  pageSize = signal(10);
  pageIndex = signal(0);
  sortColumn = signal('');
  sortDirection = signal<'asc' | 'desc' | ''>('');
  enrollments = signal<{ participant: { id: number; firstName: string; lastName: string; schoolNumber: string; email: string }; enrollment: { status: string; enrollmentDate: string } }[]>([]);

  displayedColumns = ['name', 'schoolNumber', 'email', 'status', 'enrollmentDate'];

  filteredEnrollments = computed(() => {
    const search = this.searchTerm().toLowerCase();
    return this.enrollments().filter(e =>
      !search ||
      e.participant.firstName.toLowerCase().includes(search) ||
      e.participant.lastName.toLowerCase().includes(search) ||
      e.participant.schoolNumber.toLowerCase().includes(search)
    );
  });

  paginatedEnrollments = computed(() => {
    const data = [...this.filteredEnrollments()];
    const col = this.sortColumn();
    const dir = this.sortDirection();
    if (col && dir) {
      data.sort((a, b) => {
        let va: string, vb: string;
        switch (col) {
          case 'name': va = `${a.participant.firstName} ${a.participant.lastName}`.toLowerCase(); vb = `${b.participant.firstName} ${b.participant.lastName}`.toLowerCase(); break;
          case 'schoolNumber': va = a.participant.schoolNumber; vb = b.participant.schoolNumber; break;
          case 'status': va = a.enrollment.status; vb = b.enrollment.status; break;
          case 'enrollmentDate': va = a.enrollment.enrollmentDate; vb = b.enrollment.enrollmentDate; break;
          default: return 0;
        }
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return dir === 'asc' ? cmp : -cmp;
      });
    }
    const start = this.pageIndex() * this.pageSize();
    return data.slice(start, start + this.pageSize());
  });

  onSort(sort: Sort): void {
    this.sortColumn.set(sort.active);
    this.sortDirection.set(sort.direction);
    this.pageIndex.set(0);
  }

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('id'));
    const course = COURSES_SEED.find(c => c.id === this.courseId);
    this.courseTitle.set(course?.title ?? `Kurs #${this.courseId}`);
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.facade.getEnrollmentsByCourse(this.courseId).subscribe({
      next: data => {
        this.enrollments.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
    this.pageIndex.set(0);
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'approved': return 'Aktif';
      case 'pending': return 'Beklemede';
      case 'completed': return 'Tamamlandı';
      case 'rejected': return 'Reddedildi';
      default: return status;
    }
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
