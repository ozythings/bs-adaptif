import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Rubric, RubricCriterion, RubricStatus } from '@core/models/rubric.model';
import { QuestionType } from '@core/models/enums';
import { GradingFacade } from './data-access/grading.facade';
import { ErrorStateComponent, ConfirmDialogComponent } from '@shared/components';

@Component({
  selector: 'app-rubric-management',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatIconModule, MatButtonModule,
    MatTableModule, MatCardModule, MatProgressSpinnerModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule,
    MatDividerModule, MatTooltipModule, ErrorStateComponent,
  ],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Rubrik Yönetimi</h1>
        <button mat-raised-button color="primary" (click)="openEditor()">
          <mat-icon>add</mat-icon> Yeni Rubrik
        </button>
      </div>

      <div class="bg-white rounded-lg shadow-sm overflow-x-auto">
        @if (loading()) {
          <div class="flex justify-center py-12">
            <mat-spinner diameter="40" />
          </div>
        } @else if (error(); as err) {
          <app-error-state [title]="'Hata'" [message]="err" [retryable]="true" (retry)="loadData()" />
        } @else if (rubrics().length === 0) {
          <div class="text-center p-8 text-gray-500">
            <mat-icon class="text-4xl mb-2">assignment</mat-icon>
            <p>Henüz rubrik oluşturulmamış</p>
          </div>
        } @else {
          <table mat-table [dataSource]="rubrics()" class="w-full">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let r">#{{ r.id }}</td>
            </ng-container>

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Ad</th>
              <td mat-cell *matCellDef="let r">{{ r.name }}</td>
            </ng-container>

            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Soru Tipi</th>
              <td mat-cell *matCellDef="let r">
                @if (r.questionType) {
                  <span class="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    {{ questionTypeLabel(r.questionType) }}
                  </span>
                } @else {
                  <span class="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    Tümü
                  </span>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="criteria">
              <th mat-header-cell *matHeaderCellDef>Kriter Sayısı</th>
              <td mat-cell *matCellDef="let r">{{ r.criteria.length }}</td>
            </ng-container>

            <ng-container matColumnDef="maxPoints">
              <th mat-header-cell *matHeaderCellDef>Maks Puan</th>
              <td mat-cell *matCellDef="let r">{{ getMaxPoints(r) }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Durum</th>
              <td mat-cell *matCellDef="let r">
                <span class="px-2 py-1 rounded-full text-xs font-medium"
                  [class.bg-green-100]="r.status === 'active'"
                  [class.text-green-700]="r.status === 'active'"
                  [class.bg-gray-100]="r.status !== 'active'"
                  [class.text-gray-700]="r.status !== 'active'">
                  {{ r.status === 'active' ? 'Aktif' : 'Pasif' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>İşlemler</th>
              <td mat-cell *matCellDef="let r">
                <div class="flex items-center gap-1">
                  <button mat-icon-button (click)="openEditor(r)" matTooltip="Düzenle">
                    <mat-icon class="text-sm">edit</mat-icon>
                  </button>
                  <button mat-icon-button (click)="confirmDelete(r)" matTooltip="Sil">
                    <mat-icon class="text-sm">delete</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        }
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    @if (editingRubric(); as rubric) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" (click)="closeEditor()">
        <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">
              {{ isNewRubric() ? 'Yeni Rubrik' : 'Rubrik Düzenle' }}
            </h2>

            <form [formGroup]="editorForm" class="space-y-4">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Rubrik Adı</mat-label>
                <input matInput formControlName="name" placeholder="Rubrik adını girin">
                @if (editorForm.get('name')?.hasError('required')) {
                  <mat-error>Bu alan zorunludur</mat-error>
                }
              </mat-form-field>

              <div class="grid grid-cols-2 gap-4">
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Soru Tipi</mat-label>
                  <mat-select formControlName="questionType">
                    <mat-option [value]="''">Tümü</mat-option>
                    <mat-option [value]="QuestionType.MULTIPLE_CHOICE">Çoktan Seçmeli</mat-option>
                    <mat-option [value]="QuestionType.TRUE_FALSE">Doğru/Yanlış</mat-option>
                    <mat-option [value]="QuestionType.SHORT_ANSWER">Kısa Cevap</mat-option>
                    <mat-option [value]="QuestionType.ESSAY">Kompozisyon</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Soru ID (İsteğe Bağlı)</mat-label>
                  <input matInput type="number" formControlName="questionId" placeholder="0 = tümü">
                </mat-form-field>
              </div>

              <mat-divider></mat-divider>

              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="font-semibold text-gray-800">Kriterler</h3>
                  <button mat-stroked-button type="button" (click)="addCriterion()">
                    <mat-icon class="text-sm">add</mat-icon> Kriter Ekle
                  </button>
                </div>

                <div formArrayName="criteria" class="space-y-4">
                  @for (criterion of criteriaControls; track criterion; let i = $index) {
                    <div [formGroupName]="i" class="border rounded-lg p-4 space-y-3 bg-gray-50">
                      <div class="flex items-center justify-between">
                        <span class="font-medium text-gray-700">Kriter {{ i + 1 }}</span>
                        @if (criteriaControls.length > 1) {
                          <button mat-icon-button type="button" (click)="removeCriterion(i)" matTooltip="Kriteri kaldır" class="!w-7 !h-7">
                            <mat-icon class="!text-sm !text-red-500">delete</mat-icon>
                          </button>
                        }
                      </div>

                      <div class="grid grid-cols-2 gap-3">
                        <mat-form-field appearance="outline" class="w-full">
                          <mat-label>Ad</mat-label>
                          <input matInput formControlName="name" placeholder="Kriter adı">
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="w-full">
                          <mat-label>Maks Puan</mat-label>
                          <input matInput type="number" formControlName="maxPoints" min="1" max="100">
                        </mat-form-field>
                      </div>

                      <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Açıklama</mat-label>
                        <input matInput formControlName="description" placeholder="Kriter açıklaması">
                      </mat-form-field>

                      <div class="space-y-2">
                        <div class="flex items-center justify-between">
                          <span class="text-sm font-medium text-gray-600">Düzeyler</span>
                          <button mat-stroked-button type="button" (click)="addLevel(i)" size="small">
                            <mat-icon class="text-sm">add</mat-icon> Düzey Ekle
                          </button>
                        </div>

                        <div formArrayName="levels" class="space-y-2">
                          @for (level of getLevelsArray(i).controls; track level; let j = $index) {
                            <div [formGroupName]="j" class="flex items-center gap-2">
                              <mat-form-field appearance="outline" class="flex-1">
                                <mat-label>Ad</mat-label>
                                <input matInput formControlName="label" placeholder="Düzey adı">
                              </mat-form-field>
                              <mat-form-field appearance="outline" class="w-24">
                                <mat-label>Puan</mat-label>
                                <input matInput type="number" formControlName="score" min="0" max="100">
                              </mat-form-field>
                              <mat-form-field appearance="outline" class="flex-1">
                                <mat-label>Açıklama</mat-label>
                                <input matInput formControlName="description" placeholder="Düzey açıklaması">
                              </mat-form-field>
                              @if (getLevelsArray(i).length > 1) {
                                <button mat-icon-button type="button" (click)="removeLevel(i, j)" class="!w-7 !h-7">
                                  <mat-icon class="!text-sm !text-red-500">close</mat-icon>
                                </button>
                              }
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </form>
          </div>

          <div class="flex justify-end gap-2 p-4 border-t">
            <button mat-button type="button" (click)="closeEditor()">İptal</button>
            <button mat-raised-button color="primary" [disabled]="editorForm.invalid" (click)="saveRubric()">
              {{ isNewRubric() ? 'Oluştur' : 'Güncelle' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class RubricManagementPage implements OnInit {
  private facade = inject(GradingFacade);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  loading = signal(true);
  error = signal<string | null>(null);
  rubrics = signal<Rubric[]>([]);
  editingRubric = signal<Rubric | null>(null);
  isNewRubric = signal(false);

  readonly QuestionType = QuestionType;
  displayedColumns = ['id', 'name', 'type', 'criteria', 'maxPoints', 'status', 'actions'];

  editorForm = this.fb.group({
    name: ['', Validators.required],
    questionType: [''],
    questionId: [0],
    criteria: this.fb.array([]),
  });

  get criteriaControls() {
    return (this.editorForm.get('criteria') as any).controls as any[];
  }

  ngOnInit() {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.facade.getRubrics().subscribe({
      next: (data) => {
        this.rubrics.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Rubrikler yüklenirken hata oluştu');
        this.loading.set(false);
      }
    });
  }

  openEditor(rubric?: Rubric): void {
    this.isNewRubric.set(!rubric);

    if (rubric) {
      const criteriaArray = this.fb.array(
        rubric.criteria.map(c => this.fb.group({
          name: [c.name, Validators.required],
          description: [c.description],
          maxPoints: [c.maxPoints, [Validators.required, Validators.min(1)]],
          levels: this.fb.array(
            c.levels.map(l => this.fb.group({
              label: [l.label, Validators.required],
              score: [l.score, [Validators.required, Validators.min(0)]],
              description: [l.description],
            }))
          ),
        }))
      );
      this.editorForm = this.fb.group({
        name: [rubric.name, Validators.required],
        questionType: [rubric.questionType ?? ''],
        questionId: [rubric.questionId ?? 0],
        criteria: criteriaArray,
      }) as any;
      this.editingRubric.set(rubric);
    } else {
      this.editorForm = this.fb.group({
        name: ['', Validators.required],
        questionType: [''],
        questionId: [0],
        criteria: this.fb.array([
          this.createCriterionForm(),
        ]),
      }) as any;
      this.editingRubric.set({} as Rubric);
    }
  }

  closeEditor(): void {
    this.editingRubric.set(null);
  }

  addCriterion(): void {
    const criteria = this.editorForm.get('criteria') as any;
    criteria.push(this.createCriterionForm());
  }

  removeCriterion(index: number): void {
    const criteria = this.editorForm.get('criteria') as any;
    criteria.removeAt(index);
  }

  createCriterionForm() {
    return this.fb.group({
      name: ['', Validators.required],
      description: [''],
      maxPoints: [5, [Validators.required, Validators.min(1)]],
      levels: this.fb.array([
        this.fb.group({
          label: ['Mükemmel', Validators.required],
          score: [5, [Validators.required, Validators.min(0)]],
          description: [''],
        }),
        this.fb.group({
          label: ['Yetersiz', Validators.required],
          score: [0, [Validators.required, Validators.min(0)]],
          description: [''],
        }),
      ]),
    });
  }

  getLevelsArray(criterionIndex: number) {
    const criteria = this.editorForm.get('criteria') as any;
    return criteria.at(criterionIndex).get('levels') as any;
  }

  addLevel(criterionIndex: number): void {
    const levels = this.getLevelsArray(criterionIndex);
    levels.push(this.fb.group({
      label: ['', Validators.required],
      score: [0, [Validators.required, Validators.min(0)]],
      description: [''],
    }));
  }

  removeLevel(criterionIndex: number, levelIndex: number): void {
    const levels = this.getLevelsArray(criterionIndex);
    levels.removeAt(levelIndex);
  }

  saveRubric(): void {
    if (this.editorForm.invalid) return;

    const formValue = this.editorForm.value;
    const criteria = (formValue.criteria || []).map((c: any) => ({
      name: c.name,
      description: c.description || '',
      maxPoints: c.maxPoints,
      levels: (c.levels || []).map((l: any) => ({
        label: l.label,
        score: l.score,
        description: l.description || '',
      })),
    }));

    if (this.isNewRubric()) {
      this.facade.createRubric({
        name: formValue.name!,
        questionId: formValue.questionId ?? 0,
        questionType: formValue.questionType || undefined,
        criteria,
      }).subscribe(() => {
        this.loadData();
        this.closeEditor();
      });
    } else {
      const existing = this.editingRubric()!;
      this.facade.updateRubric(existing.id, {
        name: formValue.name!,
        questionId: formValue.questionId ?? 0,
        questionType: formValue.questionType || undefined,
        criteria,
      }).subscribe(() => {
        this.loadData();
        this.closeEditor();
      });
    }
  }

  confirmDelete(rubric: Rubric): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Rubrik Sil',
        message: `"${rubric.name}" rubrikini silmek istediğinize emin misiniz?`,
        confirmLabel: 'Sil',
        cancelLabel: 'İptal',
      },
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.facade.deleteRubric(rubric.id).subscribe(() => this.loadData());
      }
    });
  }

  getMaxPoints(rubric: Rubric): number {
    return rubric.criteria.reduce((sum, c) => sum + c.maxPoints, 0);
  }

  questionTypeLabel(type: string): string {
    switch (type) {
      case QuestionType.MULTIPLE_CHOICE: return 'Çoktan Seçmeli';
      case QuestionType.TRUE_FALSE: return 'Doğru/Yanlış';
      case QuestionType.SHORT_ANSWER: return 'Kısa Cevap';
      case QuestionType.ESSAY: return 'Kompozisyon';
      default: return type;
    }
  }
}