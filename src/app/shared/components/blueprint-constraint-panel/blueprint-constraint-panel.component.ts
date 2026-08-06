import { Component, input, output, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BlueprintConstraint, BlueprintSummary } from '@core/models/exam-blueprint.model';
import { LearningOutcome } from '@core/models/learning-outcome.model';
import { QuestionType, Difficulty } from '@core/models/enums';

function minMaxRangeValidator(c: AbstractControl): Record<string, boolean> | null {
  const min = c.get('minCount')?.value;
  const max = c.get('maxCount')?.value;
  if (min != null && max != null && Number(min) > Number(max)) {
    return { minMaxRange: true };
  }
  return null;
}

function totalPointsLimitValidator(existingTotal: number, maxPoints: number) {
  return (c: AbstractControl): Record<string, boolean> | null => {
    const min = c.get('minCount')?.value ?? 0;
    const ppp = c.get('pointsPerQuestion')?.value ?? 0;
    return existingTotal + min * ppp > maxPoints ? { totalPointsExceeded: true } : null;
  };
}

@Component({
  selector: 'app-blueprint-constraint-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatTooltipModule, MatFormFieldModule, MatSelectModule, MatInputModule],
  template: `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="font-semibold text-gray-900">Kısıtlamalar</h4>
        <button mat-stroked-button size="small" (click)="showForm.set(!showForm())">
          <mat-icon class="text-sm">{{ showForm() ? 'close' : 'add' }}</mat-icon>
          {{ showForm() ? 'İptal' : 'Kısıtlama Ekle' }}
        </button>
      </div>

      @if (showForm()) {
        <form [formGroup]="constraintForm" (ngSubmit)="addConstraint()">
        <div class="border rounded-lg p-4 space-y-3 bg-gray-50">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Kazanım</mat-label>
              <mat-select formControlName="outcomeId">
                @for (o of outcomes(); track o.id) {
                  <mat-option [value]="o.id">{{ o.code }} - {{ o.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Soru Tipi</mat-label>
              <mat-select formControlName="questionType">
                <mat-option [value]="QuestionType.MULTIPLE_CHOICE">Çoktan Seçmeli</mat-option>
                <mat-option [value]="QuestionType.TRUE_FALSE">Doğru/Yanlış</mat-option>
                <mat-option [value]="QuestionType.SHORT_ANSWER">Kısa Cevap</mat-option>
                <mat-option [value]="QuestionType.ESSAY">Kompozisyon</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Zorluk</mat-label>
              <mat-select formControlName="difficulty">
                <mat-option [value]="Difficulty.EASY">Kolay</mat-option>
                <mat-option [value]="Difficulty.MEDIUM">Orta</mat-option>
                <mat-option [value]="Difficulty.HARD">Zor</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <mat-form-field appearance="outline">
              <mat-label>Minimum Soru</mat-label>
              <input matInput type="number" formControlName="minCount" min="0" max="100">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Maksimum Soru</mat-label>
              <input matInput type="number" formControlName="maxCount" min="0" max="100">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Soru Başı Puan</mat-label>
              <input matInput type="number" formControlName="pointsPerQuestion" min="1" max="100">
            </mat-form-field>
          </div>
          @if (constraintForm.errors?.['minMaxRange']) {
            <p class="text-sm text-red-600">Minimum, maksimumdan büyük olamaz.</p>
          }
          @if (constraintForm.errors?.['totalPointsExceeded']) {
            <p class="text-sm text-red-600">Toplam puan 100'ü aşamaz. Mevcut: {{ computedTotalPoints() }}p</p>
          }
          <button mat-raised-button color="primary" size="small" type="submit" [disabled]="constraintForm.invalid">
            <mat-icon class="text-sm">add</mat-icon> Ekle
          </button>
        </div>
        </form>
      }

      @if (constraints().length === 0) {
        <div class="text-center p-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
          Henüz kısıtlama eklenmedi. "Kısıtlama Ekle" butonu ile başlayın.
        </div>
      }

      @if (constraints().length > 0) {
        <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b text-left text-gray-500 text-xs">
              <th class="pb-2 pr-3 w-44">Kazanım</th>
              <th class="pb-2 pr-3">Tip</th>
              <th class="pb-2 pr-3">Zorluk</th>
              <th class="pb-2 pr-3">Sayı / Puan</th>
              <th class="pb-2 pr-3">Kapsama</th>
              <th class="pb-2 pr-3 w-8">Durum</th>
              <th class="pb-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
          @for (row of rows(); track row.key) {
            <tr class="border-b border-gray-100">
              <td class="py-2 pr-3">
                <span class="font-medium text-gray-900 truncate block max-w-[180px]" [title]="row.outcomeName">{{ row.outcomeName }}</span>
              </td>
              <td class="py-2 pr-3">
                <span class="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 whitespace-nowrap">{{ row.typeLabel }}</span>
              </td>
              <td class="py-2 pr-3">
                <span class="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap" [class]="row.difficultyClass">{{ row.difficultyLabel }}</span>
              </td>
              <td class="py-2 pr-3 text-xs text-gray-500 whitespace-nowrap min-w-[100px]">{{ row.min }}-{{ row.max }}, {{ row.points }}p</td>
              <td class="py-2 pr-3">
                <div class="flex items-center gap-2">
                  <div class="flex-1 min-w-[60px] h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-300"
                      [class.bg-green-500]="row.met"
                      [class.bg-red-500]="!row.met"
                      [style.width.%]="row.barWidth">
                    </div>
                  </div>
                  <span class="text-xs text-gray-600 whitespace-nowrap">{{ row.selected }}/{{ row.max }}</span>
                </div>
              </td>
              <td class="py-2 pr-1 text-center align-middle">
                <button mat-icon-button disabled class="!w-8 !h-8 !p-0">
                @if (row.met) {
                  <mat-icon class="!text-green-500">check_circle</mat-icon>
                } @else {
                  <mat-icon class="!text-red-500">cancel</mat-icon>
                }
                </button>
              </td>
              <td class="py-2 text-center align-middle">
                <button mat-icon-button (click)="removeConstraint($index)" matTooltip="Kısıtlamayı kaldır" class="!w-8 !h-8 !p-0">
                  <mat-icon class="!text-red-500">delete</mat-icon>
                </button>
              </td>
            </tr>
          }
          </tbody>
        </table>
        </div>
      }
    </div>
  `
})
export class BlueprintConstraintPanelComponent {
  constraints = input.required<BlueprintConstraint[]>();
  coverage = input.required<BlueprintSummary['coverage']>();
  outcomes = input<LearningOutcome[]>([]);

