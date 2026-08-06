import { Component, inject, signal, computed, effect, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StudentDashboardFacade } from '../student-dashboard/student-dashboard.facade';
import { CurrentUserService } from '@core/auth/current-user.service';
import { UserRole } from '@core/models/enums';
import { MasteryHeatmap } from '@shared/components/mastery-heatmap/mastery-heatmap.component';
import { LineChartComponent } from '@shared/components/line-chart/line-chart.component';
import { ErrorStateComponent } from '@shared/components';
import { KpiCardComponent } from '@shared/components';
import { RecommendationReasonCardComponent } from '@shared/components/recommendation-reason-card/recommendation-reason-card.component';
import { DebounceDirective } from '@shared/directives';
import { EXAMS_SEED } from '@core/data';
import type { StudentDashboardData } from '../student-dashboard/student-dashboard.model';

@Component({
  selector: 'app-student-analytics',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, DebounceDirective,
    MasteryHeatmap, LineChartComponent, ErrorStateComponent,
    KpiCardComponent, RecommendationReasonCardComponent
  ],
  template: `
    <div class="space-y-6 p-4">
      @if (!isObserver()) {
      <a routerLink="/grading" class="text-sm text-gray-500 hover:text-blue-600 inline-block">← Değerlendirmeye Dön</a>
      }
      @if (loading()) {
        <div class="flex justify-center items-center py-20">
          <mat-spinner diameter="32" />
          <span class="ml-3 text-gray-600">Yükleniyor...</span>
        </div>
      } @else if (error(); as err) {
        <app-error-state [title]="'Veri Yüklenemedi'" [message]="err" [retryable]="true" (retry)="retry()" />
      } @else if (d(); as info) {
        @if (info.student; as s) {
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
              {{ s.firstName.charAt(0) }}{{ s.lastName.charAt(0) }}
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900">{{ s.firstName }} {{ s.lastName }}</h1>
              <p class="text-sm text-gray-500">{{ s.schoolNumber }}</p>
            </div>
            @if (!isObserver()) {
            <a [routerLink]="['/participant', s.id, 'edit']" mat-stroked-button color="primary" class="ml-auto">
              <mat-icon>edit</mat-icon> Profili Düzenle
            </a>
            }
          </div>
        }

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <app-kpi-card
            [clickable]="true" [expanded]="expandedKpi() === 'attempts'" (click)="toggleDetail('attempts')"
            borderClass="border-blue-500" iconBgClass="bg-blue-100" iconColorClass="text-blue-600"
            icon="assignment" label="Girilen Sınavlar" [value]="info.totalAttempts" />
          <app-kpi-card
            [clickable]="true" [expanded]="expandedKpi() === 'mastery'" (click)="toggleDetail('mastery')"
            borderClass="border-green-500" iconBgClass="bg-green-100" iconColorClass="text-green-600"
            icon="emoji_events" label="Ortalama Başarım" [value]="info.overallMastery + '%'" />
          <app-kpi-card
            [clickable]="true" [expanded]="expandedKpi() === 'weak'" (click)="toggleDetail('weak')"
            borderClass="border-red-500" iconBgClass="bg-red-100" iconColorClass="text-red-600"
            icon="warning" label="Zayıf Alanlar" [value]="info.weakOutcomes.length" />
          <app-kpi-card
            [clickable]="true" [expanded]="expandedKpi() === 'strong'" (click)="toggleDetail('strong')"
            borderClass="border-yellow-500" iconBgClass="bg-yellow-100" iconColorClass="text-yellow-600"
            icon="star" label="Güçlü Alanlar" [value]="info.strongOutcomes.length" />
        </div>

        <!-- KPI Detail Panel -->
        @if (expandedKpi(); as kpi) {
          <div class="bg-white rounded-lg shadow-sm p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-gray-900">{{ kpiTitle(kpi) }}</h3>
              <button mat-icon-button (click)="expandedKpi.set(null)">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <mat-form-field appearance="outline" class="w-full mb-3">
              <mat-label>İsme göre filtrele</mat-label>
              <input matInput [value]="kpiSearch()" [appDebounce]="300" (debouncedChange)="onKpiSearch($event)" placeholder="Kod, ad veya sınav ara...">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
            @switch (kpi) {
              @case ('weak') {
                @if (filteredWeak().length === 0) {
                  <p class="text-gray-500 text-sm">Zayıf alan bulunmuyor.</p>
                } @else {
                  <div class="space-y-2">
                    @for (o of paginatedWeak(); track o.id) {
                      <div class="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                        <span class="text-sm font-medium text-gray-900">{{ o.code }} - {{ o.name }}</span>
                        <span class="text-sm text-red-600 font-medium">%{{ getMasteryScore(o.id) }}</span>
                      </div>
                    }
                  </div>
                  @if (filteredWeak().length > 5) {
                    <mat-paginator [pageSize]="pageSize()" [pageSizeOptions]="[5, 10, 20]" [length]="panelLength()" [pageIndex]="pageIndex()" (page)="onPage($event)" showFirstLastButtons />
                  }
                }
              }
              @case ('strong') {
                @if (filteredStrong().length === 0) {
                  <p class="text-gray-500 text-sm">Güçlü alan bulunmuyor.</p>
                } @else {
                  <div class="space-y-2">
                    @for (o of paginatedStrong(); track o.id) {
                      <div class="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                        <span class="text-sm font-medium text-gray-900">{{ o.code }} - {{ o.name }}</span>
                        <span class="text-sm text-green-600 font-medium">%{{ getMasteryScore(o.id) }}</span>
                      </div>
                    }
                  </div>
                  @if (filteredStrong().length > 5) {
                    <mat-paginator [pageSize]="pageSize()" [pageSizeOptions]="[5, 10, 20]" [length]="panelLength()" [pageIndex]="pageIndex()" (page)="onPage($event)" showFirstLastButtons />
                  }
                }
              }
              @case ('mastery') {
                @if (filteredMasteryForKpi().length === 0) {
                  <p class="text-gray-500 text-sm">Başarım verisi bulunmuyor.</p>
                } @else {
                  <div class="space-y-2">
                    @for (ms of paginatedMastery(); track ms.outcomeId) {
                      <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span class="text-sm text-gray-900">{{ outcomeName(ms.outcomeId) }}</span>
                        <span class="text-sm font-medium"
                          [class.text-green-600]="ms.score >= 80"
                          [class.text-blue-600]="ms.score >= 60 && ms.score < 80"
                          [class.text-yellow-600]="ms.score >= 40 && ms.score < 60"
                          [class.text-red-600]="ms.score < 40">
                          %{{ ms.score }}
                        </span>
                      </div>
                    }
                  </div>
                  @if (filteredMasteryForKpi().length > 5) {
                    <mat-paginator [pageSize]="pageSize()" [pageSizeOptions]="[5, 10, 20]" [length]="panelLength()" [pageIndex]="pageIndex()" (page)="onPage($event)" showFirstLastButtons />
                  }
                }
              }
              @case ('attempts') {
                @if (filteredAttemptsForKpi().length === 0) {
                  <p class="text-gray-500 text-sm">Henüz sınav denemesi bulunmuyor.</p>
                } @else {
                  <div class="space-y-2">
                    @for (a of paginatedAttempts(); track a.id) {
                      <div class="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                        <span class="text-sm font-medium text-gray-900">{{ examTitle(a.examId) }}</span>
                        <span class="text-sm text-gray-600">{{ a.totalScore }} / {{ a.maxScore }}</span>
                      </div>
                    }
                  </div>
                  @if (filteredAttemptsForKpi().length > 5) {
                    <mat-paginator [pageSize]="pageSize()" [pageSizeOptions]="[5, 10, 20]" [length]="panelLength()" [pageIndex]="pageIndex()" (page)="onPage($event)" showFirstLastButtons />
                  }
                }
              }
            }
          </div>
        }

        <!-- Mastery Trend Chart -->
        @if (masteryTrendDatasets().length > 0) {
        <div class="bg-white rounded-lg shadow-sm">
          <button type="button" class="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50" (click)="expandedMasteryTrend.set(!expandedMasteryTrend())">
            <mat-icon class="text-gray-500 text-sm transition-transform" [style.transform]="expandedMasteryTrend() ? 'rotate(90deg)' : 'none'">chevron_right</mat-icon>
            <h2 class="text-lg font-semibold">Kazanım İlerleme Trendi</h2>
          </button>
          @if (expandedMasteryTrend()) {
          <div class="px-4 pb-4">
            <div class="h-72">
              <app-line-chart
                [labels]="masteryTrendLabels()"
                [datasets]="masteryTrendDatasets()"
                title="Kazanım Puanı" />
            </div>
          </div>
          }
        </div>
        }

        <!-- Mastery Heatmap -->
        <div class="bg-white rounded-lg shadow-sm">
          <button type="button" class="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50" (click)="expandedMasteryHeatmap.set(!expandedMasteryHeatmap())">
            <mat-icon class="text-gray-500 text-sm transition-transform" [style.transform]="expandedMasteryHeatmap() ? 'rotate(90deg)' : 'none'">chevron_right</mat-icon>
            <h2 class="text-lg font-semibold">Başarım Haritası</h2>
          </button>
          @if (expandedMasteryHeatmap()) {
          <div class="px-4 pb-4">
            <mat-form-field appearance="outline" class="w-full mb-3">
              <mat-label>Kazanım ara</mat-label>
              <input matInput [value]="heatmapSearch()" [appDebounce]="300" (debouncedChange)="onHeatmapSearch($event)" placeholder="Kod veya ad...">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
            @if (filteredHeatmapOutcomes().length === 0) {
              <p class="text-gray-500 text-sm text-center py-4">Sonuç bulunamadı.</p>
            } @else {
              <app-mastery-heatmap [scores]="filteredHeatmapScores()" [outcomes]="paginatedHeatmapOutcomes()" />
              @if (filteredHeatmapOutcomes().length > 5) {
                <mat-paginator [pageSize]="heatmapPageSize()" [pageSizeOptions]="[5, 10, 25]" [length]="filteredHeatmapOutcomes().length" [pageIndex]="heatmapPageIndex()" (page)="onHeatmapPage($event)" showFirstLastButtons />
              }
            }
          </div>
          }
        </div>

        <!-- Recommendations -->
        <div class="bg-white rounded-lg shadow-sm">
          <button type="button" class="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50" (click)="expandedRecommendations.set(!expandedRecommendations())">
            <mat-icon class="text-gray-500 text-sm transition-transform" [style.transform]="expandedRecommendations() ? 'rotate(90deg)' : 'none'">chevron_right</mat-icon>
            <h2 class="text-lg font-semibold">Öneriler</h2>
          </button>
          @if (expandedRecommendations()) {
          <div class="px-4 pb-4">
            <mat-form-field appearance="outline" class="w-full mb-3">
              <mat-label>Öneri ara</mat-label>
              <input matInput [value]="recSearch()" [appDebounce]="300" (debouncedChange)="onRecSearch($event)" placeholder="Öneri veya kazanım adı...">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
            @if (filteredRecommendations().length === 0) {
              <div class="text-center py-8 text-gray-500">
                <mat-icon class="text-5xl mb-2">inbox</mat-icon>
                <p class="text-lg">Sonuç bulunamadı</p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (rec of paginatedRecommendations(); track rec.id) {
                  <app-recommendation-reason-card
                    [recommendation]="rec"
                    [outcomeName]="facade.getOutcomeName(rec.outcomeId)"
                    [courseName]="facade.getCourseNameByOutcome(rec.outcomeId)" />
                }
              </div>
              @if (filteredRecommendations().length > 5) {
                <mat-paginator [pageSize]="recPageSize()" [pageSizeOptions]="[5, 10, 25]" [length]="filteredRecommendations().length" [pageIndex]="recPageIndex()" (page)="onRecPage($event)" showFirstLastButtons />
              }
            }
          </div>
          }
        </div>
      }
    </div>
  `
})
export class StudentAnalyticsPage implements OnInit {
  private route = inject(ActivatedRoute);
  protected facade = inject(StudentDashboardFacade);
  private currentUser = inject(CurrentUserService);
  private destroyRef = inject(DestroyRef);

