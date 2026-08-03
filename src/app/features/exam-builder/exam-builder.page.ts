import { Component,  inject,  signal,  computed,  OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ExamBuilderFacade } from './data-access/exam-builder.facade';
import { NotificationService } from '@core/observability/notification.service';
import { BlueprintConstraintPanelComponent } from '@shared/components/blueprint-constraint-panel/blueprint-constraint-panel.component';
import { BlueprintEditorComponent } from '@shared/components/blueprint-editor/blueprint-editor.component';
import { QuestionEditorComponent } from '@shared/components/question-editor/question-editor.component';
import { ErrorStateComponent, ConfirmDialogComponent } from '@shared/components';
import { StatusTextPipe } from '@shared/pipes';
import { ExamBlueprint, BlueprintConstraint, BlueprintSummary, PointDistribution } from '@core/models/exam-blueprint.model';
import { Exam } from '@core/models/exam.model';
import { Question } from '@core/models/question.model';
import { LearningOutcome } from '@core/models/learning-outcome.model';
import { BlueprintStatus, QuestionType, Difficulty } from '@core/models/enums';

@Component({
  selector: 'app-exam-builder',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatDialogModule, MatButtonModule, MatIconModule, MatTableModule, MatCardModule,
    MatProgressSpinnerModule, MatTooltipModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatPaginatorModule,
    BlueprintConstraintPanelComponent, BlueprintEditorComponent, QuestionEditorComponent, ErrorStateComponent, StatusTextPipe,
  ],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h1 class="text-2xl font-bold text-gray-900">Sınav Oluşturucu</h1>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon> Yeni Blueprint
        </button>
      </div>

      <div class="bg-white rounded-lg shadow-sm overflow-x-auto">
        @if (loading()) {
          <div class="flex justify-center py-12">
            <mat-spinner diameter="40" />
          </div>
        } @else if (error(); as err) {
          <app-error-state [title]="'Hata'" [message]="err" [retryable]="true" (retry)="loadData()" />
        } @else if (blueprints().length === 0) {
          <div class="text-center p-8 text-gray-500">
            <mat-icon class="text-4xl mb-2">inbox</mat-icon>
            <p>Henüz blueprint oluşturulmamış</p>
          </div>
        } @else {
          <table mat-table [dataSource]="paginatedBlueprints()" class="w-full">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Blueprint Adı</th>
              <td mat-cell *matCellDef="let b">
                <button mat-button class="text-blue-600 hover:underline font-medium" (click)="selectBlueprint(b)">
                  {{ b.name }}
                </button>
              </td>
            </ng-container>
            <ng-container matColumnDef="exam">
              <th mat-header-cell *matHeaderCellDef>Sınav</th>
              <td mat-cell *matCellDef="let b">{{ getExamName(b.examId) }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Durum</th>
              <td mat-cell *matCellDef="let b">
                <span class="px-2 py-1 rounded-full text-xs font-medium" [class]="statusClass(b.status)">
                  {{ b.status | statusText }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>İşlemler</th>
              <td mat-cell *matCellDef="let b">
                <div class="flex items-center gap-1">
                  <button mat-stroked-button color="primary" size="small" (click)="selectBlueprint(b)">
                    <mat-icon>visibility</mat-icon> Detay
                  </button>
                  <button mat-icon-button (click)="openEditDialog(b)" matTooltip="Düzenle">
                    <mat-icon class="text-sm">edit</mat-icon>
                  </button>
                  <button mat-icon-button (click)="confirmDelete(b)" matTooltip="Sil">
                    <mat-icon class="text-sm">delete</mat-icon>
                  </button>
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

      @if (selectedBlueprint(); as bp) {
        <mat-card>
          <mat-card-header>
            <mat-card-title class="!flex !flex-col gap-1">
              <span class="font-semibold">{{ bp.name }}</span>
              <span class="text-sm font-normal text-gray-500">{{ getExamName(bp.examId) }}</span>
            </mat-card-title>
          </mat-card-header>
          <mat-card-content class="space-y-4 pt-4">
            <div class="flex flex-wrap items-center gap-4">
              <span class="text-sm text-gray-600">Toplam Soru: <strong>{{ bp.summary.totalQuestions }}</strong></span>
              <span class="text-sm text-gray-600">Toplam Puan: <strong>{{ bp.summary.totalPoints }}</strong></span>
              <span class="px-2 py-1 rounded-full text-xs font-medium" [class]="statusClass(bp.status)">
                {{ bp.status === BlueprintStatus.READY ? 'HAZIR' : bp.status === BlueprintStatus.VIOLATED ? 'İHLAL' : 'TASLAK' }}
              </span>
            </div>

            @if (pointDistribution(); as pd) {
              <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Puan Dağılımı</h4>
                <div class="flex flex-wrap gap-2 text-xs">
                  @for (item of pd.byDifficulty; track item.difficulty) {
                    <span class="px-2 py-1 rounded-full font-medium"
                      [class.bg-green-100]="item.difficulty === 'easy'"
                      [class.text-green-800]="item.difficulty === 'easy'"
                      [class.bg-yellow-100]="item.difficulty === 'medium'"
                      [class.text-yellow-800]="item.difficulty === 'medium'"
                      [class.bg-red-100]="item.difficulty === 'hard'"
                      [class.text-red-800]="item.difficulty === 'hard'">
                      {{ item.difficulty === 'easy' ? 'Kolay' : item.difficulty === 'medium' ? 'Orta' : 'Zor' }}: {{ item.totalPoints }}p ({{ item.count }})
                    </span>
                  }
                </div>
                <div class="flex flex-wrap gap-1 text-xs text-gray-600">
                  @for (item of pd.byOutcome; track item.outcomeId) {
                    <span class="px-1.5 py-0.5 bg-white border rounded">{{ item.outcomeName }}: {{ item.totalPoints }}p</span>
                  }
                </div>
                <div class="flex flex-wrap gap-1 text-xs text-gray-600">
                  @for (item of pd.byType; track item.type) {
                    <span class="px-1.5 py-0.5 bg-white border rounded">{{ typeShortLabel(item.type) }}: {{ item.totalPoints }}p ({{ item.count }})</span>
                  }
                </div>
              </div>
            }

            <app-blueprint-constraint-panel
              [constraints]="bp.constraints"
              [coverage]="activeCoverage()"
              [outcomes]="allOutcomes()"
              (constraintsChange)="onConstraintsChange(bp.id, $event)" />

            @if (examQuestions().length > 0) {
              <div class="border rounded-lg p-4 space-y-3 mt-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h4 class="font-semibold text-gray-900">Soru Seçimi ({{ selectedCount() }} / {{ examQuestions().length }})</h4>
                  <div class="flex flex-wrap gap-2">
                    <button mat-stroked-button size="small" (click)="selectAllQuestions()">
                      <mat-icon class="text-sm">select_all</mat-icon> Hepsini Seç
                    </button>
                    <button mat-stroked-button size="small" (click)="clearSelection()">
                      <mat-icon class="text-sm">deselect</mat-icon> Seçimi Temizle
                    </button>
                  </div>
                </div>
                <div class="max-h-96 overflow-y-auto space-y-1">
                  @for (q of examQuestions(); track q.id) {
                    <label class="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200"
                           [class.bg-blue-50]="manualSelectedIds().has(q.id)"
                           [class.border-blue-300]="manualSelectedIds().has(q.id)">
                      <mat-checkbox
                        [checked]="manualSelectedIds().has(q.id)"
                        (change)="toggleQuestion(q.id)" />
                      <span class="font-mono text-xs text-gray-400 w-8">#{{ q.id }}</span>
                      <span class="flex-1 text-sm truncate">{{ q.questionText }}</span>
                      <button mat-icon-button (click)="editQuestion(q, $event)" matTooltip="Soruyu Düzenle" class="!w-7 !h-7">
                        <mat-icon class="!text-sm">edit</mat-icon>
                      </button>
                      <span class="px-1.5 py-0.5 rounded text-xs font-medium"
                        [class.bg-green-100]="q.difficulty === 'easy'"
                        [class.text-green-700]="q.difficulty === 'easy'"
                        [class.bg-yellow-100]="q.difficulty === 'medium'"
                        [class.text-yellow-700]="q.difficulty === 'medium'"
                        [class.bg-red-100]="q.difficulty === 'hard'"
                        [class.text-red-700]="q.difficulty === 'hard'">
                        {{ q.difficulty === 'easy' ? 'Kolay' : q.difficulty === 'medium' ? 'Orta' : 'Zor' }}
                      </span>
                      <span class="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        {{ q.type === 'multiple_choice' ? 'ÇS' : q.type === 'true_false' ? 'D/Y' : q.type === 'short_answer' ? 'KC' : q.type === 'essay' ? 'KM' : q.type }}
                      </span>
                      <span class="text-xs text-gray-400">{{ q.points }}p</span>
                    </label>
                  }
                </div>
                @if (manualViolations().length > 0) {
                  <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                    <p class="text-sm font-medium text-yellow-800 mb-1">Eksik Kapsama</p>
                    <ul class="list-disc list-inside text-sm text-yellow-700">
                      @for (v of manualViolations(); track v) {
                        <li>{{ v }}</li>
                      }
                    </ul>
                  </div>
                }
              </div>
            }

            @if (autoSelectResult(); as result) {
              <div class="border rounded-lg p-4 space-y-3">
                <h4 class="font-semibold text-gray-900">Otomatik Seçim Sonucu</h4>
                <p class="text-sm text-gray-600">Toplam {{ result.selectedIds.length }} soru seçildi</p>

                <div class="space-y-2">
                  @for (q of result.selectedQuestions; track q.id) {
                    <div class="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                      <span class="font-mono text-xs text-gray-500">#{{ q.id }}</span>
                      <span>{{ q.questionText }}</span>
                    </div>
                  }
                </div>

                <div class="text-sm text-gray-600">
                  @for (c of result.coverage; track c.outcomeId) {
                    <p>{{ getOutcomeName(c.outcomeId) }}: {{ c.selected }} / {{ c.required }} seçildi</p>
                  }
                </div>
              </div>
            }

            @if (selectedCount() === 0 && bp.status !== BlueprintStatus.READY) {
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-3" role="status">
                <p class="text-sm text-blue-700">
                  <mat-icon class="text-sm align-text-bottom">info</mat-icon>
                  Henüz soru seçilmedi. "Otomatik Seç" butonuna tıklayın veya aşağıdaki listeden soruları manuel olarak işaretleyin.
                </p>
              </div>
            }

            <div class="flex flex-wrap gap-2 pt-2">
              <button mat-raised-button color="primary" (click)="autoSelect(bp.id)">
                <mat-icon>auto_fix_high</mat-icon> Otomatik Seç
              </button>
              @if (selectedCount() > 0 && bp.status !== BlueprintStatus.READY) {
                <button mat-raised-button color="accent" (click)="publish(bp.id)">
                  <mat-icon>publish</mat-icon> Yayınla ({{ selectedCount() }} soru)
                </button>
              }
              @if (bp.status === BlueprintStatus.READY) {
                <button mat-stroked-button color="accent" (click)="publish(bp.id)">
                  <mat-icon>publish</mat-icon> Yayınla
                </button>
              }
            </div>

            @if (autoSelectLoading()) {
              <div class="flex justify-center py-4">
                <mat-spinner diameter="30" />
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `
})
export class ExamBuilderPage implements OnInit {
  private facade = inject(ExamBuilderFacade);
  private notification = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  readonly BlueprintStatus = BlueprintStatus;
  displayedColumns = ['name', 'exam', 'status', 'actions'];

  pageSize = signal(10);
  pageIndex = signal(0);
  total = computed(() => this.blueprints().length);
  paginatedBlueprints = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.blueprints().slice(start, start + this.pageSize());
  });

  loading = signal(true);
  error = signal<string | null>(null);
  autoSelectLoading = signal(false);

  blueprints = signal<ExamBlueprint[]>([]);
  examList = signal<Exam[]>([]);
  selectedBlueprint = signal<ExamBlueprint | null>(null);
  allOutcomes = signal<LearningOutcome[]>([]);
  examQuestions = signal<Question[]>([]);
  manualSelectedIds = signal<Set<number>>(new Set());

  selectedCount = computed(() => this.manualSelectedIds().size);

  pointDistribution = computed(() => {
    const bp = this.selectedBlueprint();
    return bp ? this.facade.computePointDistribution(bp.id) : undefined;
  });

  activeCoverage = computed(() => {
    const bp = this.selectedBlueprint();
    if (!bp) return [];
    return this.computeCoverage(bp, [...this.manualSelectedIds()]);
  });

  manualViolations = computed(() => {
    const bp = this.selectedBlueprint();
    if (!bp) return [];
    return this.computeViolations(bp, [...this.manualSelectedIds()]);
  });

  autoSelectResult = signal<{
    selectedIds: number[];
    selectedQuestions: Question[];
    coverage: BlueprintSummary['coverage'];
    violations: string[];
  } | null>(null);

  ngOnInit() {
    const qp = this.route.snapshot.queryParamMap;
    const examIdParam = qp.get('examId');
    if (examIdParam) {
      const examId = Number(examIdParam);
      this.selectedExamId.set(examId);
    }
    this.loadData();
  }

  selectedExamId = signal<number | null>(null);

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.facade.getBlueprints().subscribe({
      next: (data) => {
        this.blueprints.set(data);
        this.loading.set(false);
        this.applyExamIdFromRoute();
      },
      error: (err) => {
        this.error.set(err.message || 'Blueprintler yüklenirken hata oluştu');
        this.loading.set(false);
      },
    });
    this.facade.getExams().subscribe(exams => this.examList.set(exams));
  }

  private applyExamIdFromRoute(): void {
    const examId = this.selectedExamId();
    if (examId == null) return;
    const match = this.blueprints().find(b => b.examId === examId);
    if (match) this.selectBlueprint(match);
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  getExamName(examId: number): string {
    return this.facade.getExamName(examId);
  }

  editQuestion(q: Question, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const dialogRef = this.dialog.open(QuestionEditorComponent, {
      width: '600px',
      data: {
        question: {
          id: q.id,
          stem: q.questionText,
          type: q.type as QuestionType,
          difficulty: q.difficulty as Difficulty,
          points: q.points,
          outcomes: this.allOutcomes(),
        },
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result) return;
      const editedType = result.type as QuestionType;
      let options: string[] = [];
      let correctAnswer: number | string;

      if (editedType === QuestionType.MULTIPLE_CHOICE) {
        options = (result.options || []).filter((o: any) => o.value).map((o: any) => o.value);
        correctAnswer = (result.options || []).findIndex((o: any) => o.isCorrect);
      } else if (editedType === QuestionType.TRUE_FALSE) {
        options = ['Doğru', 'Yanlış'];
        correctAnswer = String(result.correctAnswer || '').trim().toLowerCase() === 'yanlış' ? 1 : 0;
      } else {
        options = [];
        correctAnswer = (result.correctAnswer || '');
      }

      this.facade.updateQuestion(q.id, {
        questionText: result.stem,
        type: editedType,
        difficulty: result.difficulty,
        points: result.points,
        options,
        correctAnswer,
        outcomeIds: result.outcomeIds || [],
      }).subscribe(() => {
        this.reloadExamQuestions();
      });
    });
  }

  private reloadExamQuestions(): void {
    const bp = this.selectedBlueprint();
    if (!bp) return;
    const exam = this.facade.getExam(bp.examId);
    if (exam) {
      this.facade.getQuestionsByCourse(exam.courseId).subscribe(data => this.examQuestions.set(data));
    }
  }

  getOutcomeName(outcomeId: number): string {
    const outcome = this.allOutcomes().find(o => o.id === outcomeId);
    return outcome ? `${outcome.code} - ${outcome.name}` : `Kazanım #${outcomeId}`;
  }

  selectBlueprint(bp: ExamBlueprint): void {
    this.selectedBlueprint.set(bp);
    this.manualSelectedIds.set(new Set());
    const exam = this.facade.getExam(bp.examId);
    if (exam) {
      this.facade.getOutcomesByCourse(exam.courseId).subscribe(outcomes => {
        this.allOutcomes.set(outcomes);
      });
    }
    this.reloadExamQuestions();
  }

  autoSelect(blueprintId: number): void {
    this.autoSelectLoading.set(true);
    this.autoSelectResult.set(null);
    this.facade.autoSelectQuestions(blueprintId).subscribe({
      next: (result) => {
        this.autoSelectLoading.set(false);
        this.facade.getBlueprint(blueprintId).subscribe(bp => {
          if (bp) this.selectedBlueprint.set(bp);
          this.facade.getBlueprints().subscribe(data => this.blueprints.set(data));
        });
        if (result) {
          const selectedQuestions = this.facade.getQuestionsByIds(result.selectedIds);
          this.autoSelectResult.set({ ...result, selectedQuestions });
          this.manualSelectedIds.set(new Set(result.selectedIds));
        }
      },
      error: () => this.autoSelectLoading.set(false),
    });
  }

  publish(blueprintId: number): void {
    if (this.manualViolations().length > 0) {
      this.notification.show('Blueprint kısıtlamaları karşılanmadan yayınlanamaz', 'error');
      return;
    }
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Sınavı Yayınla',
        message: 'Seçilen sorularla sınavı yayınlamak istediğinize emin misiniz?',
        confirmLabel: 'Yayınla',
        cancelLabel: 'İptal',
      },
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) this.doPublish(blueprintId);
    });
  }

  private doPublish(blueprintId: number): void {
    const ids = [...this.manualSelectedIds()];
    this.facade.publishBlueprint(blueprintId, ids.length > 0 ? ids : undefined).subscribe({
      next: () => {
        this.facade.getBlueprint(blueprintId).subscribe(bp => {
          if (bp) this.selectedBlueprint.set(bp);
          this.facade.getBlueprints().subscribe(data => this.blueprints.set(data));
        });
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(BlueprintEditorComponent, {
      width: '500px',
      data: {
        exams: this.examList(),
        preselectedExamId: this.selectedExamId() ?? undefined,
      },
    });

    dialogRef.afterClosed().subscribe((result: { name: string; examId: number; id?: number | null } | null) => {
      if (!result) return;
      if (result.id) {
        this.facade.updateBlueprint(result.id, { name: result.name }).subscribe(() => {
          this.facade.getBlueprints().subscribe(data => this.blueprints.set(data));
        });
      } else {
        this.facade.createBlueprint(result.name, result.examId).subscribe(() => {
          this.facade.getBlueprints().subscribe(data => this.blueprints.set(data));
        });
      }
    });
  }

  openEditDialog(blueprint: ExamBlueprint): void {
    const dialogRef = this.dialog.open(BlueprintEditorComponent, {
      width: '500px',
      data: {
        exams: this.examList(),
        blueprint: { id: blueprint.id, name: blueprint.name, examId: blueprint.examId },
      },
    });

    dialogRef.afterClosed().subscribe((result: { name: string; examId: number } | null) => {
      if (result) {
        this.facade.updateBlueprint(blueprint.id, result).subscribe(() => {
          this.facade.getBlueprints().subscribe(data => this.blueprints.set(data));
          const selected = this.selectedBlueprint();
          if (selected?.id === blueprint.id) {
            this.facade.getBlueprint(blueprint.id).subscribe(bp => {
              if (bp) this.selectedBlueprint.set(bp);
            });
          }
        });
      }
    });
  }

  confirmDelete(blueprint: ExamBlueprint): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Blueprint Sil',
        message: `"${blueprint.name}" blueprint'ini silmek istediğinize emin misiniz? Kısıtlamalar ve seçili sorular silinecek.`,
        confirmLabel: 'Sil',
        cancelLabel: 'İptal',
      },
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.facade.deleteBlueprint(blueprint.id).subscribe(() => {
        if (this.selectedBlueprint()?.id === blueprint.id) {
          this.selectedBlueprint.set(null);
        }
        this.facade.getBlueprints().subscribe(data => this.blueprints.set(data));
      });
    });
  }

  statusClass(status: BlueprintStatus): string {
    switch (status) {
      case BlueprintStatus.DRAFT: return 'bg-gray-100 text-gray-700';
      case BlueprintStatus.READY: return 'bg-green-100 text-green-700';
      case BlueprintStatus.VIOLATED: return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  toggleQuestion(questionId: number): void {
    this.manualSelectedIds.update(s => {
      const next = new Set(s);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      return next;
    });
  }

  onConstraintsChange(blueprintId: number, constraints: BlueprintConstraint[]): void {
    this.facade.updateConstraints(blueprintId, constraints);
    const bp = this.blueprints().find(b => b.id === blueprintId);
    if (bp) {
      this.selectedBlueprint.set({ ...bp, constraints });
    }
  }

  selectAllQuestions(): void {
    this.manualSelectedIds.set(new Set(this.examQuestions().map(q => q.id)));
  }

  clearSelection(): void {
    this.manualSelectedIds.set(new Set());
  }

  private computeCoverage(bp: ExamBlueprint, selectedIds: number[]): BlueprintSummary['coverage'] {
    const cov: BlueprintSummary['coverage'] = [];
    for (const c of bp.constraints) {
      const matching = this.examQuestions().filter(q =>
        selectedIds.includes(q.id) &&
        q.difficulty === c.difficulty &&
        q.type === c.questionType &&
        (!c.outcomeId || (q.outcomeIds ?? []).includes(c.outcomeId))
      );
      cov.push({ outcomeId: c.outcomeId, selected: matching.length, required: c.minCount });
    }
    return cov;
  }

  private computeViolations(bp: ExamBlueprint, selectedIds: number[]): string[] {
    const violations: string[] = [];
    for (const c of bp.constraints) {
      const matching = this.examQuestions().filter(q =>
        selectedIds.includes(q.id) &&
        q.difficulty === c.difficulty &&
        q.type === c.questionType &&
        (!c.outcomeId || (q.outcomeIds ?? []).includes(c.outcomeId))
      );
      if (matching.length < c.minCount) {
        const name = this.getOutcomeName(c.outcomeId);
        const typeLabel = this.constraintTypeLabel(c.questionType);
        const diffLabel = this.constraintDiffLabel(c.difficulty);
        violations.push(`${name} (${typeLabel}, ${diffLabel}): ${matching.length} seçildi, ${c.minCount} gerekli`);
      }
    }
    return violations;
  }

  private constraintTypeLabel(t: string): string {
    switch (t) {
      case 'multiple_choice': return 'Çoktan Seçmeli';
      case 'true_false': return 'Doğru/Yanlış';
      case 'short_answer': return 'Kısa Cevap';
      case 'essay': return 'Kompozisyon';
      default: return t;
    }
  }

  private constraintDiffLabel(d: string): string {
    switch (d) {
      case 'easy': return 'Kolay';
      case 'medium': return 'Orta';
      case 'hard': return 'Zor';
      default: return d;
    }
  }

  typeShortLabel(t: string): string {
    switch (t) {
      case 'multiple_choice': return 'ÇS';
      case 'true_false': return 'D/Y';
      case 'short_answer': return 'KC';
      case 'essay': return 'KM';
      case 'matching': return 'EŞ';
      default: return t;
    }
  }
}
