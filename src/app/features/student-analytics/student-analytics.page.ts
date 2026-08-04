import { Component,  inject,  signal,  computed,  OnInit,  DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StudentAnalyticsFacade } from './data-access/student-analytics.facade';
import { CurrentUserService } from '@core/auth/current-user.service';
import { UserRole } from '@core/models/enums';
import { MasteryHeatmap } from '@shared/components/mastery-heatmap/mastery-heatmap.component';
import { ColumnChartComponent } from '@shared/components/column-chart/column-chart.component';
import { LineChartComponent } from '@shared/components/line-chart/line-chart.component';
import { ErrorStateComponent } from '@shared/components';
import { Participant } from '@core/models/participant.model';
import { MasteryScore } from '@core/models/mastery-score.model';
import { LearningOutcome } from '@core/models/learning-outcome.model';
import { Attempt } from '@core/models/attempt.model';
import { Recommendation } from '@core/models/recommendation.model';
import { EXAMS_SEED } from '@core/data';

@Component({
  selector: 'app-student-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MasteryHeatmap, ColumnChartComponent, LineChartComponent, ErrorStateComponent],
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
      } @else {
        @if (student(); as s) {
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

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <p class="text-sm text-gray-500">Toplam Deneme</p>
            <p class="text-2xl font-bold">{{ totalAttempts() }}</p>
          </div>
          <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <p class="text-sm text-gray-500">Ortalama Ustalık</p>
            <p class="text-2xl font-bold">{{ avgMastery() }}</p>
          </div>
          <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
            <p class="text-sm text-gray-500">Zayıf Alanlar</p>
            <p class="text-2xl font-bold">{{ weakOutcomes().length }}</p>
          </div>
          <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
            <p class="text-sm text-gray-500">Güçlü Alanlar</p>
            <p class="text-2xl font-bold">{{ strongOutcomes().length }}</p>
          </div>
        </div>

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
                      <td class="p-2 font-medium">{{ a.examTitle }}</td>
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

        <div class="bg-white rounded-lg shadow-sm p-4">
          <h2 class="text-lg font-semibold mb-3">Ustalık Haritası</h2>
          <app-mastery-heatmap [scores]="masteryScores()" [outcomes]="allOutcomes()" />
        </div>

        <div class="bg-white rounded-lg shadow-sm p-4">
          <h2 class="text-lg font-semibold mb-3">Öneriler</h2>
          @if (recommendations().length === 0) {
            <div class="text-center py-8 text-gray-500">
              <mat-icon class="text-5xl mb-2">inbox</mat-icon>
              <p class="text-lg">Henüz veri bulunmuyor</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (rec of recommendations(); track rec.id) {
                <div class="p-3 rounded-lg border" [class.bg-green-50]="rec.isApplied" [class.border-green-200]="rec.isApplied" [class.bg-gray-50]="!rec.isApplied" [class.border-gray-200]="!rec.isApplied">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <p class="font-medium text-sm">{{ rec.reason }}</p>
                      <p class="text-xs text-gray-500 mt-1">
                        {{ rec.contentType === 'content' ? 'İçerik' : 'Soru' }} #{{ rec.contentId }} | Öncelik: {{ rec.priority }}
                      </p>
                    </div>
                    @if (rec.isApplied) {
                      <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Uygulandı</span>
                    }
                  </div>
                </div>
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
  private facade = inject(StudentAnalyticsFacade);
  private currentUser = inject(CurrentUserService);
  private destroyRef = inject(DestroyRef);

  private studentId = 0;

  loading = signal(true);
  error = signal<string | null>(null);
  student = signal<Participant | undefined>(undefined);
  masteryScores = signal<MasteryScore[]>([]);
  allOutcomes = signal<LearningOutcome[]>([]);
  attempts = signal<Attempt[]>([]);
  recommendations = signal<Recommendation[]>([]);
  weakOutcomes = signal<LearningOutcome[]>([]);
  strongOutcomes = signal<LearningOutcome[]>([]);

  isObserver = computed(() => this.currentUser.user().role === UserRole.OBSERVER);

  attemptHistory = computed(() =>
    this.attempts().map(a => ({
      ...a,
      examTitle: EXAMS_SEED.find(e => e.id === a.examId)?.title ?? `Sınav #${a.examId}`,
    })).sort((a, b) => new Date(b.submittedAt ?? b.updatedAt).getTime() - new Date(a.submittedAt ?? a.updatedAt).getTime())
  );

  trendLabels = computed(() => this.attemptHistory().slice().reverse().map(a =>
    new Date(a.submittedAt ?? a.updatedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
  ));
  trendValues = computed(() => this.attemptHistory().slice().reverse().map(a => a.scorePercentage));

  masteryTrendLabels = computed(() => {
    const scores = this.masteryScores();
    if (scores.length === 0) return [];
    const allDates = scores.flatMap(s => (s.history ?? []).map(h => h.date));
    const unique = [...new Set(allDates)].sort();
    return unique.map(d => new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }));
  });

  masteryTrendDatasets = computed(() => {
    const scores = this.masteryScores();
    const outcomes = this.allOutcomes();
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

  totalAttempts = computed(() => this.attempts().length);
  avgMastery = computed(() => {
    const scores = this.masteryScores();
    if (scores.length === 0) return '-%';
    const total = scores.reduce((sum, s) => sum + s.score, 0);
    return Math.round(total / scores.length) + '%';
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

  private loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.facade.getAllOutcomes().pipe(
      catchError(() => of([] as LearningOutcome[])),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(outcomes => this.allOutcomes.set(outcomes));

    forkJoin({
      student: this.facade.getStudentInfo(this.studentId).pipe(catchError(() => of(undefined))),
      mastery: this.facade.getMasteryScores(this.studentId).pipe(catchError(() => of([] as MasteryScore[]))),
      attempts: this.facade.getAttempts(this.studentId).pipe(catchError(() => of([] as Attempt[]))),
      recs: this.facade.getRecommendations(this.studentId).pipe(catchError(() => of([] as Recommendation[]))),
      weak: this.facade.getWeakOutcomes(this.studentId).pipe(catchError(() => of([] as LearningOutcome[]))),
      strong: this.facade.getStrongOutcomes(this.studentId).pipe(catchError(() => of([] as LearningOutcome[])))
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (data) => {
        if (!data.student) {
          this.error.set('Öğrenci bulunamadı');
          return;
        }
        this.student.set(data.student);
        this.masteryScores.set(data.mastery);
        this.attempts.set(data.attempts);
        this.recommendations.set(data.recs);
        this.weakOutcomes.set(data.weak);
        this.strongOutcomes.set(data.strong);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Veri yüklenirken hata oluştu');
      }
    });
  }
}
