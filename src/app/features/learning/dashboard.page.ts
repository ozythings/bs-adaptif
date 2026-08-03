import { Component,  inject,  signal,  computed,  OnInit,  DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { filter } from 'rxjs/operators';
import { LearningFacade, DashboardData } from './data-access/learning.facade';
import { CurrentUserService } from '@core/auth/current-user.service';
import { UserRole } from '@core/models/enums';
import { EventBusService } from '@core/state/event-bus.service';
import { ExamSession } from '@core/models/exam-session.model';
import { Recommendation } from '@core/models/recommendation.model';
import { ActivityEvent } from '@core/realtime/activity-stream.service';
import { RecommendationReasonCardComponent, ErrorStateComponent, KpiCardComponent } from '@shared/components';
import { ColumnChartComponent } from '@shared/components/column-chart/column-chart.component';
import { MasteryHeatmap } from '@shared/components/mastery-heatmap/mastery-heatmap.component';
import { MasteryScore } from '@core/models/mastery-score.model';
import { LearningOutcome } from '@core/models/learning-outcome.model';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatProgressBarModule,
    RecommendationReasonCardComponent, ErrorStateComponent, ColumnChartComponent, MasteryHeatmap, KpiCardComponent
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="bg-white rounded-xl shadow-sm p-5 border-l-4 border-teal-500 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <mat-icon class="text-teal-600">waving_hand</mat-icon>
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900">Merhaba, {{ userName() }}!</h1>
              <p class="text-sm text-gray-500">{{ roleLabel() }}</p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-sm text-gray-500">{{ currentDate }}</span>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <mat-spinner diameter="40" />
        </div>
      } @else if (error(); as err) {
        <app-error-state [title]="'Veri Yüklenemedi'" [message]="err" [retryable]="true" (retry)="loadData()" />
      } @else if (d(); as info) {
        <!-- KPI Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-5 gap-4"
          [class.xl:grid-cols-5]="isStudent()">
          <app-kpi-card
            borderClass="border-blue-500" iconBgClass="bg-blue-100" iconColorClass="text-blue-600"
            icon="school" label="Toplam Kurs" [value]="info.totalCourses" />
          <app-kpi-card
            borderClass="border-green-500" iconBgClass="bg-green-100" iconColorClass="text-green-600"
            icon="how_to_reg" label="Aktif Kayıt" [value]="info.activeEnrollments" />
          @if (isStudent()) {
            <app-kpi-card
              borderClass="border-purple-500" iconBgClass="bg-purple-100" iconColorClass="text-purple-600"
              icon="check_circle" label="Tamamlanan" [value]="info.completedContents" />
            <app-kpi-card
              borderClass="border-orange-500" iconBgClass="bg-orange-100" iconColorClass="text-orange-600"
              icon="assignment" label="Sınavlar" [value]="info.totalAttempts" />
            <app-kpi-card
              borderClass="border-teal-500" iconBgClass="bg-teal-100" iconColorClass="text-teal-600"
              icon="emoji_events" label="Ort. Sınav" [value]="info.avgExamScore + '%'" />
          }
        </div>

        <!-- Charts Row -->
        @defer (on viewport) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- @if (info.masteryByOutcome.length > 0) {
            <mat-card appearance="outlined" class="p-5">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Kazanım Puanları</h2>
              <div class="h-64">
                <app-column-chart
                  [labels]="masteryLabels()"
                  [values]="masteryValues()"
                  title="Puan"
                  [colors]="masteryColors()" />
              </div>
            </mat-card>
          } -->
          @if (isStudent() && info.courseProgress.length > 0) {
            <mat-card appearance="outlined" class="p-5">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">İçerik Tamamlama</h2>
              <div class="h-64">
                <app-column-chart
                  [labels]="progressLabels()"
                  [values]="progressValues()"
                  title="Tamamlanan"
                  [colors]="['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']" />
              </div>
            </mat-card>
          }
        </div>
        } @placeholder {
          <div class="h-72 bg-gray-100 rounded-xl animate-pulse"></div>
        }

        <!-- Course Progress Cards -->
        @if (isStudent() && info.courseProgress.length > 0) {
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-3">Kurs İlerlemem</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (cp of info.courseProgress; track cp.courseId) {
                <mat-card appearance="outlined" class="hover:shadow-md transition-shadow">
                  <div class="p-4">
                    <div class="flex items-center justify-between mb-2">
                      <h3 class="font-semibold text-gray-900 truncate">{{ cp.courseTitle }}</h3>
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                        [class.bg-green-100]="cp.status === 'completed'"
                        [class.text-green-700]="cp.status === 'completed'"
                        [class.bg-blue-100]="cp.status === 'approved'"
                        [class.text-blue-700]="cp.status === 'approved'"
                        [class.bg-yellow-100]="cp.status === 'pending'"
                        [class.text-yellow-700]="cp.status === 'pending'">
                        {{ cp.status === 'completed' ? 'Tamamlandı' : cp.status === 'approved' ? 'Aktif' : 'Beklemede' }}
                      </span>
                    </div>
                    <p class="text-sm text-gray-500 mb-3">{{ cp.instructorName }}</p>
                    <mat-progress-bar
                      [value]="cp.progressPercent"
                      color="primary"
                      class="mb-2 rounded-full">
                    </mat-progress-bar>
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-gray-500">{{ cp.completedContents }}/{{ cp.totalContents }} içerik</span>
                      <span class="text-xs font-medium text-gray-700">%{{ cp.progressPercent }}</span>
                    </div>
                    <div class="mt-3">
                      <a [routerLink]="['/courses', cp.courseId, 'path']" mat-stroked-button color="primary" class="w-full text-center">
                        <mat-icon>play_arrow</mat-icon> Devam Et
                      </a>
                    </div>
                  </div>
                </mat-card>
              }
            </div>
          </div>
        }

        <!-- Mastery Heatmap + Recommendations -->
        @if (isStudent()) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <mat-card appearance="outlined" class="p-5" [class.lg:col-span-2]="recommendations().length === 0">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Kazanım Haritası</h2>
            <app-mastery-heatmap
              [scores]="masteryScores()"
              [outcomes]="outcomes()" />
          </mat-card>

          @if (recommendations().length > 0) {
            <mat-card appearance="outlined" class="p-5">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Önerilen Çalışmalar</h2>
              <div class="flex flex-col gap-4">
                @for (rec of recommendations(); track rec.contentId + '-' + rec.outcomeId) {
                  <app-recommendation-reason-card
                    [recommendation]="rec"
                    [outcomeName]="getOutcomeName(rec.outcomeId)"
                    [courseName]="getCourseName(rec.outcomeId)" />
                }
              </div>
            </mat-card>
          }
        </div>
        }

        <!-- Exam Results + Active Sessions -->
        @if (isStudent()) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <mat-card appearance="outlined" class="p-5">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Sınav Sonuçlarım</h2>
            @if (info.examAttempts.length === 0) {
              <p class="text-gray-500 text-sm">Henüz sınav sonucunuz bulunmuyor</p>
            } @else {
              <div class="space-y-3">
                @for (a of info.examAttempts; track a.attemptId) {
                  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ a.examTitle }}</p>
                      <p class="text-xs text-gray-500">{{ a.courseName }}</p>
                    </div>
                    <div class="flex items-center gap-3 ml-3">
                      <div class="text-right">
                        <span class="text-lg font-bold"
                          [attr.aria-label]="(a.scorePercentage >= 70 ? 'Başarılı' : a.scorePercentage >= 40 ? 'Geliştirilebilir' : 'Başarısız') + ': %' + a.scorePercentage"
                          [class.text-green-600]="a.scorePercentage >= 70"
                          [class.text-orange-600]="a.scorePercentage >= 40 && a.scorePercentage < 70"
                          [class.text-red-600]="a.scorePercentage < 40">
                          %{{ a.scorePercentage }}
                        </span>
                        <p class="text-xs text-gray-400">{{ a.totalScore }}/{{ a.maxScore }}</p>
                      </div>
                      <mat-icon class="text-xl"
                        [class.text-green-600]="a.scorePercentage >= 70"
                        [class.text-orange-600]="a.scorePercentage >= 40 && a.scorePercentage < 70"
                        [class.text-red-600]="a.scorePercentage < 40">
                        {{ a.scorePercentage >= 70 ? 'check_circle' : a.scorePercentage >= 40 ? 'warning' : 'cancel' }}
                      </mat-icon>
                    </div>
                  </div>
                }
              </div>
            }
          </mat-card>

          <mat-card appearance="outlined" class="p-5">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Aktif Oturumlar</h2>
            @if (activeSessions().length === 0) {
              <p class="text-gray-500 text-sm">Aktif sınav oturumunuz bulunmuyor</p>
            } @else {
              <div class="space-y-3">
                @for (s of activeSessions(); track s.token) {
                  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <mat-icon class="text-blue-600">timer</mat-icon>
                      </div>
                      <div>
                        <p class="text-sm font-medium text-gray-900">Sınav #{{ s.examId }}</p>
                        <p class="text-xs text-gray-500">Kalan: {{ getRemaining(s) }}</p>
                      </div>
                    </div>
                    <a [routerLink]="['/exam-session', s.token]" mat-stroked-button color="primary" class="!text-xs">
                      <mat-icon>play_arrow</mat-icon> Devam Et
                    </a>
                  </div>
                }
              </div>
            }
          </mat-card>
        </div>
        }

        <!-- Active Sessions (tüm öğrenciler - eğitmen/yönetici) -->
        @if (!isStudent()) {
          <mat-card appearance="outlined" class="p-5">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Aktif Sınav Oturumları</h2>
            @if (allActiveSessions().length === 0) {
              <p class="text-gray-500 text-sm">Şu anda aktif sınav oturumu bulunmuyor</p>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b text-left text-gray-500 text-xs">
                      <th class="py-2 pr-3">Öğrenci</th>
                      <th class="py-2 pr-3">Sınav</th>
                      <th class="py-2 pr-3">Kalan Süre</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (s of allActiveSessions(); track s.token) {
                      <tr class="border-b border-gray-100">
                        <td class="py-2 pr-3 font-medium text-gray-900">{{ s.studentName }}</td>
                        <td class="py-2 pr-3 text-gray-700">{{ s.examTitle }}</td>
                        <td class="py-2 pr-3 text-gray-500">{{ getRemaining(s) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </mat-card>
        }

        <!-- Activity Stream (sadece eğitmen/yöneticiler) -->
        @if (!isStudent()) {
          <mat-card appearance="outlined" class="p-5">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Aktivite Akışı</h2>
          @if (recentEvents().length === 0) {
            <p class="text-gray-500 text-sm">Henüz aktivite yok</p>
          } @else {
            <div class="space-y-2">
              @for (event of recentEvents(); track event.timestamp) {
                <div class="flex items-center gap-3 py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div class="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0"></div>
                  <span class="text-sm text-gray-600 flex-1">{{ event.message }}</span>
                  <span class="text-xs text-gray-400 flex-shrink-0">{{ event.timestamp | date:'HH:mm' }}</span>
                </div>
              }
            </div>
          }
          </mat-card>
        }
      }
    </div>
  `
})
export class DashboardPage implements OnInit {
  private facade = inject(LearningFacade);
  protected currentUser = inject(CurrentUserService);
  private eventBus = inject(EventBusService);
  private router = inject(Router);

  loading = signal(true);
  error = signal<string | null>(null);
  d = signal<DashboardData | null>(null);
  currentDate = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

  private destroyRef = inject(DestroyRef);

  recommendations = signal<Recommendation[]>([]);
  activeSessions = signal<ExamSession[]>([]);
  allActiveSessions = signal<{ token: string; examId: number; examTitle: string; studentName: string; timeRemainingSeconds: number; serverTimeReference: string; durationMinutes: number }[]>([]);
  recentEvents = signal<ActivityEvent[]>([]);
  masteryScores = signal<MasteryScore[]>([]);
  outcomes = signal<LearningOutcome[]>([]);

  userName = computed(() => this.currentUser.user().name.split(' ')[0]);
  roleLabel = computed(() => {
    const u = this.currentUser.user();
    if (u.role === UserRole.STUDENT) return 'Öğrenci';
    if (u.role === UserRole.INSTRUCTOR) return 'Eğitmen';
    if (u.role === UserRole.PLATFORM_ADMIN) return 'Yönetici';
    return 'Kullanıcı';
  });

  progressLabels = computed(() => this.d()?.courseProgress.map(cp =>
    cp.courseTitle.length > 12 ? cp.courseTitle.substring(0, 12) + '…' : cp.courseTitle
  ) ?? []);
  progressValues = computed(() => this.d()?.courseProgress.map(cp => cp.completedContents) ?? []);

  isStudent = computed(() => this.currentUser.user().role === UserRole.STUDENT);

  ngOnInit() {
    this.loadData();
    this.facade.getActivityStream().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(e => {
      this.recentEvents.update(list => [e, ...list].slice(0, 10));
    });
    this.eventBus.ofType<any>('audit').pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(e => {
      this.recentEvents.update(list => [{
        type: 'activity',
        message: e?.entry?.description ?? '',
        timestamp: new Date()
      }, ...list].slice(0, 10));
    });

    if (!this.isStudent()) {
      interval(1000).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(() => {
        this.allActiveSessions.set(this.facade.getAllActiveSessions());
      });
    } else {
      interval(1000).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(() => {
        this.activeSessions.set(this.facade.getActiveSessions());
      });
    }

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.allActiveSessions.set(this.facade.getAllActiveSessions());
    });
  }

  getRemaining(s: { serverTimeReference: string; durationMinutes: number }): string {
    const startMs = new Date(s.serverTimeReference).getTime();
    const elapsed = isNaN(startMs) ? 0 : Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    const remaining = Math.max(0, s.durationMinutes * 60 - elapsed);
    const m = Math.floor(remaining / 60);
    const sec = String(remaining % 60).padStart(2, '0');
    return `${String(m).padStart(2, '0')}:${sec}`;
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.facade.getDashboardData().subscribe({
      next: info => {
        this.d.set(info);
        this.activeSessions.set(this.facade.getActiveSessions());
        this.allActiveSessions.set(this.facade.getAllActiveSessions());
        this.recommendations.set(this.facade.getRecommendations());
        this.masteryScores.set(this.facade.getAllMasteryScores());
        this.outcomes.set(this.facade.getAllOutcomes());

        this.loading.set(false);
      },
      error: e => { this.error.set(e.message || 'Veri yüklenemedi'); this.loading.set(false); }
    });
  }

  getOutcomeName(outcomeId: number): string {
    return this.facade.getOutcomeName(outcomeId);
  }

  getCourseName(outcomeId: number): string {
    return this.facade.getCourseNameByOutcome(outcomeId);
  }
}
