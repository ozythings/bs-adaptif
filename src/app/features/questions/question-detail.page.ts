import { Component,  inject,  signal,  computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { QuestionBankFacade } from './data-access/question-bank.facade';
import { QuestionSummary, QuestionVersion } from '@core/models/question-version.model';
import { QuestionType, Difficulty, QuestionVersionStatus } from '@core/models/enums';
import { QuestionEditorComponent, QuestionFormValue } from '@shared/components/question-editor/question-editor.component';
import { ErrorStateComponent } from '@shared/components';
import { NotificationService } from '@core/observability/notification.service';
import { DateFormatPipe } from '@shared/pipes';

@Component({
  selector: 'app-question-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    DateFormatPipe,
    ErrorStateComponent,
  ],
  template: `
    <div class="space-y-6">
      <div class="flex items-center gap-2">
        <a routerLink="/question-bank" class="text-blue-600 hover:underline flex items-center gap-1">
          <mat-icon>arrow_back</mat-icon>
          Soru Bankası
        </a>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <mat-spinner diameter="40" />
        </div>
      } @else if (error(); as err) {
        <app-error-state [title]="'Hata'" [message]="err" [retryable]="true" (retry)="loadData()" />
      } @else if (question(); as q) {
        <div class="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{{ q.stem }}</h1>
              <p class="text-sm text-gray-500 mt-1">ID: {{ q.id }} | v{{ q.currentVersion }}</p>
            </div>
            @if (q.status === QuestionVersionStatus.PUBLISHED) {
              <button mat-raised-button color="primary" (click)="createNewVersion(q)">
                <mat-icon>add</mat-icon>
                Yeni Versiyon
              </button>
            }
          </div>

          <div class="flex flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-600">Tür:</span>
              <span class="text-sm">{{ typeLabel(q.type) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-600">Zorluk:</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium" [class]="difficultyClass(q.difficulty)">
                {{ difficultyLabel(q.difficulty) }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-600">Puan:</span>
              <span class="text-sm">{{ q.points }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-600">Durum:</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium" [class]="statusClass(q.status)">
                {{ statusLabel(q.status) }}
              </span>
            </div>
          </div>

          @if (q.tags.length > 0) {
            <div class="flex flex-wrap gap-1">
              @for (tag of q.tags; track tag) {
                <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{{ tag }}</span>
              }
            </div>
          }

          @if (currentVersion(); as v) {
            <div class="border-t pt-4">
              <h2 class="text-lg font-semibold text-gray-900 mb-3">Detaylar</h2>
              @if (v.type === QuestionType.MULTIPLE_CHOICE && v.options.length > 0) {
                <div class="space-y-2">
                  @for (opt of v.options; track opt.key) {
                    <div class="flex items-center gap-2 p-2 rounded" [class.bg-green-50]="opt.isCorrect" [class.border]="opt.isCorrect" [class.border-green-300]="opt.isCorrect">
                      <span class="font-medium text-gray-700 w-6">{{ opt.key }})</span>
                      <span>{{ opt.value }}</span>
                      @if (opt.isCorrect) {
                        <mat-icon class="text-green-600 text-sm">check_circle</mat-icon>
                      }
                    </div>
                  }
                </div>
              }
              @if (v.type === QuestionType.TRUE_FALSE) {
                <div class="flex gap-4">
                  <span [class.font-semibold]="v.correctAnswer === 'Doğru'" [class.text-green-600]="v.correctAnswer === 'Doğru'">Doğru</span>
                  <span [class.font-semibold]="v.correctAnswer === 'Yanlış'" [class.text-red-600]="v.correctAnswer === 'Yanlış'">Yanlış</span>
                </div>
              }
              @if (v.type === QuestionType.SHORT_ANSWER) {
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-600">Doğru Cevap:</span>
                  <span class="text-sm font-semibold text-green-700">{{ v.correctAnswer }}</span>
                </div>
              }
              @if (v.solution) {
                <div class="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <span class="text-xs font-medium text-blue-700">Çözüm:</span>
                  <p class="text-sm text-blue-800 mt-1">{{ v.solution }}</p>
                </div>
              }
            </div>
          }
        </div>

        <div class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Versiyon Geçmişi</h2>
          @if (versions().length === 0) {
            <p class="text-gray-500 text-sm">Henüz versiyon bulunmuyor</p>
          } @else {
            <div class="space-y-4">
              @for (v of versions(); track v.id) {
                <div class="flex gap-4 p-3 rounded border" [class.border-blue-300]="v.id === q.latestVersionId">
                  <div class="flex flex-col items-center">
                    <div class="w-3 h-3 rounded-full" [class.bg-blue-500]="v.id === q.latestVersionId" [class.bg-gray-300]="v.id !== q.latestVersionId"></div>
                    @if (!$last) {
                      <div class="w-0.5 flex-1 bg-gray-200"></div>
                    }
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <span class="font-medium text-gray-900">v{{ v.version }}</span>
                      <span class="text-xs text-gray-500">{{ v.createdAt | dateFormat }}</span>
                    </div>
                    @if (v.changeNote) {
                      <p class="text-sm text-gray-600 mt-1">{{ v.changeNote }}</p>
                    }
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium mt-1 inline-block" [class]="statusClass(v.status)">
                      {{ statusLabel(v.status) }}
                    </span>
                    @if (v.id === q.latestVersionId) {
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 ml-2 inline-block">Son Versiyon</span>
                    } @else {
                      <button mat-stroked-button size="small" color="primary" class="!text-xs ml-2" (click)="rollbackToVersion(q.id, v.id)">
                        <mat-icon class="text-sm">history</mat-icon> Bu Versiyona Dön
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class QuestionDetailPage {
  private route = inject(ActivatedRoute);
  private facade = inject(QuestionBankFacade);
  private dialog = inject(MatDialog);
  private notificationService = inject(NotificationService);

  readonly QuestionType = QuestionType;
  readonly QuestionVersionStatus = QuestionVersionStatus;

  loading = signal(true);
  error = signal<string | null>(null);
  question = signal<QuestionSummary | null>(null);
  versions = signal<QuestionVersion[]>([]);

  currentVersion = computed(() => {
    const q = this.question();
    const versions = this.versions();
    if (!q) return null;
    return versions.find(v => v.id === q.latestVersionId) || null;
  });

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('Geçersiz soru ID');
      this.loading.set(false);
      return;
    }

    this.facade.getById(id).subscribe({
      next: (q) => {
        if (!q) {
          this.error.set('Soru bulunamadı');
          this.loading.set(false);
          return;
        }
        this.question.set(q);
        this.facade.getVersions(id).subscribe({
          next: (versions) => {
            this.versions.set(versions);
            this.loading.set(false);
          },
          error: (err) => {
            this.error.set(err.message || 'Versiyonlar yüklenirken hata oluştu');
            this.loading.set(false);
          },
        });
      },
      error: (err) => {
        this.error.set(err.message || 'Soru yüklenirken hata oluştu');
        this.loading.set(false);
      },
    });
  }

  typeLabel(type: QuestionType): string {
    switch (type) {
      case QuestionType.MULTIPLE_CHOICE: return 'Çoktan Seçmeli';
      case QuestionType.TRUE_FALSE: return 'Doğru/Yanlış';
      case QuestionType.SHORT_ANSWER: return 'Kısa Cevap';
      default: return type;
    }
  }

  difficultyLabel(d: Difficulty): string {
    switch (d) {
      case Difficulty.EASY: return 'Kolay';
      case Difficulty.MEDIUM: return 'Orta';
      case Difficulty.HARD: return 'Zor';
      default: return d;
    }
  }

  difficultyClass(d: Difficulty): string {
    switch (d) {
      case Difficulty.EASY: return 'bg-green-100 text-green-700';
      case Difficulty.MEDIUM: return 'bg-yellow-100 text-yellow-700';
      case Difficulty.HARD: return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  statusLabel(s: QuestionVersionStatus): string {
    switch (s) {
      case QuestionVersionStatus.DRAFT: return 'Taslak';
      case QuestionVersionStatus.PUBLISHED: return 'Yayında';
      case QuestionVersionStatus.ARCHIVED: return 'Arşiv';
      default: return s;
    }
  }

  statusClass(s: QuestionVersionStatus): string {
    switch (s) {
      case QuestionVersionStatus.DRAFT: return 'bg-gray-100 text-gray-700';
      case QuestionVersionStatus.PUBLISHED: return 'bg-green-100 text-green-700';
      case QuestionVersionStatus.ARCHIVED: return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  rollbackToVersion(questionId: number, versionId: number): void {
    this.facade.revertToVersion(questionId, versionId);
    this.loadData();
  }

  createNewVersion(q: QuestionSummary): void {
    const dialogRef = this.dialog.open(QuestionEditorComponent, {
      width: '700px',
      data: { question: q, type: q.type },
    });

    dialogRef.afterClosed().subscribe((result: QuestionFormValue | undefined) => {
      if (result) {
        this.facade.update(q.id, {
          stem: result.stem,
          type: result.type,
          difficulty: result.difficulty,
          points: result.points,
          options: result.options,
          correctAnswer: result.correctAnswer,
          solution: result.solution,
          changeNote: result.changeNote,
          outcomeIds: result.outcomeIds,
          tags: result.tags,
        }).subscribe(() => this.loadData());
      }
    });
  }
}
