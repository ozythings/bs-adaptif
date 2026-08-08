import { Component, inject, signal, computed, effect, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { filter } from 'rxjs/operators';
import { StudentDashboardFacade } from '../student-dashboard/student-dashboard.facade';
import { CurrentUserService } from '@core/auth/current-user.service';
import { UserRole } from '@core/models/enums';
import { EventBusService } from '@core/state/event-bus.service';
import { ExamSession } from '@core/models/exam-session.model';
import { AuditLogEntry } from '@core/models/audit-log-entry.model';
import { ErrorStateComponent, KpiCardComponent } from '@shared/components';
import { DebounceDirective } from '@shared/directives';
import { ColumnChartComponent } from '@shared/components/column-chart/column-chart.component';
import { MasteryHeatmap } from '@shared/components/mastery-heatmap/mastery-heatmap.component';
import { MasteryScore } from '@core/models/mastery-score.model';
import { LearningOutcome } from '@core/models/learning-outcome.model';
import { EXAMS_SEED, COURSES_SEED } from '@core/data';
import type { StudentDashboardData } from '../student-dashboard/student-dashboard.model';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatProgressBarModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, DebounceDirective,
    ErrorStateComponent, ColumnChartComponent, MasteryHeatmap, KpiCardComponent
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
          <div class="flex items-center gap-3">
            @if (isStudent()) {
              <a [routerLink]="['/student', studentId(), 'analytics']" [queryParams]="{returnUrl: '/learning/dashboard'}" mat-stroked-button color="primary" class="!text-sm">
                <mat-icon>analytics</mat-icon> Analizlerim
              </a>
            }
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
            [clickable]="true" [expanded]="expandedKpi() === 'courses'" (click)="toggleDetail('courses')"
            borderClass="border-blue-500" iconBgClass="bg-blue-100" iconColorClass="text-blue-600"
            icon="school" label="Toplam Kurs" [value]="info.courseProgress.length" />
          <app-kpi-card
            [clickable]="true" [expanded]="expandedKpi() === 'enrollments'" (click)="toggleDetail('enrollments')"
            borderClass="border-green-500" iconBgClass="bg-green-100" iconColorClass="text-green-600"
            icon="how_to_reg" label="Aktif Kayıt" [value]="activeEnrollmentCount()" />
          @if (isStudent()) {
            <app-kpi-card
              [clickable]="true" [expanded]="expandedKpi() === 'completed'" (click)="toggleDetail('completed')"
              borderClass="border-purple-500" iconBgClass="bg-purple-100" iconColorClass="text-purple-600"
              icon="check_circle" label="Tamamlanan" [value]="info.completedContents" />
            <app-kpi-card
              [clickable]="true" [expanded]="expandedKpi() === 'exams'" (click)="toggleDetail('exams')"
              borderClass="border-orange-500" iconBgClass="bg-orange-100" iconColorClass="text-orange-600"
              icon="assignment" label="Sınavlar" [value]="info.totalAttempts" />
            <app-kpi-card
              [clickable]="true" [expanded]="expandedKpi() === 'avgScore'" (click)="toggleDetail('avgScore')"
              borderClass="border-teal-500" iconBgClass="bg-teal-100" iconColorClass="text-teal-600"
              icon="emoji_events" label="Ort. Sınav" [value]="info.avgExamScore + '%'" />
          }
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
              <input matInput [value]="kpiSearch()" [appDebounce]="300" (debouncedChange)="onKpiSearch($event)" placeholder="Kurs, sınav veya öğrenci ara...">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
            @switch (kpi) {
              @case ('courses') {
                <div class="space-y-2">
                  @for (cp of paginatedCourses(); track cp.courseId) {
                    <div class="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                      <span class="text-sm font-medium text-gray-900">{{ cp.courseTitle }}</span>
                      <span class="text-xs px-2 py-0.5 rounded-full"
                        [class.bg-green-100]="cp.status === 'completed'"
                        [class.text-green-700]="cp.status === 'completed'"
                        [class.bg-blue-100]="cp.status === 'approved'"
                        [class.text-blue-700]="cp.status === 'approved'"
                        [class.bg-yellow-100]="cp.status === 'pending'"
                        [class.text-yellow-700]="cp.status === 'pending'">
                        {{ cp.status === 'completed' ? 'Tamamlandı' : cp.status === 'approved' ? 'Aktif' : 'Beklemede' }}
                      </span>
                    </div>
                  }
                </div>
                @if (filteredCourses().length > 5) {
                  <mat-paginator [pageSize]="pageSize()" [pageSizeOptions]="[5, 10, 20]" [length]="panelLength()" [pageIndex]="pageIndex()" (page)="onPage($event)" showFirstLastButtons />
                }
              }
              @case ('enrollments') {
                @if (isStudent()) {
                  @if (filteredEnrolled().length === 0) {
                    <p class="text-gray-500 text-sm">Aktif kayıt bulunmuyor.</p>
                  } @else {
                    <div class="space-y-2">
                      @for (cp of paginatedEnrolled(); track cp.courseId) {
                        <div class="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                          <span class="text-sm font-medium text-gray-900">{{ cp.courseTitle }}</span>
                          <span class="text-sm text-green-600 font-medium">%{{ cp.progressPercent }}</span>
                        </div>
                      }
                    </div>
                    @if (filteredEnrolled().length > 5) {
                      <mat-paginator [pageSize]="pageSize()" [pageSizeOptions]="[5, 10, 20]" [length]="panelLength()" [pageIndex]="pageIndex()" (page)="onPage($event)" showFirstLastButtons />
                    }
                  }
                } @else {
                  @if (filteredAdminEnrollments().length === 0) {
                    <p class="text-gray-500 text-sm">Aktif kayıt bulunmuyor.</p>
                  } @else {
                    <div class="space-y-2">
                      @for (enroll of paginatedAdminEnrollments(); track $index) {
                        <div class="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 truncate">{{ enroll.studentName }}</p>
                            <p class="text-xs text-gray-500">{{ enroll.courseTitle }}</p>
                          </div>
                          <span class="text-xs px-2 py-0.5 rounded-full ml-3 flex-shrink-0"
                            [class.bg-green-100]="enroll.status === 'approved'"
                            [class.text-green-700]="enroll.status === 'approved'"
                            [class.bg-yellow-100]="enroll.status === 'pending'"
                            [class.text-yellow-700]="enroll.status === 'pending'">
                            {{ enroll.status === 'approved' ? 'Aktif' : 'Beklemede' }}
                          </span>
                        </div>
                      }
                    </div>
                    @if (filteredAdminEnrollments().length > 5) {
                      <mat-paginator [pageSize]="pageSize()" [pageSizeOptions]="[5, 10, 20]" [length]="panelLength()" [pageIndex]="pageIndex()" (page)="onPage($event)" showFirstLastButtons />
                    }
                  }
                }
              }
              @case ('completed') {
                @if (filteredCompleted().length === 0) {
                  <p class="text-gray-500 text-sm">Henüz içerik tamamlanmadı.</p>
                } @else {
                  <div class="space-y-2">
                    @for (cp of paginatedCompleted(); track cp.courseId) {
                      <div class="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                        <span class="text-sm font-medium text-gray-900">{{ cp.courseTitle }}</span>
                        <span class="text-sm text-purple-600 font-medium">{{ cp.completedContents }}/{{ cp.totalContents }} içerik</span>
                      </div>
                    }
                  </div>
                  @if (filteredCompleted().length > 5) {
                    <mat-paginator [pageSize]="pageSize()" [pageSizeOptions]="[5, 10, 20]" [length]="panelLength()" [pageIndex]="pageIndex()" (page)="onPage($event)" showFirstLastButtons />
                  }
                }
              }
              @case ('exams') {
                @if (filteredAttemptsForKpi().length === 0) {
                  <p class="text-gray-500 text-sm">Henüz sınav denemesi bulunmuyor.</p>
                } @else {
                  <div class="space-y-2">
                    @for (a of paginatedAttempts(); track a.id) {
                      <div class="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium text-gray-900 truncate">{{ examTitle(a.examId) }}</p>
                          <p class="text-xs text-gray-500">{{ courseName(a.examId) }}</p>
                        </div>
                        <span class="text-sm font-medium ml-3"
                          [class.text-green-600]="a.scorePercentage >= 50"
                          [class.text-red-600]="a.scorePercentage < 50">
                          %{{ a.scorePercentage }}
                        </span>
                      </div>
                    }
                  </div>
                  @if (filteredAttemptsForKpi().length > 5) {
                    <mat-paginator [pageSize]="pageSize()" [pageSizeOptions]="[5, 10, 20]" [length]="panelLength()" [pageIndex]="pageIndex()" (page)="onPage($event)" showFirstLastButtons />
                  }
                }
              }
              @case ('avgScore') {
                @if (filteredAttemptsForKpi().length === 0) {
                  <p class="text-gray-500 text-sm">Henüz sınav sonucu bulunmuyor.</p>
                } @else {
                  <div class="space-y-2">
                    @for (a of paginatedAttempts(); track a.id) {
                      <div class="flex items-center gap-3 p-2 bg-teal-50 rounded-lg">
                        <span class="text-sm text-gray-900 flex-1 truncate">{{ examTitle(a.examId) }}</span>
                        <div class="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div class="h-full rounded-full"
                            [style.width.%]="a.scorePercentage"
                            [class.bg-green-500]="a.scorePercentage >= 70"
                            [class.bg-orange-500]="a.scorePercentage >= 40 && a.scorePercentage < 70"
                            [class.bg-red-500]="a.scorePercentage < 40">
                          </div>
                        </div>
                        <span class="text-sm font-medium w-12 text-right"
                          [class.text-green-600]="a.scorePercentage >= 70"
                          [class.text-orange-600]="a.scorePercentage >= 40 && a.scorePercentage < 70"
                          [class.text-red-600]="a.scorePercentage < 40">
                          %{{ a.scorePercentage }}
                        </span>
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

        <!-- Exam Results + Active Sessions -->
        @if (isStudent()) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <mat-card appearance="outlined" class="p-5">
            <button type="button" class="w-full flex items-center gap-2 mb-4 text-left" (click)="expandedExamResults.set(!expandedExamResults())">
              <mat-icon class="text-gray-500 text-sm transition-transform" [style.transform]="expandedExamResults() ? 'rotate(90deg)' : 'none'">chevron_right</mat-icon>
              <h2 class="text-lg font-semibold text-gray-900">Sınav Sonuçlarım</h2>
            </button>
            @if (expandedExamResults()) {
            @if (info.examAttempts.length === 0) {
              <p class="text-gray-500 text-sm">Henüz sınav sonucunuz bulunmuyor</p>
            } @else {
              <div class="space-y-3">
                @for (a of info.examAttempts; track a.id) {
                  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ examTitle(a.examId) }}</p>
                      <p class="text-xs text-gray-500">{{ courseName(a.examId) }}</p>
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
            }
          </mat-card>

          <mat-card appearance="outlined" class="p-5">
            <button type="button" class="w-full flex items-center gap-2 mb-4 text-left" (click)="expandedActiveSessions.set(!expandedActiveSessions())">
              <mat-icon class="text-gray-500 text-sm transition-transform" [style.transform]="expandedActiveSessions() ? 'rotate(90deg)' : 'none'">chevron_right</mat-icon>
              <h2 class="text-lg font-semibold text-gray-900">Aktif Oturumlar</h2>
            </button>
            @if (expandedActiveSessions()) {
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
            }
          </mat-card>
        </div>
        }

        <!-- Charts Row -->
        @defer (on viewport) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          @if (isStudent() && info.courseProgress.length > 0) {
            <mat-card appearance="outlined" class="p-5">
              <button type="button" class="w-full flex items-center gap-2 mb-4 text-left" (click)="expandedContentCompletion.set(!expandedContentCompletion())">
                <mat-icon class="text-gray-500 text-sm transition-transform" [style.transform]="expandedContentCompletion() ? 'rotate(90deg)' : 'none'">chevron_right</mat-icon>
                <h2 class="text-lg font-semibold text-gray-900">İçerik Tamamlama</h2>
              </button>
              @if (expandedContentCompletion()) {
              <div class="h-64">
                <app-column-chart
                  [labels]="progressLabels()"
                  [values]="progressValues()"
                  title="Tamamlanan"
                  [colors]="['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']" />
              </div>
              }
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

        <!-- Mastery Heatmap -->
        @if (isStudent()) {
        <div class="grid grid-cols-1 gap-6">
          <mat-card appearance="outlined" class="p-5">
            <div class="flex items-center justify-between mb-4">
              <button type="button" class="flex items-center gap-2 text-left" (click)="expandedHeatmap.set(!expandedHeatmap())">
                <mat-icon class="text-gray-500 text-sm transition-transform" [style.transform]="expandedHeatmap() ? 'rotate(90deg)' : 'none'">chevron_right</mat-icon>
                <h2 class="text-lg font-semibold text-gray-900">Kazanım Haritası</h2>
              </button>
              <select
                [value]="selectedCourseId()"
                (change)="onHeatmapCourseChange(+($any($event.target).value))"
                class="border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="0">Tümü</option>
                @for (c of heatmapCourses(); track c.courseId) {
                  <option [value]="c.courseId">{{ c.courseTitle }}</option>
                }
              </select>
            </div>
            @if (expandedHeatmap()) {
            <app-mastery-heatmap
              [scores]="filteredMasteryScores()"
              [outcomes]="filteredOutcomes()" />
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

        <!-- son aktiviteler -->
        @if (!isStudent()) {
          <mat-card appearance="outlined" class="p-5">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Son Aktiviteler</h2>
          @if (recentAuditLogs().length === 0) {
            <p class="text-gray-500 text-sm">Henüz aktivite kaydı yok</p>
          } @else {
            <div class="space-y-2">
              @for (log of recentAuditLogs(); track log.id) {
                <div class="flex items-center gap-3 py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div class="w-2 h-2 rounded-full flex-shrink-0"
                    [class.bg-green-400]="log.action === 'create'"
                    [class.bg-blue-400]="log.action === 'view'"
                    [class.bg-yellow-400]="log.action === 'update'"
                    [class.bg-red-400]="log.action === 'delete'"
                    [class.bg-gray-400]="log.action !== 'create' && log.action !== 'view' && log.action !== 'update' && log.action !== 'delete'">
                  </div>
                  <span class="text-sm text-gray-600 flex-1">{{ log.description }}</span>
                  <span class="text-xs text-gray-400 flex-shrink-0">{{ log.user }}</span>
                  <span class="text-xs text-gray-400 flex-shrink-0">{{ formatTimestamp(log.timestamp) }}</span>
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
  protected facade = inject(StudentDashboardFacade);
  protected currentUser = inject(CurrentUserService);
  private eventBus = inject(EventBusService);
  private router = inject(Router);

  loading = signal(true);
  error = signal<string | null>(null);
  d = signal<StudentDashboardData | null>(null);
  expandedKpi = signal<string | null>(null);
  expandedExamResults = signal(true);
  expandedActiveSessions = signal(true);
  expandedContentCompletion = signal(true);
  expandedHeatmap = signal(true);
  kpiSearch = signal('');
  pageSize = signal(5);
  pageIndex = signal(0);
  currentDate = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

  private destroyRef = inject(DestroyRef);

  activeSessions = signal<ExamSession[]>([]);
  allActiveSessions = signal<{ token: string; examId: number; examTitle: string; studentName: string; timeRemainingSeconds: number; serverTimeReference: string; durationMinutes: number }[]>([]);
  recentAuditLogs = signal<AuditLogEntry[]>([]);
  masteryScores = signal<MasteryScore[]>([]);
  outcomes = signal<LearningOutcome[]>([]);
  selectedCourseId = signal(0);

  heatmapCourses = computed(() => this.d()?.courseProgress ?? []);

  filteredOutcomes = computed(() => {
    const cid = this.selectedCourseId();
    if (cid === 0) return this.outcomes();
    return this.outcomes().filter(o => o.courseId === cid);
  });

  filteredMasteryScores = computed(() => {
    const cid = this.selectedCourseId();
    if (cid === 0) return this.masteryScores();
    const outcomeIds = new Set(this.outcomes().filter(o => o.courseId === cid).map(o => o.id));
    return this.masteryScores().filter(s => outcomeIds.has(s.outcomeId));
  });

  userName = computed(() => this.currentUser.user().name);
  roleLabel = computed(() => {
    const u = this.currentUser.user();
    if (u.role === UserRole.STUDENT) return 'Öğrenci';
    if (u.role === UserRole.INSTRUCTOR) return 'Eğitmen';
    if (u.role === UserRole.PLATFORM_ADMIN) return 'Yönetici';
    return 'Kullanıcı';
  });

  activeEnrollmentCount = computed(() => {
    const info = this.d();
    if (!info) return 0;
    return info.courseProgress.filter(cp => cp.status === 'approved').length;
  });

  filteredCourses = computed(() => {
    const all = this.d()?.courseProgress ?? [];
    const search = this.kpiSearch().toLowerCase();
    if (!search) return all;
    return all.filter(cp => cp.courseTitle.toLowerCase().includes(search));
  });
  filteredEnrolled = computed(() => {
    const search = this.kpiSearch().toLowerCase();
    const list = this.filteredCourses().filter(c => c.status === 'approved');
    if (!search) return list;
    return list;
  });
  filteredCompleted = computed(() => {
    const list = this.filteredCourses().filter(c => c.completedContents > 0);
    return list;
  });
  filteredAdminEnrollments = computed(() => {
    const all = this.d()?.adminEnrollments ?? [];
    const search = this.kpiSearch().toLowerCase();
    if (!search) return all;
    return all.filter(e =>
      e.studentName.toLowerCase().includes(search) ||
      e.courseTitle.toLowerCase().includes(search)
    );
  });

  filteredAttemptsForKpi = computed(() => {
    const info = this.d();
    if (!info) return [];
    const search = this.kpiSearch().toLowerCase();
    if (!search) return info.examAttempts;
    return info.examAttempts.filter(a =>
      this.examTitle(a.examId).toLowerCase().includes(search) ||
      this.courseName(a.examId).toLowerCase().includes(search)
    );
  });

  paginatedCourses = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredCourses().slice(start, start + this.pageSize());
  });
  paginatedEnrolled = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredEnrolled().slice(start, start + this.pageSize());
  });
  paginatedCompleted = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredCompleted().slice(start, start + this.pageSize());
  });
  paginatedAdminEnrollments = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredAdminEnrollments().slice(start, start + this.pageSize());
  });
  paginatedAttempts = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredAttemptsForKpi().slice(start, start + this.pageSize());
  });
  panelLength = computed(() => {
    const kpi = this.expandedKpi();
    if (!kpi) return 0;
    if (kpi === 'courses') return this.filteredCourses().length;
    if (kpi === 'enrollments') return this.isStudent()
      ? this.filteredEnrolled().length
      : this.filteredAdminEnrollments().length;
    if (kpi === 'completed') return this.filteredCompleted().length;
    return this.filteredAttemptsForKpi().length;
  });

  progressLabels = computed(() => this.d()?.courseProgress.map(cp =>
    cp.courseTitle.length > 12 ? cp.courseTitle.substring(0, 12) + '…' : cp.courseTitle
  ) ?? []);
  progressValues = computed(() => this.d()?.courseProgress.map(cp => cp.completedContents) ?? []);

  isStudent = computed(() => this.currentUser.user().role === UserRole.STUDENT);
  studentId = computed(() => this.currentUser.user().studentId);

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

  kpiTitle(key: string): string {
    const titles: Record<string, string> = {
      courses: 'Kurs Listesi',
      enrollments: 'Aktif Kayıtlar',
      completed: 'Tamamlanan İçerikler',
      exams: 'Sınav Sonuçları',
      avgScore: 'Sınav Puan Dökümü',
    };
    return titles[key] ?? '';
  }

  ngOnInit() {
    this.loadData();

    this.eventBus.ofType<any>('audit').pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(e => {
      if (e?.entry) {
        this.recentAuditLogs.update(list => [e.entry, ...list].slice(0, 5));
      }
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

  formatTimestamp(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) + ' ' +
           d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.facade.getDashboard().subscribe({
      next: info => {
        this.d.set(info);
        this.activeSessions.set(this.facade.getActiveSessions());
        this.allActiveSessions.set(this.facade.getAllActiveSessions());
        this.masteryScores.set(info.masteryScores);
        this.outcomes.set(info.outcomes);
        this.recentAuditLogs.set(this.facade.getRecentAuditLogs(5));

        this.loading.set(false);
      },
      error: e => { this.error.set(e.message || 'Veri yüklenemedi'); this.loading.set(false); }
    });
  }

  onHeatmapCourseChange(courseId: number): void {
    this.selectedCourseId.set(courseId);
  }

  examTitle(examId: number): string {
    return EXAMS_SEED.find(e => e.id === examId)?.title ?? `Sınav #${examId}`;
  }

  courseName(examId: number): string {
    const exam = EXAMS_SEED.find(e => e.id === examId);
    if (!exam) return '';
    return COURSES_SEED.find(c => c.id === exam.courseId)?.title ?? '';
  }
}
