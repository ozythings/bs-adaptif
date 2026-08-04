import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AdaptivePlanFacade, WeeklyPlanData, ScheduledTask } from './adaptive-plan.facade';
import { CurrentUserService } from '@core/auth/current-user.service';
import { ErrorStateComponent, KpiCardComponent } from '@shared/components';
import { RecommendationReasonCardComponent } from '@shared/components/recommendation-reason-card/recommendation-reason-card.component';

@Component({
  selector: 'app-adaptive-plan-page',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatProgressBarModule,
    ErrorStateComponent, KpiCardComponent, RecommendationReasonCardComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="bg-white rounded-xl shadow-sm p-5 border-l-4 border-teal-500 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <mat-icon class="text-teal-600">event_note</mat-icon>
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900">Çalışma Planım</h1>
              <p class="text-sm text-gray-500">{{ userName() }} için uyarlanabilir haftalık plan</p>
            </div>
          </div>
          <button mat-stroked-button color="primary" (click)="loadData()">
            <mat-icon>refresh</mat-icon> Yenile
          </button>
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
        <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <app-kpi-card
            borderClass="border-emerald-500" iconBgClass="bg-emerald-100" iconColorClass="text-emerald-600"
            icon="psychology" label="Genel Başarım" [value]="info.totalMastery + '%'" />
          <app-kpi-card
            borderClass="border-blue-500" iconBgClass="bg-blue-100" iconColorClass="text-blue-600"
            icon="checklist" label="İçerik Tamamlama" [value]="info.completedContents + '/' + info.totalContents" />
          <app-kpi-card
            borderClass="border-purple-500" iconBgClass="bg-purple-100" iconColorClass="text-purple-600"
            icon="schedule" label="Planlanan Çalışma" [value]="info.studyHours.toFixed(1) + ' saat'" />
          <app-kpi-card
            borderClass="border-orange-500" iconBgClass="bg-orange-100" iconColorClass="text-orange-600"
            icon="quiz" label="Yaklaşan Sınav" [value]="info.upcomingExams.length" />
        </div>

        <!-- Weekly Plan + Recommendations -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Weekly Schedule -->
          <mat-card appearance="outlined" class="lg:col-span-2">
            <div class="p-5">
              <div class="flex items-center gap-2 mb-4">
                <mat-icon class="text-teal-600">date_range</mat-icon>
                <h2 class="text-lg font-semibold text-gray-900">Haftalık Program</h2>
              </div>
              @if (info.scheduledTasks.length === 0) {
                <p class="text-gray-500 text-sm py-4">Bu hafta için planlanmış çalışma bulunmuyor.</p>
              } @else {
                <div class="space-y-0">
                  @let grouped = groupByDay(info.scheduledTasks);
                  @for (day of dayLabels(); track day) {
                    <div class="border-b border-gray-100 py-3">
                      <div class="flex items-center gap-3 mb-2">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          [class.bg-teal-500]="grouped[day]?.length"
                          [class.text-white]="grouped[day]?.length"
                          [class.bg-gray-100]="!grouped[day]?.length"
                          [class.text-gray-400]="!grouped[day]?.length">
                          {{ day.substring(0, 3).toUpperCase() }}
                        </div>
                        <span class="font-medium text-gray-900">{{ day }}</span>
                        @if (!grouped[day]?.length) {
                          <span class="text-xs text-gray-400">- Dinlenme günü</span>
                        }
                      </div>
                      @if (grouped[day]?.length) {
                        <div class="ml-11 space-y-2">
                          @for (task of grouped[day]; track task.contentId) {
                            <div class="flex items-start gap-2 p-2 rounded-lg"
                              [class.bg-red-50]="task.priority === 'critical'"
                              [class.bg-yellow-50]="task.priority === 'high'"
                              [class.bg-blue-50]="task.priority === 'medium'"
                              [class.bg-gray-50]="task.priority === 'low'">
                              <mat-icon class="text-lg mt-0.5"
                                [class.text-red-600]="task.priority === 'critical'"
                                [class.text-yellow-600]="task.priority === 'high'"
                                [class.text-blue-600]="task.priority === 'medium'"
                                [class.text-gray-500]="task.priority === 'low'">
                                {{ task.priority === 'critical' ? 'priority_high' : task.priority === 'high' ? 'error' : 'checklist' }}
                              </mat-icon>
                              <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-gray-900 truncate">{{ task.contentTitle }}</p>
                                <p class="text-xs text-gray-500">{{ task.courseTitle }} &middot; {{ task.outcomeName }}</p>
                              </div>
                              <div class="text-right flex-shrink-0">
                                <span class="text-xs font-medium"
                                  [class.text-red-600]="task.priority === 'critical'"
                                  [class.text-yellow-600]="task.priority === 'high'"
                                  [class.text-blue-600]="task.priority === 'medium'"
                                  [class.text-gray-500]="task.priority === 'low'">
                                  {{ task.durationMinutes }}dk
                                </span>
                                <p class="text-xs text-gray-400">%{{ task.masteryScore }}</p>
                              </div>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </mat-card>

          <!-- Recommendations -->
          <mat-card appearance="outlined" class="lg:col-span-1">
            <div class="p-5">
              <div class="flex items-center gap-2 mb-4">
                <mat-icon class="text-amber-600">lightbulb</mat-icon>
                <h2 class="text-lg font-semibold text-gray-900">Öncelikli Öneriler</h2>
              </div>
              @if (info.recommendations.length === 0) {
                <p class="text-gray-500 text-sm py-4">Henüz öneri bulunmuyor.</p>
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
          </mat-card>
        </div>

        <!-- Courses Mastery -->
        @if (info.courses.length > 0) {
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-3">Kurs Başarım Durumu</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (course of info.courses; track course.courseId) {
                <mat-card appearance="outlined" class="hover:shadow-md transition-shadow">
                  <div class="p-4">
                    <h3 class="font-semibold text-gray-900 truncate mb-3">{{ course.courseTitle }}</h3>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs text-gray-500">Başarım</span>
                      <span class="text-xs font-medium"
                        [class.text-green-600]="course.avgMastery >= 80"
                        [class.text-blue-600]="course.avgMastery >= 60 && course.avgMastery < 80"
                        [class.text-yellow-600]="course.avgMastery >= 40 && course.avgMastery < 60"
                        [class.text-red-600]="course.avgMastery < 40">
                        %{{ course.avgMastery }}
                      </span>
                    </div>
                    <mat-progress-bar
                      [value]="course.avgMastery"
                      [color]="course.avgMastery >= 60 ? 'primary' : 'warn'"
                      class="mb-3 rounded-full">
                    </mat-progress-bar>
                    <div class="flex items-center justify-between text-xs text-gray-500">
                      <span>{{ course.masteredOutcomes }}/{{ course.totalOutcomes }} kazanım</span>
                      @if (course.weakOutcomeCount > 0) {
                        <span class="text-red-500">{{ course.weakOutcomeCount }} zayıf</span>
                      }
                    </div>
                  </div>
                </mat-card>
              }
            </div>
          </div>
        }

        <!-- Upcoming Exams -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <mat-card appearance="outlined" class="p-5">
            <div class="flex items-center gap-2 mb-4">
              <mat-icon class="text-orange-600">assignment</mat-icon>
              <h2 class="text-lg font-semibold text-gray-900">Yaklaşan Sınavlar</h2>
            </div>
            @if (info.upcomingExams.length === 0) {
              <div class="flex flex-col items-center py-8 text-center">
                <mat-icon class="text-gray-300 text-5xl mb-2">event_busy</mat-icon>
                <p class="text-gray-500 text-sm">Yaklaşan sınav bulunmuyor</p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (exam of info.upcomingExams; track exam.examId) {
                  <div class="flex items-center gap-3 p-3 rounded-lg border"
                    [class.bg-blue-50]="exam.availability === 'upcoming'"
                    [class.border-blue-200]="exam.availability === 'upcoming'"
                    [class.bg-amber-50]="exam.availability === 'active'"
                    [class.border-amber-200]="exam.availability === 'active'">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      [class.bg-blue-100]="exam.availability === 'upcoming'"
                      [class.bg-amber-100]="exam.availability === 'active'">
                      <mat-icon [class.text-blue-600]="exam.availability === 'upcoming'"
                        [class.text-amber-600]="exam.availability === 'active'">quiz</mat-icon>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ exam.title }}</p>
                      <p class="text-xs text-gray-500">{{ exam.courseTitle }}</p>
                    </div>
                    <div class="text-right flex-shrink-0">
                      @if (exam.availability === 'upcoming' && exam.startDate) {
                        <p class="text-xs font-medium text-blue-600">Yaklaşan Sınav · {{ formatDate(exam.startDate) }}</p>
                      } @else if (exam.availability === 'active' && exam.endDate) {
                        <p class="text-xs font-medium text-amber-600">Son Tarih · {{ formatDate(exam.endDate) }}</p>
                      }
                      <p class="text-xs text-gray-400">{{ exam.duration }}dk · Geçme: %{{ exam.passingScore }}</p>
                    </div>
                  </div>
                }
              </div>
            }
          </mat-card>

          <!-- Overall Progress -->
          <mat-card appearance="outlined" class="p-5">
            <div class="flex items-center gap-2 mb-4">
              <mat-icon class="text-green-600">trending_up</mat-icon>
              <h2 class="text-lg font-semibold text-gray-900">Genel İlerleme</h2>
            </div>
            <div class="flex flex-col items-center py-4">
              <div class="relative w-40 h-40 mb-4">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="68" fill="none" stroke="#e5e7eb" stroke-width="12" />
                  <circle cx="80" cy="80" r="68" fill="none"
                    [attr.stroke]="info.weeklyProgress >= 60 ? '#10b981' : info.weeklyProgress >= 30 ? '#f59e0b' : '#ef4444'"
                    stroke-width="12"
                    stroke-linecap="round"
                    [attr.stroke-dasharray]="2 * Math.PI * 68"
                    [attr.stroke-dashoffset]="2 * Math.PI * 68 * (1 - info.weeklyProgress / 100)" />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-3xl font-bold text-gray-900">%{{ info.weeklyProgress }}</span>
                  <span class="text-xs text-gray-500">Tamamlandı</span>
                </div>
              </div>
              <div class="w-full space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-600">İçerikler</span>
                  <span class="font-medium">{{ info.completedContents }}/{{ info.totalContents }}</span>
                </div>
                <mat-progress-bar
                  [value]="info.totalContents > 0 ? (info.completedContents / info.totalContents * 100) : 0"
                  color="primary"
                  class="rounded-full">
                </mat-progress-bar>
                <div class="flex items-center justify-between text-sm pt-2">
                  <span class="text-gray-600">Genel Başarım</span>
                  <span class="font-medium">%{{ info.totalMastery }}</span>
                </div>
                <mat-progress-bar
                  [value]="info.totalMastery"
                  [color]="info.totalMastery >= 60 ? 'primary' : 'warn'"
                  class="rounded-full">
                </mat-progress-bar>
              </div>
            </div>
          </mat-card>
        </div>
      }
    </div>
  `,
})
export class AdaptivePlanPage implements OnInit {
  protected facade = inject(AdaptivePlanFacade);
  protected currentUser = inject(CurrentUserService);
  protected readonly Math = Math;

  loading = signal(true);
  error = signal<string | null>(null);
  d = signal<WeeklyPlanData | null>(null);

  userName = computed(() => this.currentUser.user().name);

  dayLabels = computed(() => {
    return ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.facade.getWeeklyPlan().subscribe({
      next: info => {
        this.d.set(info);
        this.loading.set(false);
      },
      error: e => { this.error.set(e.message || 'Veri yüklenemedi'); this.loading.set(false); }
    });
  }

  groupByDay(tasks: ScheduledTask[]): Record<string, ScheduledTask[]> {
    const groups: Record<string, ScheduledTask[]> = {};
    for (const t of tasks) {
      if (!groups[t.day]) groups[t.day] = [];
      groups[t.day].push(t);
    }
    return groups;
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