  private studentId = 0;

  loading = signal(true);
  error = signal<string | null>(null);
  d = signal<StudentDashboardData | null>(null);
  expandedKpi = signal<string | null>(null);
  kpiSearch = signal('');
  expandedMasteryTrend = signal(true);
  expandedMasteryHeatmap = signal(true);
  expandedRecommendations = signal(true);
  pageSize = signal(5);
  pageIndex = signal(0);

  heatmapSearch = signal('');
  heatmapPageSize = signal(5);
  heatmapPageIndex = signal(0);

  recSearch = signal('');
  recPageSize = signal(5);
  recPageIndex = signal(0);

  isObserver = computed(() => this.currentUser.user().role === UserRole.OBSERVER);

  filteredWeak = computed(() => {
    const info = this.d();
    if (!info) return [];
    const search = this.kpiSearch().toLowerCase();
    return info.weakOutcomes.filter(o =>
      !search || o.code.toLowerCase().includes(search) || o.name.toLowerCase().includes(search)
    );
  });
  filteredStrong = computed(() => {
    const info = this.d();
    if (!info) return [];
    const search = this.kpiSearch().toLowerCase();
    return info.strongOutcomes.filter(o =>
      !search || o.code.toLowerCase().includes(search) || o.name.toLowerCase().includes(search)
    );
  });
  filteredMasteryForKpi = computed(() => {
    const info = this.d();
    if (!info) return [];
    const search = this.kpiSearch().toLowerCase();
    return info.masteryScores.filter(ms =>
      !search || this.outcomeName(ms.outcomeId).toLowerCase().includes(search)
    );
  });
  filteredAttemptsForKpi = computed(() => {
    const info = this.d();
    if (!info) return [];
    const search = this.kpiSearch().toLowerCase();
    return info.examAttempts.filter(a =>
      !search || this.examTitle(a.examId).toLowerCase().includes(search)
    );
  });

