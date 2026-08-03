import { Component,  inject,  input,  output,  effect } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { QuestionSummary } from '@core/models/question-version.model';
import { QuestionType, Difficulty, QuestionVersionStatus } from '@core/models/enums';
import { LearningOutcome } from '@core/models/learning-outcome.model';

export interface QuestionFormValue {
  stem: string;
  type: QuestionType;
  options: { key: string; value: string; isCorrect: boolean }[];
  correctAnswer: string;
  solution: string;
  difficulty: Difficulty;
  points: number;
  outcomeIds: number[];
  tags: string[];
  changeNote: string;
}

@Component({
  selector: 'app-question-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatRadioModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title class="text-xl font-semibold text-gray-900">
      {{ dialogTitle }}
    </h2>

    <mat-dialog-content class="!pt-3 !px-6">
      <form [formGroup]="form" class="flex flex-col gap-4 min-w-[480px] max-w-full">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Soru Kökü</mat-label>
          <textarea matInput formControlName="stem" rows="3" placeholder="Soru metnini girin"></textarea>
          @if (form.get('stem')?.hasError('required')) {
            <mat-error>Bu alan zorunludur</mat-error>
          }
        </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
          <mat-label>Soru Tipi</mat-label>
          <mat-select formControlName="type" (selectionChange)="onTypeChange($event.value)">
            <mat-option [value]="QuestionType.MULTIPLE_CHOICE">Çoktan Seçmeli</mat-option>
            <mat-option [value]="QuestionType.TRUE_FALSE">Doğru/Yanlış</mat-option>
            <mat-option [value]="QuestionType.SHORT_ANSWER">Kısa Cevap</mat-option>
            <mat-option [value]="QuestionType.ESSAY">Kompozisyon</mat-option>
          </mat-select>
        </mat-form-field>

        @if (form.get('type')?.value === QuestionType.MULTIPLE_CHOICE) {
          <fieldset class="border border-gray-200 rounded-lg p-4 space-y-3">
            <legend class="text-sm font-medium text-gray-700 px-1">Seçenekler</legend>
            <div class="flex flex-col gap-3 w-full">
              @for (opt of optionsArray.controls; track opt; let i = $index) {
                <div class="flex items-center gap-2">
                  <input type="radio"
                         [value]="opt.get('key')?.value"
                         [formControl]="correctAnswerCtrl"
                         class="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                  <mat-form-field appearance="outline" class="flex-1">
                    <mat-label>Seçenek {{ opt.get('key')?.value }}</mat-label>
                    <input matInput [formControl]="$any(opt.get('value'))" placeholder="Seçenek değeri">
                    @if (opt.get('value')?.hasError('required')) {
                      <mat-error>Bu alan zorunludur</mat-error>
                    }
                  </mat-form-field>
                  @if (optionsArray.length > 2) {
                    <button mat-icon-button type="button" (click)="removeOption(i)" class="text-red-400">
                      <mat-icon>delete</mat-icon>
                    </button>
                  }
                </div>
              }
            </div>
            @if (form.get('correctAnswer')?.hasError('required')) {
              <mat-error class="text-xs text-red-600 mt-1">Lütfen doğru cevabı seçin</mat-error>
            }
            <button mat-stroked-button type="button" (click)="addOption()">
              <mat-icon>add</mat-icon> Seçenek Ekle
            </button>
          </fieldset>
        }

        @if (form.get('type')?.value === QuestionType.TRUE_FALSE) {
          <div class="px-3">
            <mat-radioGroup [formControl]="correctAnswerCtrl" class="flex gap-4">
              <mat-radio-button [value]="'true'">Doğru</mat-radio-button>
              <mat-radio-button [value]="'false'">Yanlış</mat-radio-button>
            </mat-radioGroup>
          </div>
        }

        @if (form.get('type')?.value === QuestionType.SHORT_ANSWER) {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Doğru Cevap</mat-label>
            <input matInput [formControl]="correctAnswerCtrl" placeholder="Doğru cevabı girin">
            @if (form.get('correctAnswer')?.hasError('required')) {
              <mat-error>Bu alan zorunludur</mat-error>
            }
          </mat-form-field>
        }

        @if (form.get('type')?.value === QuestionType.ESSAY) {
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <p>Kompozisyon soruları manuel değerlendirilir. Doğru cevap alanı gerekmez.</p>
          </div>
        }

        <div class="grid grid-cols-2 gap-4">
          <mat-form-field appearance="outline">
            <mat-label>Zorluk</mat-label>
            <mat-select formControlName="difficulty">
              <mat-option [value]="Difficulty.EASY">Kolay</mat-option>
              <mat-option [value]="Difficulty.MEDIUM">Orta</mat-option>
              <mat-option [value]="Difficulty.HARD">Zor</mat-option>
            </mat-select>
            @if (form.get('difficulty')?.hasError('required')) {
              <mat-error>Bu alan zorunludur</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Puan</mat-label>
            <input matInput type="number" formControlName="points" placeholder="10">
            @if (form.get('points')?.hasError('required')) {
              <mat-error>Bu alan zorunludur</mat-error>
            }
            @if (form.get('points')?.hasError('min')) {
              <mat-error>En az 0 olmalıdır</mat-error>
            }
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Kazanımlar</mat-label>
          <mat-select formControlName="outcomeIds" multiple>
            @for (outcome of outcomes; track outcome.id) {
              <mat-option [value]="outcome.id">{{ outcome.code }} - {{ outcome.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Etiketler (virgülle ayırın)</mat-label>
          <input matInput formControlName="tagsInput" placeholder="etiket1, etiket2, etiket3">
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Çözüm</mat-label>
          <textarea matInput formControlName="solution" rows="3" placeholder="Sorunun çözümünü veya açıklamasını girin"></textarea>
        </mat-form-field>

        @if (dialogData?.question) {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Değişiklik Notu</mat-label>
            <input matInput formControlName="changeNote" placeholder="Bu değişikliğin açıklaması">
          </mat-form-field>
        }
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="!px-6 !pb-4">
      @if (dialogRef) {
        <button mat-button type="button" (click)="dialogRef.close()">İptal</button>
      }
      <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="onSubmit()">
        {{ dialogData?.question ? 'Güncelle' : 'Oluştur' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class QuestionEditorComponent {
  private fb = inject(FormBuilder);
  dialogRef = inject(MatDialogRef<QuestionEditorComponent>, { optional: true });
  dialogData = inject<{ question?: Partial<QuestionSummary>; type?: QuestionType; outcomes?: LearningOutcome[] }>(MAT_DIALOG_DATA, { optional: true });

  question = input<Partial<QuestionSummary>>({});
  type = input<QuestionType>(QuestionType.MULTIPLE_CHOICE);
  save = output<QuestionFormValue>();

  readonly QuestionType = QuestionType;
  readonly Difficulty = Difficulty;
  readonly outcomes = this.dialogData?.outcomes || [];

  get dialogTitle(): string {
    const q = this.dialogData?.question;
    if (!q) return 'Yeni Soru';
    if (q.status === QuestionVersionStatus.PUBLISHED) return 'Yeni Versiyon Oluştur';
    return 'Soruyu Düzenle';
  }

  private initialData = this.dialogData || { question: this.question(), type: this.type() };

  private createOption(key: string, value = ''): FormGroup {
    return this.fb.group({
      key: [key],
      value: [value, Validators.required],
    });
  }

  get optionsArray(): FormArray {
    return this.form.get('options') as FormArray;
  }

  form = this.fb.group({
    stem: [this.initialData.question?.stem || '', Validators.required],
    type: [this.initialData.type || this.initialData.question?.type || QuestionType.MULTIPLE_CHOICE, Validators.required],
    options: this.fb.array([this.createOption('A'), this.createOption('B')]),
    correctAnswer: ['', [Validators.required, Validators.minLength(1)]],
    solution: [(this.initialData.question as any)?.solution || ''],
    difficulty: [this.initialData.question?.difficulty || Difficulty.MEDIUM, Validators.required],
    points: [this.initialData.question?.points || 10, [Validators.required, Validators.min(0)]],
    outcomeIds: [this.initialData.question?.outcomeIds || []],
    tagsInput: [(this.initialData.question?.tags || []).join(', ')],
    changeNote: ['Yeni versiyon'],
  });

  constructor() {
    effect(() => {
      const q = this.question();
      const t = this.type();
      if (q && !this.dialogData) {
        this.form.patchValue({
          stem: q.stem || '',
          type: t,
          difficulty: q.difficulty || Difficulty.MEDIUM,
          points: q.points || 10,
          outcomeIds: q.outcomeIds || [],
          tagsInput: (q.tags || []).join(', '),
        });
      }
    }, { allowSignalWrites: true });
  }

  get correctAnswerCtrl(): FormControl<string> {
    return this.form.get('correctAnswer') as FormControl<string>;
  }

  addOption(): void {
    const nextKey = String.fromCharCode(65 + this.optionsArray.length);
    this.optionsArray.push(this.createOption(nextKey));
  }

  removeOption(index: number): void {
    if (this.optionsArray.length <= 2) return;
    this.optionsArray.removeAt(index);
    this.optionsArray.controls.forEach((ctrl, i) => {
      ctrl.get('key')?.setValue(String.fromCharCode(65 + i));
    });
  }

  onTypeChange(type: QuestionType): void {
    const correctAnswer = this.form.get('correctAnswer');
    const isEssay = type === QuestionType.ESSAY;

    if (type === QuestionType.TRUE_FALSE) {
      correctAnswer?.setValue('true');
    } else if (isEssay) {
      correctAnswer?.clearValidators();
      correctAnswer?.setValue('');
    } else if (type === QuestionType.SHORT_ANSWER) {
      correctAnswer?.setValue('');
    } else {
      correctAnswer?.setValue('');
    }

    const isMC = type === QuestionType.MULTIPLE_CHOICE;
    for (const ctrl of this.optionsArray.controls) {
      const valueCtrl = ctrl.get('value');
      if (isMC) {
        valueCtrl?.setValidators(Validators.required);
      } else {
        valueCtrl?.clearValidators();
      }
      valueCtrl?.updateValueAndValidity();
    }

    correctAnswer?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const val = raw as { [key: string]: unknown };
    const type = val['type'] as QuestionType;

    let options: { key: string; value: string; isCorrect: boolean }[] = [];
    let correctAnswer = '';

    if (type === QuestionType.MULTIPLE_CHOICE) {
      options = this.optionsArray.controls.map(ctrl => ({
        key: ctrl.get('key')?.value as string,
        value: (ctrl.get('value')?.value as string) || '',
        isCorrect: (ctrl.get('key')?.value as string) === val['correctAnswer'],
      }));
      correctAnswer = options.find(o => o.isCorrect)?.value || '';
    } else if (type === QuestionType.TRUE_FALSE) {
      correctAnswer = val['correctAnswer'] === 'true' ? 'Doğru' : 'Yanlış';
    } else if (type === QuestionType.ESSAY) {
      correctAnswer = '';
    } else {
      correctAnswer = (val['correctAnswer'] as string) || '';
    }

    const tags = ((val['tagsInput'] as string) || '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const formValue: QuestionFormValue = {
      stem: (val['stem'] as string) || '',
      type,
      options,
      correctAnswer,
      solution: (val['solution'] as string) || '',
      difficulty: val['difficulty'] as Difficulty,
      points: (val['points'] as number) || 0,
      outcomeIds: (val['outcomeIds'] as number[]) || [],
      tags,
      changeNote: (val['changeNote'] as string) || '',
    };

    if (this.dialogRef) {
      this.dialogRef.close(formValue);
    } else {
      this.save.emit(formValue);
    }
  }
}
