import { Component,  inject,  signal,  computed,  OnInit,  DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CohortAnalyticsFacade } from './data-access/cohort-analytics.facade';
import { Cohort, CohortComparisonMetric } from '@core/models/cohort.model';
import { ColumnChartComponent } from '@shared/components/column-chart/column-chart.component';
import { ErrorStateComponent } from '@shared/components';
import { downloadCSV } from '@shared/utils/csv-export';

const MIN_COHORT_SIZE = 3;

@Component({
  selector: 'app-cohort-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatCardModule, MatSelectModule, MatFormFieldModule, MatProgressSpinnerModule, MatTableModule, MatTooltipModule, RouterLink, ColumnChartComponent, ErrorStateComponent],
  template: `
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <button mat-icon-button routerLink="/cohorts" matTooltip="Geri Dön">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="text-2xl font-bold text-gray-900">Cohort Analizi</h1>
      </div>

      <div class="bg-white rounded-lg shadow-sm p-3">
        <div class="grid grid-cols-1 gap-3">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Cohort Seçin</mat-label>
          <mat-select [value]="selectedCohortIds()" (selectionChange)="onSelectionChange($event.value)" multiple>
            @for (c of cohorts(); track c.id) {
              <mat-option [value]="c.id">{{ c.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        </div>
      </div>

      @for (c of selectedCohorts(); track c.id) {
        @if (c.studentIds.length < minCohortSize) {
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-yellow-800">
            <strong>{{ c.name }}</strong>: Bu cohort gizlilik eşiğinin altında ({{ c.studentIds.length }} &lt; {{ minCohortSize }} öğrenci). Karşılaştırma tablosunda gösterilmez.
          </div>
        }
      }

      @if (selectedCohortIds().length < 2) {
        <div class="text-gray-500 text-center py-8">En az 2 cohort seçin</div>
      } @else if (validCohorts().length < 2) {
        <div class="text-gray-500 text-center py-8">Gizlilik eşiğini karşılayan en az 2 cohort bulunmuyor</div>
      }

      @if (loading()) {
        <div class="flex justify-center py-8"><mat-spinner diameter="32" /></div>
      }

      @if (error(); as err) {
        <app-error-state [message]="err" (retry)="retry()" />
      }

      @if (validCohorts().length >= 2 && !loading() && !error()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          @for (c of validCohorts(); track c.id) {
            <div class="bg-white rounded-lg shadow-sm p-4 border-l-4"
              [class.border-blue-500]="$index === 0"
              [class.border-green-500]="$index === 1"
              [class.border-orange-500]="$index === 2"
              [class.border-purple-500]="$index === 3">
              <p class="text-sm text-gray-500 mb-1">{{ c.name }}</p>
              <p class="text-2xl font-bold text-gray-900">{{ c.studentIds.length }}</p>
              <p class="text-xs text-gray-400">öğrenci</p>
            </div>
          }
        </div>

        @if (metrics().length > 0) {
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold text-gray-900">Karşılaştırma Tablosu</h3>
            <button mat-stroked-button size="small" (click)="exportCSV()" matTooltip="CSV olarak indir">
              <mat-icon class="text-sm">download</mat-icon> Dışa Aktar
            </button>
          </div>
          <div class="bg-white rounded-lg shadow-sm overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b text-left text-gray-500 text-xs">
                  <th class="p-3 w-44">Metrik</th>
                  @for (c of validCohorts(); track c.id) {
                    <th class="p-3 text-right">{{ c.name }}</th>
                  }
                  <th class="p-3 text-right text-gray-400">Ort.</th>
                </tr>
              </thead>
              <tbody>
                @for (m of metrics(); track m.metric) {
                  <tr class="border-b border-gray-50 hover:bg-gray-50">
                    <td class="p-3 font-medium text-gray-700">{{ m.metric }}</td>
                    @for (c of validCohorts(); track c.id) {
                      <td class="p-3 text-right">
                        @if (isBest(m, c.id)) {
                          <span class="font-semibold text-green-600">{{ formatMetric(m, c.id) }}</span>
                        } @else {
                          <span class="text-gray-600">{{ formatMetric(m, c.id) }}</span>
                        }
                      </td>
                    }
                    <td class="p-3 text-right text-gray-400">{{ formatAvg(m) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="bg-white rounded-lg shadow-sm p-4">
            <h3 class="font-semibold text-gray-900 mb-4">Görsel Karşılaştırma</h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            @for (m of metrics(); track m.metric) {
              <div class="border rounded-lg p-4 bg-gray-50">
                <p class="text-sm font-semibold text-gray-800 mb-3">{{ m.metric }}</p>
                <div class="h-64">
                  <app-column-chart
                    [labels]="validCohortNames()"
                    [values]="metricValues(m)"
                    [title]="m.metric" />
                </div>
              </div>
            }
            </div>
          </div>

          <div class="mt-4">
            <button mat-stroked-button (click)="loadTrend()" [disabled]="trendLoading()">
              <mat-icon>timeline</mat-icon> {{ trendData() ? 'Trendi Gizle' : 'Zaman Trendini Göster' }}
            </button>
          </div>

          @if (trendData(); as trend) {
            <div class="bg-white rounded-lg shadow-sm p-4 mt-3">
              <h3 class="font-semibold text-gray-900 mb-1">Aylık Ortalama Başarı Trendi</h3>
              <p class="text-xs text-gray-500 mb-3">Sınav puan ortalamalarının aylara göre değişimi</p>
              @for (ds of trend.datasets; track ds.name) {
                <div class="mb-4 last:mb-0">
                  <p class="text-sm font-medium text-gray-700 mb-2">{{ ds.name }}</p>
                  <div class="h-48">
                    <app-column-chart
                      [labels]="trend.labels"
                      [values]="ds.values"
                      [title]="ds.name" />
                  </div>
                </div>
              }
            </div>
          }
        } @else {
          <div class="text-center p-8 text-gray-500">Karşılaştırma verisi bulunamadı</div>
        }
      }
    </div>
  `
})
export class CohortAnalyticsPage implements OnInit {
  private facade = inject(CohortAnalyticsFacade);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  protected minCohortSize = MIN_COHORT_SIZE;

