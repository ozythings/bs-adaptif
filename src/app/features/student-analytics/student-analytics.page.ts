import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StudentDashboardFacade } from '../student-dashboard/student-dashboard.facade';
import { CurrentUserService } from '@core/auth/current-user.service';
import { UserRole } from '@core/models/enums';
import { MasteryHeatmap } from '@shared/components/mastery-heatmap/mastery-heatmap.component';
import { ColumnChartComponent } from '@shared/components/column-chart/column-chart.component';
import { LineChartComponent } from '@shared/components/line-chart/line-chart.component';
import { ErrorStateComponent } from '@shared/components';
import { KpiCardComponent } from '@shared/components';
import { RecommendationReasonCardComponent } from '@shared/components/recommendation-reason-card/recommendation-reason-card.component';
import { EXAMS_SEED } from '@core/data';
import type { StudentDashboardData } from '../student-dashboard/student-dashboard.model';

@Component({
  selector: 'app-student-analytics',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatIconModule, MatButtonModule, MatProgressSpinnerModule,
    MasteryHeatmap, ColumnChartComponent, LineChartComponent, ErrorStateComponent,
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
            borderClass="border-blue-500" iconBgClass="bg-blue-100" iconColorClass="text-blue-600"
            icon="assignment" label="Toplam Deneme" [value]="info.totalAttempts" />
          <app-kpi-card
            borderClass="border-green-500" iconBgClass="bg-green-100" iconColorClass="text-green-600"
            icon="emoji_events" label="Ortalama Başarım" [value]="info.overallMastery + '%'" />
          <app-kpi-card
            borderClass="border-red-500" iconBgClass="bg-red-100" iconColorClass="text-red-600"
            icon="warning" label="Zayıf Alanlar" [value]="info.weakOutcomes.length" />
          <app-kpi-card
            borderClass="border-yellow-500" iconBgClass="bg-yellow-100" iconColorClass="text-yellow-600"
            icon="star" label="Güçlü Alanlar" [value]="info.strongOutcomes.length" />
        </div>

        <!-- Exam Trend Chart -->
        @if (trendLabels().length > 0) {
        <div class="bg-white rounded-lg shadow-sm p-4">
          <h2 class="text-lg font-semibold mb-3">İlerleme Trendi</h2>
          <div class="h-64">
            <app-column-chart
              [labels]="trendLabels()"
              [values]="trendValues()"
              title="Sınav Başarı Yüzdesi" />
          </div>
        </div>
        }

        <!-- Mastery Trend Chart -->
        @if (masteryTrendDatasets().length > 0) {
        <div class="bg-white rounded-lg shadow-sm p-4">
          <h2 class="text-lg font-semibold mb-3">Kazanım İlerleme Trendi</h2>
          <div class="h-72">
            <app-line-chart
              [labels]="masteryTrendLabels()"
              [datasets]="masteryTrendDatasets()"
              title="Kazanım Puanı" />
          </div>
        </div>
        }

        <!-- Exam History -->
        <div class="bg-white rounded-lg shadow-sm p-4">
          <h2 class="text-lg font-semibold mb-3">Sınav Geçmişi</h2>
          @if (attemptHistory().length === 0) {
            <div class="text-center py-6 text-gray-500">
              <mat-icon class="text-4xl mb-2">history</mat-icon>
              <p>Henüz sınav geçmişi bulunmuyor</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b text-left text-gray-500 text-xs">
                    <th class="p-2">Sınav</th>
                    <th class="p-2 text-right">Puan</th>
                    <th class="p-2 text-right">Yüzde</th>
                    <th class="p-2 text-right">Tarih</th>
                    <th class="p-2 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  @for (a of attemptHistory(); track a.id) {
                    <tr class="border-b border-gray-50 hover:bg-gray-50">
                      <td class="p-2 font-medium">{{ examTitle(a.examId) }}</td>
                      <td class="p-2 text-right">{{ a.totalScore }} / {{ a.maxScore }}</td>
                      <td class="p-2 text-right">
                        <span [class.text-green-600]="a.scorePercentage >= 50" [class.text-red-600]="a.scorePercentage < 50">
                          %{{ a.scorePercentage }}
                        </span>
                      </td>
                      <td class="p-2 text-right text-gray-500 text-xs">{{ a.submittedAt | date:'dd.MM.yyyy HH:mm' }}</td>
                      <td class="p-2 text-center">
                        <span class="text-xs px-2 py-0.5 rounded" [class.bg-green-100]="a.status === 'finalized'" [class.text-green-700]="a.status === 'finalized'" [class.bg-gray-100]="a.status !== 'finalized'" [class.text-gray-700]="a.status !== 'finalized'">
                          {{ a.status === 'finalized' ? 'Tamamlandı' : a.status }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Mastery Heatmap -->
        <div class="bg-white rounded-lg shadow-sm p-4">
          <h2 class="text-lg font-semibold mb-3">Başarım Haritası</h2>
          <app-mastery-heatmap [scores]="info.masteryScores" [outcomes]="info.outcomes" />
        </div>

        <!-- Recommendations -->
        <div class="bg-white rounded-lg shadow-sm p-4">
          <h2 class="text-lg font-semibold mb-3">Öneriler</h2>
          @if (info.recommendations.length === 0) {
            <div class="text-center py-8 text-gray-500">
              <mat-icon class="text-5xl mb-2">inbox</mat-icon>
              <p class="text-lg">Henüz veri bulunmuyor</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (rec of info.recommendations; track rec.contentId + '-' + rec.outcomeId) {
                <app-recommendation-reason-card
                  [recommendation]="rec"
                  [outcomeName]="facade.getOutcomeName(rec.outcomeId)"
                  [courseName]="facade.getCourseNameByOutcome(rec.outcomeId)" />
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

  isObserver = computed(() => this.currentUser.user().role === UserRole.OBSERVER);

  attemptHistory = computed(() => {
    const info = this.d();
    if (!info) return [];
    return info.examAttempts.map(a => ({
      ...a,
      examTitle: EXAMS_SEED.find(e => e.id === a.examId)?.title ?? `Sınav #${a.examId}`,
    })).sort((a, b) => new Date(b.submittedAt ?? b.updatedAt).getTime() - new Date(a.submittedAt ?? a.updatedAt).getTime());
  });

  trendLabels = computed(() => this.attemptHistory().slice().reverse().map(a =>
    new Date(a.submittedAt ?? a.updatedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
  ));
  trendValues = computed(() => this.attemptHistory().slice().reverse().map(a => a.scorePercentage));

  masteryTrendLabels = computed(() => {
    const info = this.d();
    if (!info) return [];
    const scores = info.masteryScores;
    if (scores.length === 0) return [];
    const allDates = scores.flatMap(s => (s.history ?? []).map(h => h.date));
    const unique = [...new Set(allDates)].sort();
    return unique.map(d => new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }));
  });

  masteryTrendDatasets = computed(() => {
    const info = this.d();
    if (!info) return [];
    const scores = info.masteryScores;
    const outcomes = info.outcomes;
    const labels = this.masteryTrendLabels();
    if (scores.length === 0 || labels.length === 0) return [];
    const outcomeMap = new Map(outcomes.map(o => [o.id, o]));
    return scores
      .filter(s => s.history && s.history.length > 1)
      .map(s => {
        const outcome = outcomeMap.get(s.outcomeId);
        const dateToScore = new Map(s.history.map(h => [h.date, h.score]));
        const allDates = [...new Set(s.history.map(h => h.date))].sort();
        const dateToIndex = new Map(allDates.map((d, i) => [d, i]));
        const values = labels.map((_, i) => {
          const matchDate = allDates.find(d => dateToIndex.get(d) === i);
          return matchDate ? (dateToScore.get(matchDate) ?? 0) : 0;
        });
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
