import { Component,  inject,  signal,  computed,  DestroyRef,  OnInit,  viewChild,  TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ExamsFacade, ExamListItem, ExamFilter, isExamAvailable, ExamAvailability } from './data-access/exams.facade';
import { ErrorStateComponent, ConfirmDialogComponent } from '@shared/components';
import { CurrentUserService } from '@core/auth/current-user.service';
import { NotificationService } from '@core/observability/notification.service';
import { UserRole, ExamStatus } from '@core/models/enums';
import { StatusTextPipe } from '@shared/pipes';

@Component({
  selector: 'app-exam-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatIconModule, MatButtonModule, MatTableModule, MatProgressSpinnerModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule, MatDialogModule, MatSortModule, MatDatepickerModule, MatNativeDateModule, ErrorStateComponent, ConfirmDialogComponent, StatusTextPipe],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Sınavlar</h1>
        @if (!isObserver) {
          <button mat-raised-button color="primary" (click)="showCreateDialog()">
            <mat-icon>add</mat-icon> Yeni Sınav
          </button>
        }
      </div>

      <div class="bg-white rounded-lg shadow-sm p-3">
        <form [formGroup]="filterForm" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Sınav Ara</mat-label>
            <input matInput formControlName="search" placeholder="İsim veya kurs ile ara...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Durum</mat-label>
            <mat-select formControlName="status">
              <mat-option value="">Tümü</mat-option>
              <mat-option [value]="'draft'">Taslak</mat-option>
              <mat-option [value]="'published'">Yayında</mat-option>
              <mat-option [value]="'archived'">Arşiv</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Kurs</mat-label>
            <mat-select formControlName="courseId">
              <mat-option [value]="null">Tümü</mat-option>
              @for (c of courses(); track c.id) {
                <mat-option [value]="c.id">{{ c.title }}</mat-option>
              }
            </mat-select>
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
        } @else if (exams().length === 0) {
          <div class="text-center p-8 text-gray-500">
            <mat-icon class="text-4xl mb-2">assignment</mat-icon>
            <p>Sınav bulunamadı</p>
          </div>
        } @else {
          <table mat-table matSort [dataSource]="sortedExams()" class="w-full" (matSortChange)="onSort($event)">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="w-16">ID</th>
              <td mat-cell *matCellDef="let item">{{ item.exam.id }}</td>
            </ng-container>
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Sınav</th>
              <td mat-cell *matCellDef="let item">
                <span class="font-medium">{{ item.exam.title }}</span>
                <span class="text-sm text-gray-500 ml-2">{{ item.courseName }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="startDate">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Başlangıç</th>
              <td mat-cell *matCellDef="let item">{{ item.exam.startDate ? formatDate(item.exam.startDate) : '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="endDate">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Bitiş</th>
              <td mat-cell *matCellDef="let item">{{ item.exam.endDate ? formatDate(item.exam.endDate) : '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="duration">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Süre</th>
              <td mat-cell *matCellDef="let item">{{ item.exam.duration }} dk</td>
            </ng-container>
            <ng-container matColumnDef="questionCount">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Soru</th>
              <td mat-cell *matCellDef="let item">{{ item.exam.questionCount }}</td>
            </ng-container>
            <ng-container matColumnDef="passingScore">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Geçme</th>
              <td mat-cell *matCellDef="let item">%{{ item.exam.passingScore }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Durum</th>
              <td mat-cell *matCellDef="let item">
                <span class="px-2 py-1 rounded-full text-xs font-medium"
                  [class.bg-green-100]="item.exam.status === 'published'"
                  [class.text-green-700]="item.exam.status === 'published'"
                  [class.bg-yellow-100]="item.exam.status === 'draft'"
                  [class.text-yellow-700]="item.exam.status === 'draft'"
                  [class.bg-gray-100]="item.exam.status === 'archived'"
                  [class.text-gray-700]="item.exam.status === 'archived'">
                  {{ item.exam.status | statusText }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let item">
                <div class="flex gap-1 items-center">
                  @if (isStudent && item.exam.status === 'published') {
                    @if (item.completedAttempt) {
                      <div class="flex items-center gap-2 px-3 py-1 rounded-lg cursor-not-allowed"
                        [class.bg-green-100]="item.completedAttempt.scorePercentage >= item.exam.passingScore"
                        [class.text-green-700]="item.completedAttempt.scorePercentage >= item.exam.passingScore"
                        [class.bg-red-100]="item.completedAttempt.scorePercentage < item.exam.passingScore"
                        [class.text-red-700]="item.completedAttempt.scorePercentage < item.exam.passingScore">
                        <mat-icon>{{ item.completedAttempt.scorePercentage >= item.exam.passingScore ? 'check_circle' : 'cancel' }}</mat-icon>
                        <span class="font-semibold">%{{ item.completedAttempt.scorePercentage }}</span>
                      </div>
                    } @else if (item.submittedAttempt) {
                      <span class="px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-500">–</span>
                    } @else if (item.hasActiveSession && item.activeSessionToken) {
                      <a mat-stroked-button color="primary" [routerLink]="['/exam-session', item.activeSessionToken]">
                        <mat-icon>play_arrow</mat-icon> Devam Et
                      </a>
                    } @else if (getAvailability(item.exam) === 'upcoming') {
                      <span class="px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-700">
                        <mat-icon class="text-sm align-middle">schedule</mat-icon>
                        Yaklaşan Sınav · {{ formatDate(item.exam.startDate!) }}
                      </span>
                    } @else if (getAvailability(item.exam) === 'expired') {
                      <span class="px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-500 cursor-not-allowed">
                        <mat-icon class="text-sm align-middle">event_busy</mat-icon>
                        Süresi Doldu
                      </span>
                    } @else {
                      <button mat-raised-button color="primary" (click)="startExam(item.exam.id)">
                        <mat-icon>play_arrow</mat-icon> Başla
                      </button>
                    }
                  }
                  @if (!isObserver && !isStudent) {
                    @if (item.exam.status !== 'published') {
                      <button mat-icon-button (click)="showEditDialog(item.exam)" matTooltip="Düzenle">
                        <mat-icon class="text-sm !text-gray-700">edit</mat-icon>
                      </button>
                    }
                    <button mat-icon-button [routerLink]="['/exam-builder']" [queryParams]="{examId: item.exam.id}" matTooltip="Blueprint" color="primary">
                      <mat-icon class="text-sm">build</mat-icon>
                    </button>
                    @if (item.exam.status === 'draft') {
                      <button mat-icon-button (click)="toggleStatus(item.exam, 'published')" matTooltip="Yayınla">
                        <mat-icon class="text-sm !text-green-600">publish</mat-icon>
                      </button>
                    } @else if (item.exam.status === 'published') {
                      <button mat-icon-button (click)="toggleStatus(item.exam, 'archived')" matTooltip="Arşivle">
                        <mat-icon class="text-sm !text-red-600">archive</mat-icon>
                      </button>
                    } @else if (item.exam.status === 'archived') {
                      <button mat-icon-button (click)="toggleStatus(item.exam, 'draft')" matTooltip="Taslağa Al">
                        <mat-icon class="text-sm !text-green-600">unarchive</mat-icon>
                      </button>
                    }
                  }
                </div>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
          <mat-paginator
            [pageSize]="pageSize()"
            [pageSizeOptions]="[5, 10, 25, 50]"
            [length]="total()"
            [pageIndex]="pageIndex()"
            (page)="onPage($event)"
            showFirstLastButtons>
          </mat-paginator>
        }
      </div>
    </div>

    <ng-template #createDialog>
      <h2 mat-dialog-title>Yeni Sınav</h2>
      <form [formGroup]="createForm">
        <mat-dialog-content class="flex flex-col gap-3 pt-2" style="min-width: 400px;">
          <mat-form-field appearance="outline">
            <mat-label>Sınav Adı</mat-label>
            <input matInput formControlName="title" placeholder="Sınav adını girin...">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Kurs</mat-label>
            <mat-select formControlName="courseId">
              @for (c of courses(); track c.id) {
                <mat-option [value]="c.id">{{ c.title }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <div class="flex gap-3">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Süre (dk)</mat-label>
              <input matInput type="number" formControlName="duration" min="5" max="180">
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Geçme Puanı (%)</mat-label>
              <input matInput type="number" formControlName="passingScore" min="0" max="100">
            </mat-form-field>
          </div>
          <div class="flex gap-3">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Başlangıç Tarihi</mat-label>
              <input matInput [matDatepicker]="startPicker" formControlName="startDate">
              <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Bitiş Tarihi</mat-label>
              <input matInput [matDatepicker]="endPicker" formControlName="endDate">
              <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>
          </div>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
          <button mat-button mat-dialog-close>İptal</button>
          <button mat-raised-button color="primary" [mat-dialog-close]="true" (click)="createExam()" [disabled]="createForm.invalid">Oluştur</button>
        </mat-dialog-actions>
      </form>
    </ng-template>

    <ng-template #editDialog>
      <h2 mat-dialog-title>Sınav Düzenle</h2>
      <form [formGroup]="editForm">
        <mat-dialog-content class="flex flex-col gap-3 pt-2" style="min-width: 400px;">
          <mat-form-field appearance="outline">
            <mat-label>Sınav Adı</mat-label>
            <input matInput formControlName="title">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Kurs</mat-label>
            <mat-select formControlName="courseId">
              @for (c of courses(); track c.id) {
                <mat-option [value]="c.id">{{ c.title }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <div class="flex gap-3">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Süre (dk)</mat-label>
              <input matInput type="number" formControlName="duration" min="5" max="180">
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Geçme Puanı (%)</mat-label>
              <input matInput type="number" formControlName="passingScore" min="0" max="100">
            </mat-form-field>
          </div>
          <div class="flex gap-3">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Başlangıç Tarihi</mat-label>
              <input matInput [matDatepicker]="editStartPicker" formControlName="startDate">
              <mat-datepicker-toggle matIconSuffix [for]="editStartPicker"></mat-datepicker-toggle>
              <mat-datepicker #editStartPicker></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Bitiş Tarihi</mat-label>
              <input matInput [matDatepicker]="editEndPicker" formControlName="endDate">
              <mat-datepicker-toggle matIconSuffix [for]="editEndPicker"></mat-datepicker-toggle>
              <mat-datepicker #editEndPicker></mat-datepicker>
            </mat-form-field>
          </div>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
          <button mat-button mat-dialog-close>İptal</button>
          <button mat-raised-button color="primary" [mat-dialog-close]="true" (click)="saveEdit()" [disabled]="editForm.invalid">Kaydet</button>
        </mat-dialog-actions>
      </form>
    </ng-template>
  `
})
export class ExamListPage implements OnInit {
  private facade = inject(ExamsFacade);
  private currentUser = inject(CurrentUserService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  error = signal<string | null>(null);
  exams = signal<ExamListItem[]>([]);
  total = signal(0);
  courses = signal<{ id: number; title: string }[]>([]);

  pageSize = signal(10);
  pageIndex = signal(0);

  filterForm = this.fb.group({
    search: [''],
    status: [''],
    courseId: [null as number | null],
  });

  createForm = this.fb.group({
    title: ['', Validators.required],
    courseId: [null as number | null, Validators.required],
    duration: [60, [Validators.required, Validators.min(5), Validators.max(180)]],
    passingScore: [70, [Validators.required, Validators.min(0), Validators.max(100)]],
    startDate: [null as Date | null],
    endDate: [null as Date | null],
  });

  editForm = this.fb.group({
    title: ['', Validators.required],
    courseId: [null as number | null, Validators.required],
    duration: [60, [Validators.required, Validators.min(5), Validators.max(180)]],
    passingScore: [70, [Validators.required, Validators.min(0), Validators.max(100)]],
    startDate: [null as Date | null],
    endDate: [null as Date | null],
  });

  editExamId: number | null = null;

  displayedColumns = ['id', 'title', 'startDate', 'endDate', 'duration', 'questionCount', 'passingScore', 'status', 'actions'];

  sortActive = signal('');
  sortDirection = signal<'asc' | 'desc' | ''>('');

  sortedExams = computed(() => {
    const data = [...this.exams()];
    const active = this.sortActive();
    const dir = this.sortDirection();
    if (!active || !dir) return data;

    const accessor = (item: ExamListItem): any => {
      switch (active) {
        case 'id': return item.exam.id;
        case 'title': return item.exam.title.toLowerCase();
        case 'startDate': return item.exam.startDate ?? '';
        case 'endDate': return item.exam.endDate ?? '';
        case 'duration': return item.exam.duration;
        case 'questionCount': return item.exam.questionCount;
        case 'passingScore': return item.exam.passingScore;
        case 'status': return item.exam.status;
        default: return '';
      }
    };

    data.sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return dir === 'asc' ? cmp : -cmp;
    });
    return data;
  });

  get isObserver() { return this.currentUser.user().role === UserRole.OBSERVER; }
  get isStudent() { return this.currentUser.user().role === UserRole.STUDENT; }

  ngOnInit() {
    this.courses.set(this.facade.getAllCourses());
    const qp = this.route.snapshot.queryParamMap;
    if (qp.get('search')) this.filterForm.patchValue({ search: qp.get('search') });
    if (qp.get('status')) this.filterForm.patchValue({ status: qp.get('status') });
    if (qp.get('courseId')) this.filterForm.patchValue({ courseId: Number(qp.get('courseId')) });
    if (qp.get('page')) this.pageIndex.set(Number(qp.get('page')));
    if (qp.get('pageSize')) this.pageSize.set(Number(qp.get('pageSize')));

    this.filterForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.pageIndex.set(0);
      this.loadData();
    });

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.loadData());

    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    const fv = this.filterForm.value;
    const filter: ExamFilter = {
      search: fv.search || undefined,
      status: (fv.status as ExamStatus) || undefined,
      courseId: fv.courseId || undefined,
      page: this.pageIndex(),
      pageSize: this.pageSize(),
    };

    this.facade.getExams(filter).subscribe({
      next: data => {
        this.exams.set(data.items);
        this.total.set(data.total);
        this.syncUrl(filter);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.message || 'Sınavlar yüklenirken hata oluştu');
        this.loading.set(false);
      }
    });
  }

  syncUrl(filter: ExamFilter): void {
    const params: Record<string, string | number> = {};
    if (filter.search) params['search'] = filter.search;
    if (filter.status) params['status'] = filter.status;
    if (filter.courseId) params['courseId'] = filter.courseId;
    if (filter.page) params['page'] = filter.page;
    if (filter.pageSize !== 10) params['pageSize'] = filter.pageSize;
    this.router.navigate([], { queryParams: params, replaceUrl: true });
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadData();
  }

  onSort(sort: Sort): void {
    this.sortActive.set(sort.active);
    this.sortDirection.set(sort.direction);
  }

  startExam(examId: number): void {
    this.facade.startExam(examId);
  }

  showCreateDialog(): void {
    this.createForm.reset({ title: '', courseId: null, duration: 60, passingScore: 70, startDate: null, endDate: null });
    const tpl = this.createDialogTpl();
    if (!tpl) return;
    this.dialog.open(tpl);
  }

  showEditDialog(exam: any): void {
    this.editExamId = exam.id;
    this.editForm.patchValue({
      title: exam.title,
      courseId: exam.courseId,
      duration: exam.duration,
      passingScore: exam.passingScore,
      startDate: exam.startDate ? new Date(exam.startDate) : null,
      endDate: exam.endDate ? new Date(exam.endDate) : null,
    });
    const tpl = this.editDialogTpl();
    if (!tpl) return;
    this.dialog.open(tpl);
  }

  private readonly createDialogTpl = viewChild<TemplateRef<any>>('createDialog');
  private readonly editDialogTpl = viewChild<TemplateRef<any>>('editDialog');

  createExam(): void {
    if (this.createForm.invalid) return;
    const v = this.createForm.value;
    this.facade.createExam(v.title!, v.courseId!, v.duration!, v.passingScore!, v.startDate ? this.toDateString(v.startDate) : null, v.endDate ? this.toDateString(v.endDate) : null);
    this.loadData();
    this.dialog.closeAll();
  }

  saveEdit(): void {
    if (!this.editExamId || this.editForm.invalid) return;
    const v = this.editForm.value;
    this.facade.updateExam(this.editExamId, {
      title: v.title!,
      courseId: v.courseId!,
      duration: v.duration!,
      passingScore: v.passingScore!,
      startDate: v.startDate ? this.toDateString(v.startDate) : null,
      endDate: v.endDate ? this.toDateString(v.endDate) : null,
    });
    this.loadData();
    this.dialog.closeAll();
  }

  private toDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  getAvailability(exam: any): ExamAvailability {
    return isExamAvailable(exam);
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  toggleStatus(exam: any, targetStatus: string): void {
    const labels: Record<string, { title: string; message: string; confirm: string }> = {
      published: { title: 'Sınavı Yayınla', message: `"${exam.title}" sınavını yayınlamak istediğinize emin misiniz?`, confirm: 'Yayınla' },
      archived: { title: 'Sınavı Arşivle', message: `"${exam.title}" sınavını arşivlemek istediğinize emin misiniz? Öğrenciler artık giremeyecek.`, confirm: 'Arşivle' },
      draft: { title: 'Taslağa Al', message: `"${exam.title}" sınavını taslağa almak istediğinize emin misiniz?`, confirm: 'Taslağa Al' },
    };
    const cfg = labels[targetStatus];
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: cfg?.title ?? 'Durum Değiştir',
        message: cfg?.message ?? 'Bu işlemi onaylıyor musunuz?',
        confirmLabel: cfg?.confirm ?? 'Onayla',
        cancelLabel: 'İptal',
      },
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      if (targetStatus === 'published') {
        const result = this.facade.validatePublishPrerequisites(exam.id);
        if (!result.valid) {
          this.notification.show('Yayınlanamaz: ' + result.violations[0], 'error');
          return;
        }
      }
      this.facade.updateExam(exam.id, { status: targetStatus as ExamStatus });
      this.loadData();
    });
  }
}
