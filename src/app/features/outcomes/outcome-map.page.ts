import { Component,  inject,  signal,  computed,  OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OutcomesFacade } from './data-access/outcomes.facade';
import { OutcomeGraphComponent, levelColorEntries } from '@shared/components/outcome-graph/outcome-graph.component';
import { ErrorStateComponent } from '@shared/components';
import { LearningOutcome } from '@core/models/learning-outcome.model';
import { RouterLink } from '@angular/router';
import { DebounceDirective } from '@shared/directives';
import { StatusTextPipe } from '@shared/pipes';
import { OutcomeLevel, OutcomeStatus } from '@core/models/enums';

@Component({
  selector: 'app-outcome-map',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatSlideToggleModule, MatTooltipModule, OutcomeGraphComponent, ErrorStateComponent, DebounceDirective, StatusTextPipe],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button mat-icon-button routerLink="/outcomes" matTooltip="Geri Dön">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1 class="text-2xl font-bold text-gray-900">Kazanım Grafiği</h1>
        </div>
        <a mat-stroked-button routerLink="/outcomes"><mat-icon>list</mat-icon> Liste</a>
      </div>

      <div class="bg-white rounded-lg shadow-sm p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Ders</mat-label>
            <mat-select [value]="selectedCourseId()" (selectionChange)="onCourseChange($event.value)">
              <mat-option [value]="null">Tümü</mat-option>
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

      @if (unpublishedCount() > 0) {
        <div class="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <mat-icon class="text-amber-600">warning_amber</mat-icon>
          <div>
            <span class="text-sm font-medium text-amber-800">{{ unpublishedCount() }} yayında olmayan kazanım</span>
            <span class="text-xs text-amber-600 ml-2">— grafikte soluk görünürler</span>
          </div>
          <button mat-stroked-button size="small" class="ml-auto !text-amber-700 !border-amber-300"
            (click)="showUnpublished.set(!showUnpublished())">
            @if (showUnpublished()) { Gizle } @else { Göster }
          </button>
        </div>
      }

      <!-- Level legend -->
      <div class="bg-white rounded-lg shadow-sm p-3 flex flex-wrap gap-2 items-center">
        <span class="text-xs font-medium text-gray-500 mr-2">Seviyeler:</span>
        @for (entry of levelColorEntries; track entry.level) {
          <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
            [style.background-color]="entry.fill"
            [style.border]="'1px solid ' + entry.stroke"
            [style.color]="entry.stroke">
            {{ entry.label }}
          </span>
        }
        <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-400 border border-dashed border-gray-300 ml-2">
          ✦ Soluk = Yayında değil
        </span>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-8"><mat-spinner diameter="32" /></div>
      } @else if (error()) {
        <app-error-state [title]="'Kazanımlar yüklenemedi'" [message]="error()!" (retry)="loadOutcomes()" />
      } @else if (filteredOutcomes().length > 0) {
        <app-outcome-graph
          [outcomes]="displayOutcomes()"
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
          <p class="text-xs text-gray-400 mt-1">
            Seviye: {{ node.level | statusText }}
            | Durum: {{ node.status | statusText }}
            @if (!node.isActive) { <span class="text-amber-600 ml-1">(Yayında değil)</span> }
            | Önkoşul: {{ getPrereqNames(node).join(', ') || 'Yok' }}
          </p>
        </div>
      }
    </div>
  `
})
export class OutcomeMapPage implements OnInit {
  protected facade = inject(OutcomesFacade);

  selectedCourseId = signal<number | null>(1);
  selectedNodeId = signal<number | null>(null);
  focusMode = signal(false);
  searchTerm = signal('');
  levelFilter = signal<OutcomeLevel | null>(null);
  showUnpublished = signal(true);
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

  protected readonly levelColorEntries = levelColorEntries;

  private rawOutcomes = signal<LearningOutcome[]>([]);

  filteredOutcomes = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const level = this.levelFilter();
    return this.rawOutcomes().filter(o =>
      (!search || o.name.toLowerCase().includes(search) || o.code.toLowerCase().includes(search)) &&
      (!level || o.level === level)
    );
  });

  displayOutcomes = computed(() => {
    if (this.showUnpublished()) return this.filteredOutcomes();
    return this.filteredOutcomes().filter(o => o.isActive);
  });

  unpublishedCount = computed(() =>
    this.rawOutcomes().filter(o => !o.isActive).length
  );

  ngOnInit() {
    this.loadOutcomes();
  }

  loadOutcomes(): void {
    this.loading.set(true);
    this.error.set(null);
    const courseId = this.selectedCourseId();
    const source = courseId != null ? this.facade.getByCourse(courseId) : this.facade.getAll();
    source.subscribe({
      next: items => {
        this.rawOutcomes.set(items);
        this.loading.set(false);
      },
      error: e => { this.error.set(e.message || 'Kazanımlar yüklenemedi'); this.loading.set(false); }
    });
  }

  onCourseChange(courseId: number | null): void {
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
