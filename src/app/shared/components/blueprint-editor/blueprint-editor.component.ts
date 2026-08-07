import { Component,  inject,  signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Exam } from '@core/models/exam.model';

export interface BlueprintEditorData {
  exams: Exam[];
  preselectedExamId?: number;
  examNames?: Record<number, string>;
  blueprint?: { id: number; name: string; examId: number };
}

@Component({
  selector: 'app-blueprint-editor',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title class="text-xl font-semibold text-gray-900">{{ isEdit ? 'Blueprint Düzenle' : 'Yeni Blueprint' }}</h2>

    <mat-dialog-content class="!pt-3 !px-6">
      <div class="flex flex-col gap-4 min-w-[400px]">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Blueprint Adı</mat-label>
          <input matInput [value]="name()" (input)="name.set($any($event.target).value)" placeholder="Blueprint adı girin" autofocus />
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Sınav</mat-label>
          <mat-select [value]="selectedExamId()" (selectionChange)="selectedExamId.set($event.value)" [disabled]="isEdit">
            @for (exam of exams; track exam.id) {
              <mat-option [value]="exam.id">
                {{ getExamName(exam) }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        <p class="text-xs text-gray-500">
          {{ isEdit ? 'Blueprint adını değiştirebilirsiniz.' : 'Blueprint oluşturduktan sonra kazanım, zorluk ve soru tipi kısıtlamalarını ekleyip otomatik soru seçimi yapabilirsiniz.' }}
        </p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="!px-6 !pb-4">
      <button mat-button type="button" (click)="onCancel()">İptal</button>
      <button mat-raised-button color="primary" [disabled]="!name() || !selectedExamId()" (click)="onSave()">
        {{ isEdit ? 'Güncelle' : 'Oluştur' }}
      </button>
    </mat-dialog-actions>
  `
})
export class BlueprintEditorComponent {
  private dialogRef = inject(MatDialogRef<BlueprintEditorComponent>);
  private data = inject<BlueprintEditorData>(MAT_DIALOG_DATA);

  name = signal('');
  selectedExamId = signal<number | null>(null);
  isEdit = false;
  private editBlueprintId: number | null = null;

  get exams(): Exam[] {
    return this.data?.exams || [];
  }

  constructor() {
    if (this.data?.blueprint) {
      this.isEdit = true;
      this.editBlueprintId = this.data.blueprint.id;
      this.name.set(this.data.blueprint.name);
      this.selectedExamId.set(this.data.blueprint.examId);
    } else if (this.data?.preselectedExamId) {
      this.selectedExamId.set(this.data.preselectedExamId);
    }
  }

  getExamName(exam: Exam): string {
    return exam.title;
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSave(): void {
    if (!this.name() || !this.selectedExamId()) return;
    this.dialogRef.close({ name: this.name(), examId: this.selectedExamId()!, id: this.editBlueprintId });
  }
}
