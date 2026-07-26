import { Component,  input,  output,  signal,  computed,  inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { Rubric, RubricScore, GradingResult } from '@core/models/rubric.model';
import { QuestionResponse } from '@core/models/attempt.model';

@Component({
  selector: 'app-rubric-grader',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatRadioModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatDividerModule],
  template: `
    <div class="border rounded-lg p-4 space-y-4 bg-gray-50">
      <div>
        <p class="text-sm text-gray-500 mb-1">Öğrenci Cevabı</p>
        <p class="text-gray-900 font-medium">{{ responses()[0]?.answer ?? 'Cevap verilmemiş' }}</p>
      </div>

      <mat-divider></mat-divider>

      @for (criterion of rubric().criteria; track criterion.id) {
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-medium text-gray-800">{{ criterion.name }}</span>
            <span class="text-sm text-gray-500">Maks: {{ criterion.maxPoints }} puan</span>
          </div>
          <p class="text-sm text-gray-500">{{ criterion.description }}</p>

          <mat-radio-group
            [value]="selectedLevelIndices()[criterion.id] ?? -1"
            (change)="selectLevel(criterion.id, $event.value)"
            class="flex flex-col gap-2">
            @for (level of criterion.levels; track level; let i = $index) {
              <mat-radio-button [value]="i" class="p-2 rounded hover:bg-white">
                <div class="flex items-center justify-between w-full">
                  <div>
                    <span class="font-medium">{{ level.label }}</span>
                    <p class="text-sm text-gray-500">{{ level.description }}</p>
                  </div>
                  <span class="text-sm font-semibold text-indigo-600 ml-4">{{ level.score }} puan</span>
                </div>
              </mat-radio-button>
            }
          </mat-radio-group>
        </div>

        @if (!$last) {
          <mat-divider></mat-divider>
        }
      }

      <form [formGroup]="gradeForm">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Değerlendirme Notu</mat-label>
          <textarea matInput formControlName="comment" rows="3" placeholder="Değerlendirme notunuz..."></textarea>
        </mat-form-field>

        <div class="flex items-center justify-between p-3 bg-white rounded-lg">
          <span class="text-lg font-bold text-gray-900">Toplam Puan: {{ totalScore() }} / {{ maxScore() }}</span>
        </div>

        @if (showChangeReason()) {
          <div class="border border-amber-300 rounded-lg p-3 bg-amber-50">
            <p class="text-sm text-amber-700 mb-2">Otomatik puan ({{ autoScore() }}) ile manuel puan ({{ totalScore() }}) farklıdır. Değişiklik sebebi gereklidir.</p>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Değişiklik Sebebi *</mat-label>
              <textarea matInput formControlName="changeReason" rows="2" placeholder="Puan değişiklik sebebini açıklayın..."></textarea>
            </mat-form-field>
          </div>
        }
      </form>

      <button
        mat-raised-button
        color="primary"
        class="w-full"
        [disabled]="!canSubmit()"
        (click)="submitGrade()">
        Kaydet
      </button>
    </div>
  `
})
export class RubricGraderComponent {
  attemptId = input.required<number>();
  rubric = input.required<Rubric>();
  responses = input.required<QuestionResponse[]>();

  gradeSubmit = output<GradingResult>();

  private fb = inject(FormBuilder);

  selectedLevelIndices = signal<Record<number, number>>({});

  gradeForm = this.fb.group({
    comment: [''],
    changeReason: [''],
  });

  autoScore = computed(() => this.responses()[0]?.autoScore ?? 0);

  maxScore = computed(() => this.rubric().criteria.reduce((sum, c) => sum + c.maxPoints, 0));

  totalScore = computed(() => {
    const indices = this.selectedLevelIndices();
    let total = 0;
    for (const criterion of this.rubric().criteria) {
      const idx = indices[criterion.id];
      if (idx !== undefined && idx >= 0 && idx < criterion.levels.length) {
        total += criterion.levels[idx].score;
      }
    }
    return total;
  });

  showChangeReason = computed(() => {
    return this.totalScore() !== this.autoScore();
  });

  canSubmit = computed(() => {
    const indices = this.selectedLevelIndices();
    const allSelected = this.rubric().criteria.every(c => indices[c.id] !== undefined && indices[c.id] >= 0);
    if (!allSelected) return false;
    if (this.showChangeReason() && !this.gradeForm.get('changeReason')?.value?.trim()) return false;
    return true;
  });

  selectLevel(criterionId: number, levelIdx: number): void {
    this.selectedLevelIndices.update(v => ({ ...v, [criterionId]: levelIdx }));
  }

  submitGrade(): void {
    if (!this.canSubmit()) return;

    const indices = this.selectedLevelIndices();
    const scores: RubricScore[] = this.rubric().criteria.map(c => {
      const idx = indices[c.id];
      const score = idx >= 0 && idx < c.levels.length ? c.levels[idx].score : 0;
      return { criterionId: c.id, score, comment: '' };
    });

    const fv = this.gradeForm.value;
    const result: GradingResult = {
      attemptId: this.attemptId(),
      questionId: this.responses()[0]?.questionId ?? 0,
      scores,
      totalScore: this.totalScore(),
      comment: fv.comment || '',
      gradedBy: 0,
      gradedAt: new Date().toISOString(),
      previousScore: this.autoScore(),
      changeReason: fv.changeReason || undefined,
    };

    this.gradeSubmit.emit(result);
  }
}