  cohorts = signal<Cohort[]>([]);
  selectedCohortIds = signal<number[]>([]);
  metrics = signal<CohortComparisonMetric[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  trendData = signal<{ labels: string[]; datasets: { name: string; values: number[] }[] } | null>(null);
  trendLoading = signal(false);

  selectedCohorts = computed(() => this.cohorts().filter(c => this.selectedCohortIds().includes(c.id)));

  protected validCohorts = computed(() => this.selectedCohorts().filter(c => c.studentIds.length >= this.minCohortSize));

  validCohortNames = computed(() => this.validCohorts().map(c => c.name));

  metricValues(metric: CohortComparisonMetric): number[] {
    return this.validCohorts().map(c => {
      return metric.cohortValues.find(v => v.cohortId === c.id)?.value ?? 0;
    });
  }

  private metricMax = computed(() => {
    const map = new Map<string, number>();
    for (const m of this.metrics()) {
      const max = Math.max(...m.cohortValues.map(v => v.value), 1);
      map.set(m.metric, max);
    }
    return map;
  });

  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(qp => {
      const ids = qp.get('cohorts');
      this.selectedCohortIds.set(ids ? ids.split(',').map(Number).filter(n => !isNaN(n)) : []);
    });
    this.loading.set(true);
    this.error.set(null);
    this.facade.getCohorts().subscribe({
      next: (data) => {
        this.cohorts.set(data);
        this.loading.set(false);
        const ids = this.selectedCohortIds();
        if (ids.length >= 2) {
          this.loadMetrics();
        } else {
          this.selectedCohortIds.set(data.map(c => c.id));
          this.loadMetrics();
        }
      },
      error: () => { this.error.set('Cohortlar yüklenirken hata oluştu'); this.loading.set(false); }
    });
  }

  onSelectionChange(ids: number[]) {
    this.selectedCohortIds.set(ids);
    const params: Record<string, any> = {};
    if (ids.length > 0) params['cohorts'] = ids.join(',');
    this.router.navigate([], { queryParams: params, replaceUrl: true });
    if (ids.length >= 2) {
      this.loadMetrics();
    } else {
      this.metrics.set([]);
    }
  }

