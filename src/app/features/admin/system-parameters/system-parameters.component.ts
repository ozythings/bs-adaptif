import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface SystemParameter {
  key: string;
  label: string;
  type: 'number' | 'boolean';
  defaultValue: number | boolean;
  category: string;
}

interface ParameterState {
  value: number | boolean;
  dirty: boolean;
}

const PARAMETERS: SystemParameter[] = [
  { key: 'exam.passing_score', label: 'Geçme Notu', type: 'number', defaultValue: 60, category: 'Sınav' },
  { key: 'exam.max_attempts', label: 'Maksimum Deneme', type: 'number', defaultValue: 3, category: 'Sınav' },
  { key: 'exam.session_timeout_minutes', label: 'Oturum Süresi (dk)', type: 'number', defaultValue: 120, category: 'Sınav' },
  { key: 'grading.auto_score_mcq', label: 'Çoktan Seçmeli Otomatik Puanlama', type: 'boolean', defaultValue: true, category: 'Notlandırma' },
  { key: 'cohort.min_students', label: 'Minimum Öğrenci Sayısı', type: 'number', defaultValue: 5, category: 'Kohort' },
  { key: 'recommendation.weak_threshold', label: 'Zayıf Eşik Değeri', type: 'number', defaultValue: 0.4, category: 'Öneri' },
];

function buildInitialState(): Record<string, ParameterState> {
  const state: Record<string, ParameterState> = {};
  for (const p of PARAMETERS) {
    state[p.key] = { value: p.defaultValue, dirty: false };
  }
  return state;
}

@Component({
  selector: 'app-system-parameters',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatButtonModule, MatIconModule],
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-bold text-gray-900">Sistem Parametreleri</h1>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        @for (cat of categories; track cat) {
          <mat-card>
            <mat-card-header>
              <mat-card-title>{{ cat }}</mat-card-title>
            </mat-card-header>
            <mat-card-content class="pt-4 space-y-4">
              @for (param of paramsByCategory(cat); track param.key) {
                <div class="flex flex-col gap-2 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                  <label class="text-sm font-medium text-gray-700">{{ param.label }}</label>
                  <div class="flex items-center gap-3">
                    @if (param.type === 'boolean') {
                      <mat-slide-toggle
                        [ngModel]="$any(paramState()[param.key]?.value)"
                        (ngModelChange)="updateParam(param.key, $event)">
                      </mat-slide-toggle>
                      <span class="text-sm text-gray-500">{{ paramState()[param.key]?.value ? 'Etkin' : 'Devre Dışı' }}</span>
                    } @else {
                      <mat-form-field appearance="outline" class="w-32">
                        <input matInput type="number"
                          [ngModel]="paramState()[param.key]?.value"
                          (ngModelChange)="updateParam(param.key, $event)">
                      </mat-form-field>
                    }
                    <button mat-icon-button color="warn"
                      [disabled]="!paramState()[param.key]?.dirty"
                      (click)="resetParam(param.key)"
                      title="Sıfırla"
                      class="shrink-0">
                      <mat-icon>restart_alt</mat-icon>
                    </button>
                  </div>
                  @if (paramState()[param.key]?.dirty) {
                    <span class="text-xs text-amber-600">Değiştirildi · Varsayılan: {{ param.defaultValue }}</span>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>
        }
      </div>

      <mat-card class="p-4">
        <div class="flex items-center gap-3">
          <button mat-raised-button color="primary" [disabled]="!hasDirty()" (click)="saveAll()">
            <mat-icon>save</mat-icon> Kaydet
          </button>
          <button mat-stroked-button [disabled]="!hasDirty()" (click)="resetAll()">
            <mat-icon>undo</mat-icon> Tümünü Sıfırla
          </button>
          @if (saved()) {
            <span class="text-sm text-green-600">
              <mat-icon class="text-sm align-middle">check_circle</mat-icon> Kaydedildi
            </span>
          }
        </div>
      </mat-card>
    </div>
  `
})
export class SystemParametersComponent {
  categories = ['Sınav', 'Notlandırma', 'Kohort', 'Öneri'];
  parameters = PARAMETERS;

  paramState = signal<Record<string, ParameterState>>(buildInitialState());
  saved = signal(false);

  hasDirty = (): boolean =>
    Object.values(this.paramState()).some(s => s.dirty);

  paramsByCategory(cat: string): SystemParameter[] {
    return this.parameters.filter(p => p.category === cat);
  }

  updateParam(key: string, value: number | boolean): void {
    this.paramState.update(state => ({
      ...state,
      [key]: { value, dirty: !this.isDefault(key, value) },
    }));
    this.saved.set(false);
  }

  resetParam(key: string): void {
    const def = this.parameters.find(p => p.key === key);
    if (!def) return;
    this.paramState.update(state => ({
      ...state,
      [key]: { value: def.defaultValue, dirty: false },
    }));
    this.saved.set(false);
  }

  saveAll(): void {
    this.paramState.update(state => {
      const next = { ...state };
      for (const key of Object.keys(next)) {
        next[key] = { ...next[key], dirty: false };
      }
      return next;
    });
    this.saved.set(true);
  }

  resetAll(): void {
    this.paramState.set(buildInitialState());
    this.saved.set(false);
  }

  private isDefault(key: string, value: number | boolean): boolean {
    const param = this.parameters.find(p => p.key === key);
    return param ? param.defaultValue === value : false;
  }
}