  constraintsChange = output<BlueprintConstraint[]>();

  readonly QuestionType = QuestionType;
  readonly Difficulty = Difficulty;

  private fb = inject(FormBuilder);

  showForm = signal(false);

  constraintForm = this.fb.group({
    outcomeId: [null as number | null, Validators.required],
    questionType: [QuestionType.MULTIPLE_CHOICE, Validators.required],
    difficulty: [Difficulty.MEDIUM, Validators.required],
    minCount: [1, [Validators.required, Validators.min(0), Validators.max(100)]],
    maxCount: [2, [Validators.required, Validators.min(0), Validators.max(100)]],
    pointsPerQuestion: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
  }, { validators: minMaxRangeValidator });

  computedTotalPoints = computed(() =>
    this.constraints().reduce((sum, c) => sum + c.minCount * c.pointsPerQuestion, 0)
  );

  constructor() {
    effect(() => {
      const currentTotal = this.computedTotalPoints();
      this.constraintForm.setValidators([
        minMaxRangeValidator,
        totalPointsLimitValidator(currentTotal, 100),
      ]);
      this.constraintForm.updateValueAndValidity();
    });
  }

  rows = computed(() => {
    return this.constraints().map(c => {
      const cov = this.coverage().find(cv => cv.outcomeId === c.outcomeId);
      const outcome = this.outcomes().find(o => o.id === c.outcomeId);
      const selected = cov?.selected ?? 0;
      const required = cov?.required ?? c.minCount;
      const met = selected >= required;
      const maxBar = Math.max(c.maxCount, 1);
      return {
        key: `${c.outcomeId}-${c.questionType}-${c.difficulty}-${c.minCount}-${c.maxCount}`,
        outcomeName: outcome?.name ?? `Kazanım #${c.outcomeId}`,
        typeLabel: this.typeLabel(c.questionType),
        difficultyLabel: this.difficultyLabel(c.difficulty),
        difficultyClass: this.difficultyClass(c.difficulty),
        selected,
        required,
        max: c.maxCount,
        min: c.minCount,
        points: c.pointsPerQuestion,
        barWidth: Math.min(100, Math.round((selected / maxBar) * 100)),
        met,
      };
    });
  });

  addConstraint(): void {
    if (this.constraintForm.invalid) return;
    const v = this.constraintForm.value;
    const newConstraint: BlueprintConstraint = {
      outcomeId: v.outcomeId!,
      questionType: v.questionType!,
      difficulty: v.difficulty!,
      minCount: v.minCount!,
      maxCount: v.maxCount!,
      pointsPerQuestion: v.pointsPerQuestion!,
    };
    const updated = [...this.constraints(), newConstraint];
    this.constraintsChange.emit(updated);
    this.showForm.set(false);
    this.constraintForm.reset({
      outcomeId: null,
      questionType: QuestionType.MULTIPLE_CHOICE,
      difficulty: Difficulty.MEDIUM,
      minCount: 1,
      maxCount: 2,
      pointsPerQuestion: 10,
    });
  }

  removeConstraint(index: number): void {
    const updated = this.constraints().filter((_, i) => i !== index);
    this.constraintsChange.emit(updated);
  }

  private typeLabel(t: QuestionType): string {
    switch (t) {
      case QuestionType.MULTIPLE_CHOICE: return 'Çoktan Seçmeli';
      case QuestionType.TRUE_FALSE: return 'Doğru/Yanlış';
      case QuestionType.SHORT_ANSWER: return 'Kısa Cevap';
      case QuestionType.ESSAY: return 'Kompozisyon';
      default: return t;
    }
  }

  private difficultyLabel(d: Difficulty): string {
    switch (d) {
      case Difficulty.EASY: return 'Kolay';
      case Difficulty.MEDIUM: return 'Orta';
      case Difficulty.HARD: return 'Zor';
      default: return d;
    }
  }

  private difficultyClass(d: Difficulty): string {
    switch (d) {
      case Difficulty.EASY: return 'bg-green-100 text-green-700';
      case Difficulty.MEDIUM: return 'bg-yellow-100 text-yellow-700';
      case Difficulty.HARD: return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }
}