  retry(): void {
    this.error.set(null);
    this.loading.set(true);
    this.facade.getCohorts().subscribe({
      next: (data) => { this.cohorts.set(data); this.loading.set(false); if (this.selectedCohortIds().length >= 2) this.loadMetrics(); },
      error: () => { this.error.set('Cohortlar yüklenirken hata oluştu'); this.loading.set(false); }
    });
  }

  private loadMetrics() {
    this.loading.set(true);
    this.error.set(null);
    this.facade.getComparisonMetrics(this.selectedCohortIds()).subscribe({
      next: (data) => { this.metrics.set(data); this.loading.set(false); },
      error: () => { this.error.set('Karşılaştırma verileri yüklenirken hata oluştu'); this.loading.set(false); }
    });
  }

  isBest(metric: CohortComparisonMetric, cohortId: number): boolean {
    const max = Math.max(...metric.cohortValues.map(v => v.value));
    const val = metric.cohortValues.find(v => v.cohortId === cohortId)?.value ?? 0;
    return val === max && max > 0 && metric.metric !== 'Zayıf Kazanım (%)';
  }

  isWorst(metric: CohortComparisonMetric, cohortId: number): boolean {
    if (metric.metric === 'Zayıf Kazanım (%)') {
      const min = Math.min(...metric.cohortValues.map(v => v.value));
      const val = metric.cohortValues.find(v => v.cohortId === cohortId)?.value ?? 0;
      return val === min;
    }
    return false;
  }

  barHeight(metric: CohortComparisonMetric, cohortId: number): number {
    const max = this.metricMax().get(metric.metric) ?? 1;
    const val = metric.cohortValues.find(v => v.cohortId === cohortId)?.value ?? 0;
    return Math.max(5, Math.round((val / max) * 100));
  }

  barColor(index: number): string {
    const colors = ['#3b82f6', '#16a34a', '#f59e0b', '#8b5cf6'];
    return colors[index % colors.length];
  }

  formatMetric(metric: CohortComparisonMetric, cohortId: number): string {
    const val = metric.cohortValues.find(v => v.cohortId === cohortId)?.value ?? 0;
    if (metric.metric === 'Öğrenci Sayısı') return val.toString();
    if (metric.metric === 'Ortalama Puan') return val.toFixed(0);
    if (metric.metric === 'Öğrenci Başı Deneme') return val.toFixed(0);
    return val.toFixed(1) + '%';
  }

  formatAvg(metric: CohortComparisonMetric): string {
    if (metric.metric === 'Öğrenci Sayısı') return metric.average.toFixed(0);
    if (metric.metric === 'Ortalama Puan') return metric.average.toFixed(0);
    if (metric.metric === 'Öğrenci Başı Deneme') return metric.average.toFixed(1);
    return metric.average.toFixed(1) + '%';
  }

  exportCSV(): void {
    const metrics = this.metrics();
    const cohorts = this.validCohorts();
    if (metrics.length === 0 || cohorts.length === 0) return;

    const rows: Record<string, string>[] = [];

    for (const c of cohorts) {
      const row: Record<string, string> = { Cohort: c.name };
      for (const m of metrics) {
        const val = m.cohortValues.find(v => v.cohortId === c.id)?.value ?? 0;
        row[m.metric] = String(val);
      }
      rows.push(row);
    }

    const avgRow: Record<string, string> = { Cohort: 'Ortalama' };
    for (const m of metrics) {
      avgRow[m.metric] = String(m.average);
    }
    rows.push(avgRow);

    downloadCSV(rows, `cohort-analizi-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  loadTrend(): void {
    if (this.trendData()) {
      this.trendData.set(null);
      return;
    }
    this.trendLoading.set(true);
    this.facade.getMonthlyTrend(this.selectedCohortIds()).subscribe({
      next: (data) => { this.trendData.set(data); this.trendLoading.set(false); },
      error: () => { this.trendLoading.set(false); },
    });
  }
}
