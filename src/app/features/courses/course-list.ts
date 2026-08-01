import { Component,  inject,  signal,  computed,  OnInit,  DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute, NavigationEnd } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { CoursesFacade, CourseListItem } from './data-access/courses.facade';
import { ErrorStateComponent } from '@shared/components';
import { DebounceDirective } from '@shared/directives';
import { CourseStatus, EnrollmentStatus, UserRole } from '@core/models/enums';
import { CurrentUserService } from '@core/auth/current-user.service';
import { StatusTextPipe } from '@shared/pipes';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatIconModule, MatButtonModule, MatTableModule, MatProgressSpinnerModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatPaginatorModule, ErrorStateComponent, DebounceDirective, StatusTextPipe],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Kurslar</h1>
        @if (!isStudent()) {
          <button mat-raised-button color="primary" (click)="showForm.set(!showForm())">
            <mat-icon>{{ showForm() ? 'close' : 'add' }}</mat-icon> {{ showForm() ? 'Kapat' : 'Kurs Ekle' }}
          </button>
        }
      </div>

      @if (showForm()) {
        <div class="bg-white rounded-lg shadow-sm p-4">
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Yeni Kurs Ekle</h2>
          <form [formGroup]="courseForm" (ngSubmit)="createCourse()">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Başlık</mat-label>
                <input matInput formControlName="title" placeholder="Kurs başlığı">
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Açıklama</mat-label>
                <input matInput formControlName="description" placeholder="Kurs açıklaması">
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Eğitmen</mat-label>
                <mat-select formControlName="instructorId">
                  @for (inst of instructors(); track inst.id) {
                    <mat-option [value]="inst.id">{{ inst.firstName }} {{ inst.lastName }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Maks. Katılımcı</mat-label>
                <input matInput type="number" formControlName="maxParticipants" placeholder="Örn: 25">
              </mat-form-field>
            </div>
            <div class="flex gap-2">
              <button mat-raised-button color="primary" type="submit" [disabled]="courseForm.invalid">
                <mat-icon>add</mat-icon> Kaydet
              </button>
              <button mat-stroked-button type="button" (click)="showForm.set(false)">İptal</button>
            </div>
          </form>
        </div>
      }

      <div class="bg-white rounded-lg shadow-sm p-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Ara</mat-label>
            <input matInput [value]="searchTerm()" [appDebounce]="300" (debouncedChange)="onSearch($event)" placeholder="Kurs ara...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Eğitmen</mat-label>
            <mat-select [value]="instructorFilter()" (selectionChange)="onInstructorChange($event.value)">
              <mat-option [value]="null">Tümü</mat-option>
              @for (inst of instructors(); track inst.id) {
                <mat-option [value]="inst.id">{{ inst.firstName }} {{ inst.lastName }}</mat-option>
              }
            </mat-select>
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
        } @else if (filteredCourses().length === 0) {
          <div class="text-center p-8 text-gray-500">
            <mat-icon class="text-4xl mb-2">school</mat-icon>
            <p>Henüz kurs bulunmuyor</p>
          </div>
        } @else {
          <table mat-table [dataSource]="paginatedCourses()" class="w-full">
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>Kurs Adı</th>
              <td mat-cell *matCellDef="let item" [class.opacity-50]="isPaleRow(item)">
                <a [routerLink]="['/courses', item.course.id, 'path']" class="text-blue-600 hover:underline font-medium">
                  {{ item.course.title }}
                </a>
              </td>
            </ng-container>
            <ng-container matColumnDef="instructor">
              <th mat-header-cell *matHeaderCellDef>Eğitmen</th>
              <td mat-cell *matCellDef="let item" [class.opacity-50]="isPaleRow(item)">{{ item.instructorName }}</td>
            </ng-container>
            <ng-container matColumnDef="enrollmentCount">
              <th mat-header-cell *matHeaderCellDef>Kayıtlı</th>
              <td mat-cell *matCellDef="let item" [class.opacity-50]="isPaleRow(item)">{{ item.enrollmentCount }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Durum</th>
              <td mat-cell *matCellDef="let item" [class.opacity-50]="isPaleRow(item)">
                <span class="px-2 py-1 rounded-full text-xs font-medium"
                  [class.bg-green-100]="item.course.status === 'active'"
                  [class.text-green-700]="item.course.status === 'active'"
                  [class.bg-red-100]="item.course.status === 'inactive'"
                  [class.text-red-700]="item.course.status === 'inactive'"
                  [class.bg-gray-100]="item.course.status === 'completed'"
                  [class.text-gray-700]="item.course.status === 'completed'">
                  {{ item.course.status | statusText }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="enrollmentStatus">
              <th mat-header-cell *matHeaderCellDef>Katılım</th>
              <td mat-cell *matCellDef="let item" [class.opacity-50]="isPaleRow(item)">
                <span class="px-2 py-1 rounded-full text-xs font-medium" [ngClass]="enrollmentBadgeClass(item.enrollmentStatus)">
                  {{ enrollmentLabel(item.enrollmentStatus) }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let item">
                <div class="flex items-center gap-2">
                  @if (isEnrolledOrCompleted(item.enrollmentStatus)) {
                    <button mat-stroked-button color="primary" [routerLink]="['/courses', item.course.id, 'path']">
                      <mat-icon>route</mat-icon> Öğrenme Yolu
                    </button>
                  }
                  @if (isStudent()) {
                    @if (item.enrollmentStatus === 'approved' || item.enrollmentStatus === 'completed') {
                      <button mat-stroked-button color="warn" (click)="unenroll(item.course.id)">
                        <mat-icon>close</mat-icon> Kaydı İptal Et
                      </button>
                    } @else if (item.enrollmentStatus === 'pending') {
                      <button mat-stroked-button color="warn" (click)="cancelRequest(item.course.id)">
                        <mat-icon>undo</mat-icon> Talebi İptal Et
                      </button>
                    } @else {
                      <button mat-raised-button color="primary" (click)="enroll(item.course.id)">
                        <mat-icon>person_add</mat-icon> Kayıt Talebi Gönder
                      </button>
                    }
                  }
                  @if (!isStudent()) {
                    <button mat-icon-button [routerLink]="['/courses', item.course.id, 'edit']" color="primary">
                      <mat-icon>edit</mat-icon>
                    </button>
                  }
                </div>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
          <mat-paginator
            [length]="filteredCourses().length"
            [pageSize]="pageSize()"
            [pageIndex]="pageIndex()"
            [pageSizeOptions]="[5, 10, 25]"
            (page)="onPageChange($event)"
            showFirstLastButtons>
          </mat-paginator>
        }
      </div>

      @if (!isStudent() && pendingEnrollments().length > 0) {
        <div class="bg-white rounded-lg shadow-sm p-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">Bekleyen Kayıt Talepleri</h3>
          <div class="space-y-2">
            @for (p of pendingEnrollments(); track p.id) {
              <div class="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg">
                <div class="flex items-center gap-3 min-w-0">
                  <mat-icon class="text-amber-500 shrink-0">schedule</mat-icon>
                  <div class="min-w-0">
                    <p class="font-medium text-gray-900 truncate">{{ p.participantName }}</p>
                    <p class="text-sm text-gray-500 truncate">{{ p.courseName }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <button mat-stroked-button color="primary" size="small" (click)="approveEnrollment(p.id)">
                    <mat-icon class="text-sm">check</mat-icon> Onayla
                  </button>
                  <button mat-stroked-button color="warn" size="small" (click)="rejectEnrollment(p.id)">
                    <mat-icon class="text-sm">close</mat-icon> Reddet
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class CourseListPage implements OnInit {
  private facade = inject(CoursesFacade);
  private currentUser = inject(CurrentUserService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  CourseStatus = CourseStatus;
  EnrollmentStatus = EnrollmentStatus;

  loading = signal(true);
  error = signal<string | null>(null);
  searchTerm = signal('');
  courses = signal<CourseListItem[]>([]);
  instructors = signal<{ id: number; firstName: string; lastName: string }[]>([]);
  instructorFilter = signal<number | null>(null);
  pageSize = signal(10);
  pageIndex = signal(0);
  showForm = signal(false);
  pendingEnrollments = signal<{ id: number; courseId: number; courseName: string; participantId: number; participantName: string }[]>([]);

  courseForm = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    instructorId: [null, Validators.required],
    maxParticipants: [25, [Validators.required, Validators.min(1)]],
  });

  isStudent = computed(() => this.currentUser.user().role === UserRole.STUDENT);

  displayedColumns: string[] = [];

  filteredCourses = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const instId = this.instructorFilter();
    return this.courses().filter(item =>
      (!search || item.course.title.toLowerCase().includes(search)) &&
      (instId === null || item.course.instructorId === instId)
    );
  });

  paginatedCourses = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredCourses().slice(start, start + this.pageSize());
  });

  ngOnInit() {
    const cols = ['title', 'instructor', 'status', 'actions'];
    if (this.isStudent()) {
      cols.splice(2, 0, 'enrollmentCount');
      cols.splice(4, 0, 'enrollmentStatus');
    }
    this.displayedColumns = cols;

    const qp = this.route.snapshot.queryParamMap;
    if (qp.get('search')) this.searchTerm.set(qp.get('search')!);
    if (qp.get('instructor')) this.instructorFilter.set(Number(qp.get('instructor')));
    if (qp.get('page')) this.pageIndex.set(Number(qp.get('page')));
    if (qp.get('pageSize')) this.pageSize.set(Number(qp.get('pageSize')));

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.syncUrl());

    this.loadData();
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
    this.pageIndex.set(0);
    this.syncUrl();
  }

  onInstructorChange(id: number | null): void {
    this.instructorFilter.set(id);
    this.pageIndex.set(0);
    this.syncUrl();
  }

  private syncUrl(): void {
    const params: Record<string, string | number> = {};
    if (this.searchTerm()) params['search'] = this.searchTerm();
    if (this.instructorFilter() !== null) params['instructor'] = this.instructorFilter()!;
    if (this.pageIndex()) params['page'] = this.pageIndex();
    if (this.pageSize() !== 10) params['pageSize'] = this.pageSize();
    this.router.navigate([], { queryParams: params, replaceUrl: true });
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.facade.getCourses().subscribe({
      next: data => {
        this.courses.set(data);
        this.instructors.set(this.facade.getInstructors());
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.message || 'Kurslar yüklenirken hata oluştu');
        this.loading.set(false);
      }
    });
    if (!this.isStudent()) {
      this.facade.getPendingEnrollments().subscribe(data => this.pendingEnrollments.set(data));
    }
  }

  enroll(courseId: number): void {
    this.facade.enroll(courseId).subscribe(() => this.loadData());
  }

  unenroll(courseId: number): void {
    this.facade.unenroll(courseId).subscribe(() => this.loadData());
  }

  cancelRequest(courseId: number): void {
    this.facade.unenroll(courseId).subscribe(() => this.loadData());
  }

  approveEnrollment(enrollmentId: number): void {
    this.facade.approveEnrollment(enrollmentId).subscribe(() => this.loadData());
  }

  rejectEnrollment(enrollmentId: number): void {
    this.facade.rejectEnrollment(enrollmentId).subscribe(() => this.loadData());
  }

  onPageChange(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
    this.syncUrl();
  }

  createCourse(): void {
    if (this.courseForm.invalid) return;
    const form = this.courseForm.value;
    this.facade.createCourse({
      title: form.title!,
      description: form.description || '',
      instructorId: form.instructorId!,
      maxParticipants: form.maxParticipants!,
    }).subscribe({
      next: () => {
        this.showForm.set(false);
        this.courseForm.reset({ title: '', description: '', instructorId: null, maxParticipants: 25 });
        this.loadData();
      }
    });
  }

  isEnrolledOrCompleted(status?: EnrollmentStatus): boolean {
    return status === EnrollmentStatus.APPROVED || status === EnrollmentStatus.COMPLETED;
  }

  isPaleRow(item: CourseListItem): boolean {
    return this.isStudent() && !this.isEnrolledOrCompleted(item.enrollmentStatus);
  }

  enrollmentLabel(status?: EnrollmentStatus): string {
    switch (status) {
      case EnrollmentStatus.APPROVED: return 'Kayıtlı';
      case EnrollmentStatus.COMPLETED: return 'Tamamladı';
      case EnrollmentStatus.PENDING: return 'Onay Bekliyor';
      case EnrollmentStatus.REJECTED: return 'Reddedildi';
      default: return 'Kayıtlı Değil';
    }
  }

  enrollmentBadgeClass(status?: EnrollmentStatus): string {
    switch (status) {
      case EnrollmentStatus.APPROVED: return 'bg-green-100 text-green-700';
      case EnrollmentStatus.COMPLETED: return 'bg-blue-100 text-blue-700';
      case EnrollmentStatus.PENDING: return 'bg-yellow-100 text-yellow-700';
      case EnrollmentStatus.REJECTED: return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }
}
