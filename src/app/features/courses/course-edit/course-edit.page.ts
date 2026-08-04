import { Component,  inject,  signal,  computed,  OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { CoursesFacade } from '../data-access/courses.facade';
import { ErrorStateComponent, ConfirmDialogComponent } from '@shared/components';
import { ContentFormat, ContentStatus, Difficulty } from '@core/models/enums';
import { CurrentUserService } from '@core/auth/current-user.service';
import { ContentItem } from '@core/models/content-item.model';
import { NotificationService } from '@core/observability/notification.service';

interface ContentFormData {
  title: string;
  description: string;
  format: ContentFormat;
  difficulty: Difficulty;
  durationMinutes: number;
  outcomeIds: number[];
  prerequisiteContentIds: number[];
  isLocked: boolean;
  isRequired: boolean;
  sortOrder: number;
}

@Component({
  selector: 'app-course-edit',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, MatIconModule, MatButtonModule,
    MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressSpinnerModule, MatCardModule, MatChipsModule, MatCheckboxModule, MatSlideToggleModule, MatPaginatorModule, MatDialogModule, ErrorStateComponent, ConfirmDialogComponent
  ],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <a routerLink="/courses" class="text-sm text-gray-500 hover:text-blue-600 mb-1 inline-block">← Kurslara Dön</a>
          <h1 class="text-2xl font-bold text-gray-900">Kurs İçeriği Düzenle</h1>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12"><mat-spinner diameter="32" /></div>
      } @else if (error(); as err) {
        <app-error-state [message]="err" [retryable]="true" (retry)="loadData()" />
      } @else if (course(); as c) {
        <mat-card appearance="outlined" class="p-4 mb-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">{{ c.title }}</h2>
              <p class="text-sm text-gray-500">{{ c.description }}</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-gray-600">Durum:</span>
              <mat-slide-toggle
                [checked]="c.status === 'active'"
                (change)="toggleStatus()"
                color="primary">
                {{ c.status === 'active' ? 'Aktif' : 'Pasif' }}
              </mat-slide-toggle>
            </div>
          </div>
        </mat-card>

        <mat-card appearance="outlined" class="p-4 mb-4">
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Yeni İçerik Ekle</h2>
          <form [formGroup]="contentForm" (ngSubmit)="addContent()">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Başlık</mat-label>
                <input matInput formControlName="title" placeholder="İçerik başlığı">
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Format</mat-label>
                <mat-select formControlName="format">
                  <mat-option value="video">Video</mat-option>
                  <mat-option value="text">Metin</mat-option>
                  <mat-option value="interactive">Etkileşimli</mat-option>
                  <mat-option value="quiz">Test</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Zorluk</mat-label>
                <mat-select formControlName="difficulty">
                  <mat-option [value]="null">Belirtilmedi</mat-option>
                  <mat-option value="easy">Kolay</mat-option>
                  <mat-option value="medium">Orta</mat-option>
                  <mat-option value="hard">Zor</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Açıklama</mat-label>
                <input matInput formControlName="description" placeholder="İçerik açıklaması">
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Süre (dk)</mat-label>
                <input matInput type="number" formControlName="durationMinutes" placeholder="Örn: 15">
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Kazanımlar</mat-label>
                <mat-select formControlName="outcomeIds" multiple>
                  @for (o of courseOutcomes(); track o.id) {
                    <mat-option [value]="o.id">{{ o.code }} - {{ o.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Önkoşul İçerikler</mat-label>
                <mat-select formControlName="prerequisiteContentIds" multiple>
                  @for (c of contents(); track c.id) {
                    <mat-option [value]="c.id">{{ c.title }} ({{ c.sortOrder }})</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Sıra</mat-label>
                <input matInput type="number" formControlName="sortOrder" placeholder="Örn: 1">
              </mat-form-field>
            </div>
            <div class="flex items-center gap-3 mb-3">
              <mat-checkbox formControlName="isRequired">Zorunlu içerik</mat-checkbox>
              <mat-checkbox formControlName="isLocked">Kilitli</mat-checkbox>
            </div>
            <div class="flex gap-2">
              <button mat-raised-button color="primary" type="submit" [disabled]="contentForm.invalid">
                <mat-icon>add</mat-icon> İçerik Ekle
              </button>
            </div>
          </form>
        </mat-card>

        <mat-card appearance="outlined" class="p-4">
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Mevcut İçerikler</h2>
          @if (contents().length === 0) {
            <div class="text-center py-8 text-gray-500">Henüz içerik eklenmemiş</div>
          } @else {
            <div class="overflow-x-auto">
              <table mat-table [dataSource]="paginatedContents()" class="w-full">
                <ng-container matColumnDef="sortOrder">
                  <th mat-header-cell *matHeaderCellDef>Sıra</th>
                  <td mat-cell *matCellDef="let item">{{ item.sortOrder }}</td>
                </ng-container>
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef>Başlık</th>
                  <td mat-cell *matCellDef="let item">{{ item.title }}</td>
                </ng-container>
                <ng-container matColumnDef="format">
                  <th mat-header-cell *matHeaderCellDef>Format</th>
                  <td mat-cell *matCellDef="let item">{{ formatLabel(item.format) }}</td>
                </ng-container>
                <ng-container matColumnDef="difficulty">
                  <th mat-header-cell *matHeaderCellDef>Zorluk</th>
                  <td mat-cell *matCellDef="let item">{{ difficultyLabel(item.difficulty) }}</td>
                </ng-container>
                <ng-container matColumnDef="duration">
                  <th mat-header-cell *matHeaderCellDef>Süre</th>
                  <td mat-cell *matCellDef="let item">{{ item.durationMinutes }} dk</td>
                </ng-container>
                <ng-container matColumnDef="required">
                  <th mat-header-cell *matHeaderCellDef>Zorunlu</th>
                  <td mat-cell *matCellDef="let item">
                    @if (item.isRequired) {
                      <mat-icon class="text-green-600 text-sm">check_circle</mat-icon>
                    } @else {
                      <mat-icon class="text-gray-400 text-sm">remove_circle</mat-icon>
                    }
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let item">
                    <button mat-icon-button color="warn" (click)="deleteContent(item.id)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="contentColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: contentColumns;"></tr>
              </table>
              <mat-paginator
                [length]="contents().length"
                [pageSize]="pageSize()"
                [pageIndex]="pageIndex()"
                [pageSizeOptions]="[5, 10, 25]"
                (page)="onPageChange($event)"
                showFirstLastButtons>
              </mat-paginator>
            </div>
          }
        </mat-card>
      } @else {
        <div class="text-center p-8">
          <mat-icon class="text-4xl text-gray-400 mb-2">error</mat-icon>
          <p class="text-gray-500">Kurs bulunamadı</p>
          <a routerLink="/courses" class="text-blue-600 hover:underline mt-2 inline-block">Kurslara Dön</a>
        </div>
      }
    </div>
  `
})
export class CourseEditPage implements OnInit {
  private facade = inject(CoursesFacade);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private currentUser = inject(CurrentUserService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  loading = signal(true);
  error = signal<string | null>(null);
  courseId = 0;
  course = signal<any>(null);
  contents = signal<ContentItem[]>([]);
  courseOutcomes = signal<any[]>([]);
  pageSize = signal(5);
  pageIndex = signal(0);

  contentForm: FormGroup;

  contentColumns = ['sortOrder', 'title', 'format', 'difficulty', 'duration', 'required', 'actions'];

  paginatedContents = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.contents().slice(start, start + this.pageSize());
  });

  constructor() {
    this.contentForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      format: [ContentFormat.VIDEO, Validators.required],
      difficulty: [Difficulty.EASY],
      durationMinutes: [15, [Validators.required, Validators.min(1)]],
      outcomeIds: [[]],
      prerequisiteContentIds: [[]],
      isLocked: [false],
      isRequired: [false],
      sortOrder: [1, Validators.required],
    });
  }

  ngOnInit() {
    this.courseId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.facade.getCourse(this.courseId).subscribe({
      next: course => {
        this.course.set(course ?? null);
        if (course) {
          this.contents.set(
            this.facade.getContentsByCourse(this.courseId)
          );
          this.courseOutcomes.set(
            this.facade.getOutcomesByCourse(this.courseId)
          );
        }
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.message || 'Kurs verisi yüklenirken hata oluştu');
        this.loading.set(false);
      }
    });
  }

  addContent(): void {
    if (this.contentForm.invalid) return;
    const data = this.contentForm.value as ContentFormData;
    const duplicate = this.contents().find(c => c.sortOrder === data.sortOrder);
    if (duplicate) {
      this.notification.show(`Sıra ${data.sortOrder} zaten "${duplicate.title}" içerikli kullanılıyor`, 'warning');
      return;
    }
    this.facade.addContent(this.courseId, {
      title: data.title,
      description: data.description || '',
      format: data.format,
      difficulty: data.difficulty,
      durationMinutes: data.durationMinutes,
      outcomeIds: data.outcomeIds || [],
      courseId: this.courseId,
      prerequisiteContentIds: data.prerequisiteContentIds || [],
      status: ContentStatus.ACTIVE,
      isLocked: data.isLocked,
      isRequired: data.isRequired,
      sortOrder: data.sortOrder,
      url: undefined,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).subscribe({
      next: () => {
        this.contentForm.reset({
          title: '',
          description: '',
          format: ContentFormat.VIDEO,
          difficulty: Difficulty.EASY,
          durationMinutes: 15,
          outcomeIds: [],
          prerequisiteContentIds: [],
          isLocked: false,
          isRequired: false,
          sortOrder: this.contents().length + 1,
        });
        this.loadData();
      }
    });
  }

  deleteContent(contentId: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'İçeriği Sil',
        message: 'Bu içeriği silmek istediğinize emin misiniz?',
        confirmLabel: 'Sil',
        cancelLabel: 'İptal',
      },
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.facade.deleteContent(this.courseId, contentId).subscribe({
        next: () => this.loadData()
      });
    });
  }

  toggleStatus(): void {
    const course = this.course();
    const target = course?.status === 'active' ? 'pasif' : 'aktif';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Kurs Durumu',
        message: `Kursu "${target}" durumuna almak istediğinize emin misiniz?`,
        confirmLabel: target === 'aktif' ? 'Aktif Yap' : 'Pasif Yap',
        cancelLabel: 'İptal',
      },
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.facade.toggleCourseStatus(this.courseId).subscribe({
        next: () => this.loadData()
      });
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
  }

  formatLabel(format: string): string {
    const labels: Record<string, string> = {
      video: 'Video',
      text: 'Metin',
      interactive: 'Etkileşimli',
      quiz: 'Test',
    };
    return labels[format] ?? format;
  }

  difficultyLabel(difficulty?: string): string {
    const labels: Record<string, string> = {
      easy: 'Kolay',
      medium: 'Orta',
      hard: 'Zor',
    };
    return difficulty ? (labels[difficulty] ?? difficulty) : '-';
  }
}
