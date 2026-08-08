import { Component,  inject,  signal,  computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Attempt, QuestionResponse } from '@core/models/attempt.model';
import { Rubric, GradingResult } from '@core/models/rubric.model';
import { ResultStatus, QuestionType } from '@core/models/enums';
import { Question } from '@core/models/question.model';
import { GradingFacade, GradingHistoryEntry } from './data-access/grading.facade';
import { RubricGraderComponent } from '@shared/components/rubric-grader/rubric-grader.component';
import { ErrorStateComponent, ConfirmDialogComponent } from '@shared/components';
import { PermissionService } from '@core/auth/permission.service';

interface QuestionItem {
  question: Question;
  response: QuestionResponse;
  type: QuestionType;
  rubric: Rubric | null;
}

@Component({
  selector: 'app-grading-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatDividerModule, MatCardModule, MatFormFieldModule, MatInputModule, MatDialogModule, MatTooltipModule, RubricGraderComponent, ErrorStateComponent],
  template: `
    <div class="space-y-6">
      @if (loading()) {
        <div class="flex justify-center py-12">
          <mat-spinner diameter="40" />
        </div>
      } @else if (error(); as err) {
        <app-error-state [title]="'Hata'" [message]="err" [retryable]="true" (retry)="loadData()" />
      } @else if (attempt(); as attempt) {
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <button mat-icon-button routerLink="/grading" matTooltip="Geri Dön">
                    <mat-icon>arrow_back</mat-icon>
                  </button>
                </div>
                <h1 class="text-2xl font-bold text-gray-900">Değerlendirme #{{ attempt.id }}</h1>
            <p class="text-gray-500">{{ getExamName(attempt.examId) }} - {{ getStudentName(attempt.studentId) }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 rounded-full text-sm font-medium"
              [class.bg-yellow-100]="attempt.status === 'draft'"
              [class.text-yellow-700]="attempt.status === 'draft'"
              [class.bg-green-100]="attempt.status === 'finalized'"
              [class.text-green-700]="attempt.status === 'finalized'">
              {{ attempt.status === 'draft' ? 'Değerlendiriliyor' : 'Sonuçlandı' }}
            </span>
            @if (canModify() && attempt.status === ResultStatus.DRAFT) {
              <button mat-raised-button color="primary" [disabled]="finalizing()" (click)="finalize()">
                <mat-icon>check_circle</mat-icon>
                Sonuçlandır
              </button>
            }
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white rounded-lg shadow-sm p-4 text-center">
            <p class="text-sm text-gray-500">Toplam Puan</p>
            <p class="text-2xl font-bold text-gray-900">{{ attempt.totalScore }}</p>
          </div>
          <div class="bg-white rounded-lg shadow-sm p-4 text-center">
            <p class="text-sm text-gray-500">Maksimum Puan</p>
            <p class="text-2xl font-bold text-gray-900">{{ attempt.maxScore }}</p>
          </div>
          <div class="bg-white rounded-lg shadow-sm p-4 text-center">
            <p class="text-sm text-gray-500">Yüzde</p>
            <p class="text-2xl font-bold"
              [class.text-green-600]="attempt.scorePercentage >= 70"
              [class.text-yellow-600]="attempt.scorePercentage >= 50 && attempt.scorePercentage < 70"
              [class.text-red-600]="attempt.scorePercentage < 50">
              {{ attempt.scorePercentage }}%
            </p>
          </div>
        </div>

        <div class="space-y-4">
          @for (item of questionItems(); track item.question.id; let i = $index) {
            <div class="bg-white rounded-lg shadow-sm p-4">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-semibold text-gray-900">{{ item.question.questionText }}</h3>
                <span class="px-2 py-1 rounded-full text-xs font-medium"
                  [class.bg-blue-100]="item.type === QuestionType.MULTIPLE_CHOICE || item.type === QuestionType.TRUE_FALSE"
                  [class.text-blue-700]="item.type === QuestionType.MULTIPLE_CHOICE || item.type === QuestionType.TRUE_FALSE"
                  [class.bg-purple-100]="item.type === QuestionType.SHORT_ANSWER || item.type === QuestionType.ESSAY"
                  [class.text-purple-700]="item.type === QuestionType.SHORT_ANSWER || item.type === QuestionType.ESSAY">
                  {{ questionTypeLabel(item.type) }}
                </span>
              </div>

              <p class="text-sm text-gray-500 mb-2">
                <span class="font-medium">Öğrenci Cevabı:</span>
                {{ getAnswerText(item) }}
              </p>

              @if (item.type === QuestionType.SHORT_ANSWER || item.type === QuestionType.ESSAY) {
                @if (item.rubric) {
                  <app-rubric-grader
                    [attemptId]="attempt.id"
                    [rubric]="item.rubric"
                    [responses]="[item.response]"
                    (gradeSubmit)="onGradeSubmit($event)" />
                } @else {
                  @if (item.response.manualScore != null && !isEditing(item.question.id)) {
                    <div class="flex flex-wrap items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <span class="text-sm font-medium text-green-800">
                        <mat-icon class="text-lg align-text-bottom">check_circle</mat-icon>
                        Değerlendirildi
                      </span>
                      <span class="text-sm text-gray-600">Puan: {{ item.response.manualScore }} / {{ item.response.maxScore }}</span>
                      @if (item.response.gradingNote) {
                        <span class="text-sm text-gray-500">Not: {{ item.response.gradingNote }}</span>
                      }
                      @if (canModify()) {
                        <button mat-stroked-button size="small" (click)="startEdit(item.question.id)">
                          <mat-icon>edit</mat-icon> Düzenle
                        </button>
                      }
                    </div>
                  } @else {
                    <div class="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div class="flex flex-wrap items-center gap-3">
                        <span class="text-sm text-gray-500">Otomatik Puan: <strong>{{ item.response.autoScore }} / {{ item.response.maxScore }}</strong></span>
                        @if (item.response.manualScore != null) {
                          <span class="text-sm font-medium text-green-700">Kaydedilen Puan: {{ item.response.manualScore }}</span>
                        }
                      </div>
                      <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Puan (0-{{ item.response.maxScore }})</mat-label>
                        <input matInput type="number" #scoreInput
                               [value]="item.response.manualScore ?? ''"
                               min="0" [max]="item.response.maxScore" required />
                        @if (scoreError()) {
                          <mat-error>{{ scoreError() }}</mat-error>
                        }
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Değerlendirme Notu</mat-label>
                        <textarea matInput rows="2" #noteInput
                                  [value]="item.response.gradingNote || ''"></textarea>
                      </mat-form-field>
                      @if (canModify()) {
                        <div class="flex items-center gap-2">
                          <button mat-stroked-button color="primary" (click)="onManualGrade(item, scoreInput.value, noteInput.value)">
                            <mat-icon>save</mat-icon> Kaydet
                          </button>
                          @if (item.response.manualScore != null) {
                            <button mat-stroked-button (click)="cancelEdit(item.question.id)">
                              İptal
                            </button>
                        }
                      </div>
                    }
                    </div>
                  }
                }
              } @else {
                <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span class="text-sm" [class.text-green-600]="item.response.isCorrect" [class.text-red-600]="!item.response.isCorrect">
                    <mat-icon class="text-lg align-text-bottom">{{ item.response.isCorrect ? 'check_circle' : 'cancel' }}</mat-icon>
                    {{ item.response.isCorrect ? 'Doğru' : 'Yanlış' }}
                  </span>
                  <span class="text-sm text-gray-600">Puan: {{ item.response.manualScore ?? item.response.autoScore }} / {{ item.response.maxScore }}</span>
                  @if (item.response.gradingNote) {
                    <span class="text-sm text-gray-500 ml-2">Not: {{ item.response.gradingNote }}</span>
                  }
                </div>
              }

              @if (item.response.gradedBy) {
                <div class="text-xs text-gray-400 mt-2">
                  Değerlendiren: {{ item.response.gradedBy }} - {{ item.response.gradedAt | date:'short' }}
                </div>
                        }
                      </div>
                    }
        </div>

        @if (gradingHistory().length > 0) {
          <div class="bg-white rounded-lg shadow-sm p-4">
            <h2 class="text-lg font-semibold text-gray-900 mb-3">Değerlendirme Geçmişi</h2>
            <div class="space-y-2">
              @for (h of gradingHistory(); track h.questionId + '_' + h.gradedAt) {
                <div class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <span class="text-gray-600">{{ h.gradedAt | date:'short' }}</span>
                  <span>Soru #{{ h.questionId }}: <span class="font-medium">{{ h.previousScore }} → {{ h.totalScore }}</span></span>
                  @if (h.changeReason) {
                    <span class="text-xs text-gray-400 italic">"{{ h.changeReason }}"</span>
                  }
                </div>
              }
            </div>
          </div>
        }
      } @else {
        <div class="bg-white rounded-lg shadow-sm p-8 text-center">
          <mat-icon class="text-4xl text-gray-300 mb-2">assignment_late</mat-icon>
          <p class="text-gray-500">Değerlendirme bulunamadı</p>
          <a routerLink="/grading" class="text-blue-600 hover:underline mt-2 inline-block">Değerlendirmelere Dön</a>
        </div>
      }
    </div>
  `
})
export class GradingDetailPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private gradingFacade = inject(GradingFacade);
  private dialog = inject(MatDialog);
  private permissionService = inject(PermissionService);

  canModify = computed(() =>
    this.permissionService.hasAnyPermission(['grading_grade'])
  );

  readonly ResultStatus = ResultStatus;
  readonly QuestionType = QuestionType;

  loading = signal(true);
  error = signal<string | null>(null);
  finalizing = signal(false);
  scoreError = signal<string | null>(null);

  attempt = signal<Attempt | null>(null);
  questionItems = signal<QuestionItem[]>([]);
  editingQuestionIds = signal<Set<number>>(new Set());
  gradingHistory = computed(() =>
    this.gradingFacade.gradingHistory().filter(h => h.attemptId === this.attempt()?.id)
  );

  constructor() {
    this.loadData();
  }

  loadData(): void {
    const id = Number(this.route.snapshot.paramMap.get('attemptId'));
    if (!id) {
      this.error.set('Geçersiz deneme ID');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.scoreError.set(null);
    this.editingQuestionIds.set(new Set());

    this.gradingFacade.getAttempt(id).subscribe({
      next: (attempt) => {
        if (!attempt) {
          this.error.set('Deneme bulunamadı');
          this.loading.set(false);
          return;
        }
        this.attempt.set(attempt);
        this.buildQuestionItems(attempt);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Deneme yüklenirken hata oluştu');
        this.loading.set(false);
      }
    });
  }

  private buildQuestionItems(attempt: Attempt): void {
    const items: QuestionItem[] = attempt.questionResponses.map(response => {
      const question = this.gradingFacade.getQuestion(response.questionId) ?? {
        id: response.questionId,
        examId: attempt.examId,
        questionText: `Soru #${response.questionId}`,
        type: QuestionType.MULTIPLE_CHOICE,
        options: [],
        correctAnswer: 0,
        difficulty: 'easy' as any,
        points: response.maxScore,
        status: 'active' as any,
        createdAt: '',
        updatedAt: '',
        version: 1,
      };
      const type = question.type;
      const rubric = (type === QuestionType.SHORT_ANSWER || type === QuestionType.ESSAY)
        ? (this.gradingFacade.getRubricSync(question.id) ?? null)
        : null;

      return { question, response, type, rubric };
    });

    this.questionItems.set(items);
  }

  onGradeSubmit(result: GradingResult): void {
    this.gradingFacade.gradeQuestion(
      result.attemptId,
      result.questionId,
      result.scores,
      result.comment,
      result.changeReason,
    ).subscribe({
      next: () => {
        this.loadData();
      },
      error: (err) => {
        this.error.set(err.message || 'Değerlendirme kaydedilemedi');
      }
    });
  }

  isEditing(questionId: number): boolean {
    return this.editingQuestionIds().has(questionId);
  }

  startEdit(questionId: number): void {
    this.scoreError.set(null);
    this.editingQuestionIds.update(s => {
      const next = new Set(s);
      next.add(questionId);
      return next;
    });
  }

  cancelEdit(questionId: number): void {
    this.scoreError.set(null);
    this.editingQuestionIds.update(s => {
      const next = new Set(s);
      next.delete(questionId);
      return next;
    });
  }

  onManualGrade(item: QuestionItem, scoreStr: string, note: string): void {
    const attempt = this.attempt();
    if (!attempt) return;
    const score = Number(scoreStr);
    if (isNaN(score) || score < 0 || score > item.response.maxScore) {
      this.scoreError.set('Geçerli bir puan girin (0 - ' + item.response.maxScore + ')');
      return;
    }
    this.scoreError.set(null);
    const changeReason = score !== item.response.autoScore ? 'Manuel değerlendirme' : undefined;
    this.gradingFacade.gradeQuestion(
      attempt.id,
      item.question.id,
      [{ criterionId: 0, score, comment: note }],
      note,
      changeReason,
    ).subscribe({
      next: () => {
        const updated = this.questionItems().map(qi =>
          qi.question.id === item.question.id
            ? {
                ...qi,
                response: {
                  ...qi.response,
                  manualScore: score,
                  gradingNote: note,
                  gradedBy: qi.response.gradedBy ?? attempt.studentId,
                  gradedAt: new Date().toISOString(),
                },
              }
            : qi
        );
        this.questionItems.set(updated);
        this.cancelEdit(item.question.id);
      },
      error: (err) => {
        this.error.set(err.message || 'Puanlama kaydedilemedi');
      }
    });
  }

  finalize(): void {
    const att = this.attempt();
    if (!att) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Değerlendirmeyi Sonuçlandır',
        message: 'Değerlendirmeyi sonuçlandırmak istediğinize emin misiniz? Sonuçlandırıldıktan sonra not değiştirilemez.',
        confirmLabel: 'Sonuçlandır',
        cancelLabel: 'İptal',
      },
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.finalizing.set(true);
      this.gradingFacade.finalizeGrading(att.id).subscribe({
        next: () => {
          this.finalizing.set(false);
          this.router.navigate(['/grading']);
        },
        error: (err) => {
          this.finalizing.set(false);
          this.error.set(err.message || 'Sonuçlandırma başarısız');
        }
      });
    });
  }

  getStudentName(id: number): string {
    return this.gradingFacade.getStudentName(id);
  }

  getExamName(id: number): string {
    return this.gradingFacade.getExamName(id);
  }

  questionTypeLabel(type: QuestionType): string {
    const labels: Record<QuestionType, string> = {
      [QuestionType.MULTIPLE_CHOICE]: 'Çoktan Seçmeli',
      [QuestionType.TRUE_FALSE]: 'Doğru/Yanlış',
      [QuestionType.SHORT_ANSWER]: 'Kısa Cevap',
      [QuestionType.ESSAY]: 'Kompozisyon',
    };
    return labels[type] ?? type;
  }

  getAnswerText(item: QuestionItem): string {
    const a = item.response.answer;
    if (!a) return 'Cevap verilmemiş';
    if (item.type === QuestionType.MULTIPLE_CHOICE || item.type === QuestionType.TRUE_FALSE) {
      const idx = parseInt(a);
      return item.question.options?.[idx] ?? a;
    }
    return a;
  }
}
