import { Component,  inject,  signal,  computed,  OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { OutcomesFacade } from './data-access/outcomes.facade';
import { OutcomeGraphComponent } from '@shared/components/outcome-graph/outcome-graph.component';
import { ErrorStateComponent } from '@shared/components';
import { LearningOutcome } from '@core/models/learning-outcome.model';
import { RouterLink } from '@angular/router';
import { DebounceDirective } from '@shared/directives';
import { StatusTextPipe } from '@shared/pipes';
import { OutcomeLevel } from '@core/models/enums';

@Component({
  selector: 'app-outcome-map',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatSlideToggleModule, OutcomeGraphComponent, ErrorStateComponent, DebounceDirective, StatusTextPipe],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Kazanım Grafiği</h1>
        <a mat-stroked-button routerLink="/outcomes"><mat-icon>list</mat-icon> Liste</a>
      </div>

      <div class="bg-white rounded-lg shadow-sm p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Ders</mat-label>
          <mat-select [value]="selectedCourseId()" (selectionChange)="onCourseChange($event.value)">
            @for (c of facade.courses; track c.id) {
              <mat-option [value]="c.id">{{ c.title }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Ara</mat-label>
          <input matInput [value]="searchTerm()" [appDebounce]="300" (debouncedChange)="searchTerm.set($event)" placeholder="Kazanım ara...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Seviye</mat-label>
          <mat-select [value]="levelFilter()" (selectionChange)="levelFilter.set($event.value)">
            <mat-option [value]="null">Tümü</mat-option>
            @for (lvl of levelOptions; track lvl.value) {
              <mat-option [value]="lvl.value">{{ lvl.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <div class="flex items-center justify-start lg:justify-end gap-2">
          <mat-slide-toggle [checked]="focusMode()" (change)="focusMode.set($event.checked)" color="primary">
            Odak Modu
          </mat-slide-toggle>
          @if (filteredOutcomes().length > 0) {
            <span class="text-xs text-gray-500">{{ filteredOutcomes().length }} kazanım</span>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-8"><mat-spinner diameter="32" /></div>
      } @else if (error()) {
        <app-error-state [title]="'Kazanımlar yüklenemedi'" [message]="error()!" (retry)="loadOutcomes()" />
      } @else if (filteredOutcomes().length > 0) {
        <app-outcome-graph
          [outcomes]="filteredOutcomes()"
          [selectedId]="selectedNodeId()"
          [focusNodeId]="focusMode() ? selectedNodeId() : null"
          (nodeSelect)="onNodeSelect($event)" />
      } @else {
        <div class="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
          Bu filtreye uygun kazanım bulunmuyor
        </div>
      }

      @if (selectedNode(); as node) {
        <div class="bg-white rounded-lg shadow-sm p-4">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">{{ node.code }} - {{ node.name }}</h3>
            @if (focusMode()) {
              <button mat-stroked-button color="primary" size="small" (click)="focusMode.set(false)">
                <mat-icon class="text-sm">fullscreen_exit</mat-icon> Odaktan Çık
              </button>
            }
          </div>
          <p class="text-sm text-gray-600 mt-1">{{ node.description }}</p>
          <p class="text-xs text-gray-400 mt-1">Seviye: {{ node.level | statusText }} | Önkoşul: {{ getPrereqNames(node).join(', ') || 'Yok' }}</p>
        </div>
      }
    </div>
  `
})
export class OutcomeMapPage implements OnInit {
  protected facade = inject(OutcomesFacade);

  selectedCourseId = signal(1);
  selectedNodeId = signal<number | null>(null);
  focusMode = signal(false);
  searchTerm = signal('');
  levelFilter = signal<OutcomeLevel | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  levelOptions = [
    { value: OutcomeLevel.REMEMBER, label: 'Hatırlama' },
    { value: OutcomeLevel.UNDERSTAND, label: 'Anlama' },
    { value: OutcomeLevel.APPLY, label: 'Uygulama' },
    { value: OutcomeLevel.ANALYZE, label: 'Çözümleme' },
    { value: OutcomeLevel.EVALUATE, label: 'Değerlendirme' },
    { value: OutcomeLevel.CREATE, label: 'Oluşturma' },
  ];

  private rawOutcomes = signal<LearningOutcome[]>([]);

  filteredOutcomes = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const level = this.levelFilter();
    return this.rawOutcomes().filter(o =>
      (!search || o.name.toLowerCase().includes(search) || o.code.toLowerCase().includes(search)) &&
      (!level || o.level === level)
    );
  });

  ngOnInit() {
    this.loadOutcomes();
  }

  loadOutcomes(): void {
    this.loading.set(true);
    this.error.set(null);
    this.facade.getByCourse(this.selectedCourseId()).subscribe({
      next: items => {
        this.rawOutcomes.set(items);
        this.loading.set(false);
      },
      error: e => { this.error.set(e.message || 'Kazanımlar yüklenemedi'); this.loading.set(false); }
    });
  }

  onCourseChange(courseId: number): void {
    this.selectedCourseId.set(courseId);
    this.selectedNodeId.set(null);
    this.searchTerm.set('');
    this.levelFilter.set(null);
    this.loadOutcomes();
  }

  onNodeSelect(id: number): void {
    this.selectedNodeId.set(id === this.selectedNodeId() ? null : id);
  }

  selectedNode = () => {
    const id = this.selectedNodeId();
    if (!id) return null;
    return this.facade.outcomes().find(o => o.id === id) ?? null;
  };

  getPrereqNames(outcome: LearningOutcome): string[] {
    return outcome.prerequisiteIds.map(id => {
      const o = this.facade.outcomes().find(x => x.id === id);
      return o ? `${o.name} (${o.code})` : '';
    }).filter(Boolean);
  }
}