  paginatedWeak = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredWeak().slice(start, start + this.pageSize());
  });
  paginatedStrong = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredStrong().slice(start, start + this.pageSize());
  });
  paginatedMastery = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredMasteryForKpi().slice(start, start + this.pageSize());
  });
  paginatedAttempts = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredAttemptsForKpi().slice(start, start + this.pageSize());
  });
  panelLength = computed(() => {
    const kpi = this.expandedKpi();
    if (!kpi) return 0;
    if (kpi === 'weak') return this.filteredWeak().length;
    if (kpi === 'strong') return this.filteredStrong().length;
    if (kpi === 'mastery') return this.filteredMasteryForKpi().length;
    if (kpi === 'attempts') return this.filteredAttemptsForKpi().length;
    return 0;
  });

  filteredHeatmapOutcomes = computed(() => {
    const info = this.d();
    if (!info) return [];
    const search = this.heatmapSearch().toLowerCase();
    return info.outcomes.filter(o =>
      !search ||
      o.code.toLowerCase().includes(search) ||
      o.name.toLowerCase().includes(search)
    );
  });

  paginatedHeatmapOutcomes = computed(() => {
    const start = this.heatmapPageIndex() * this.heatmapPageSize();
    return this.filteredHeatmapOutcomes().slice(start, start + this.heatmapPageSize());
  });

  filteredHeatmapScores = computed(() => {
    const outcomeIds = new Set(this.paginatedHeatmapOutcomes().map(o => o.id));
    const info = this.d();
    if (!info) return [];
    return info.masteryScores.filter(s => outcomeIds.has(s.outcomeId));
  });

  filteredRecommendations = computed(() => {
    const info = this.d();
    if (!info) return [];
    const search = this.recSearch().toLowerCase();
    return info.recommendations.filter(r =>
      !search ||
      r.reason.toLowerCase().includes(search) ||
      this.facade.getOutcomeName(r.outcomeId).toLowerCase().includes(search)
    );
  });

  paginatedRecommendations = computed(() => {
    const start = this.recPageIndex() * this.recPageSize();
    return this.filteredRecommendations().slice(start, start + this.recPageSize());
  });

  constructor() {
    effect(() => {
      this.expandedKpi();
      this.pageIndex.set(0);
      this.kpiSearch.set('');
    });
  }

  toggleDetail(key: string): void {
    this.expandedKpi.set(this.expandedKpi() === key ? null : key);
  }

  onKpiSearch(term: string): void {
    this.kpiSearch.set(term);
    this.pageIndex.set(0);
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  onHeatmapSearch(term: string): void {
    this.heatmapSearch.set(term);
    this.heatmapPageIndex.set(0);
  }

  onHeatmapPage(event: PageEvent): void {
    this.heatmapPageIndex.set(event.pageIndex);
    this.heatmapPageSize.set(event.pageSize);
  }

  onRecSearch(term: string): void {
    this.recSearch.set(term);
    this.recPageIndex.set(0);
  }

  onRecPage(event: PageEvent): void {
    this.recPageIndex.set(event.pageIndex);
    this.recPageSize.set(event.pageSize);
  }

  kpiTitle(key: string): string {
    const titles: Record<string, string> = {
      attempts: 'Sınavlar',
      mastery: 'Kazanım Puanları',
      weak: 'Zayıf Alanlar',
      strong: 'Güçlü Alanlar',
    };
    return titles[key] ?? '';
  }

  getMasteryScore(outcomeId: number): number {
    const info = this.d();
    if (!info) return 0;
    return info.masteryScores.find(ms => ms.outcomeId === outcomeId)?.score ?? 0;
  }

  outcomeName(outcomeId: number): string {
    const info = this.d();
    if (!info) return '';
    const o = info.outcomes.find(out => out.id === outcomeId);
    return o ? `${o.code} - ${o.name}` : `Kazanım #${outcomeId}`;
  }

  rawTrendDates = computed(() => {
    const info = this.d();
    if (!info) return [];
    const allDates = info.masteryScores
      .flatMap(s => (s.history ?? []).map(h => h.date));
    return [...new Set(allDates)].sort();
  });

  masteryTrendLabels = computed(() => {
    return this.rawTrendDates().map(d =>
      new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
    );
  });

  masteryTrendDatasets = computed(() => {
    const info = this.d();
    if (!info) return [];
    const rawDates = this.rawTrendDates();
    if (rawDates.length === 0) return [];
    const outcomeMap = new Map(info.outcomes.map(o => [o.id, o]));
    return info.masteryScores
      .filter(s => s.history && s.history.length >= 1)
      .map(s => {
        const outcome = outcomeMap.get(s.outcomeId);
        const dateToScore = new Map(s.history.map(h => [h.date, h.score]));
        const values = rawDates.map(d => dateToScore.get(d) ?? 0);
        return {
          label: outcome ? `${outcome.code} - ${outcome.name}` : `Kazanım #${s.outcomeId}`,
          values,
        };
      });
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(id)) {
      this.error.set('Geçersiz öğrenci ID');
      this.loading.set(false);
      return;
    }
    this.studentId = id;
    this.loadData();
  }

  retry(): void {
    this.loadData();
  }

  examTitle(examId: number): string {
    return EXAMS_SEED.find(e => e.id === examId)?.title ?? `Sınav #${examId}`;
  }

  private loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.facade.getDashboard(this.studentId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: info => {
        if (!info.student) {
          this.error.set('Öğrenci bulunamadı');
          this.loading.set(false);
          return;
        }
        this.d.set(info);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.message ?? 'Veri yüklenirken hata oluştu');
        this.loading.set(false);
      }
    });
  }
}
