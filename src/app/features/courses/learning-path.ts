import { Component,  inject,  signal,  computed,  ChangeDetectorRef,  OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { CoursesFacade, LearningPathData } from './data-access/courses.facade';
import { ErrorStateComponent } from '@shared/components';
import { ContentFormat, MasteryLevel, UserRole, Difficulty } from '@core/models/enums';
import { RecommendationReasonCardComponent } from '@shared/components';
import { NotificationService } from '@core/observability/notification.service';
import { CurrentUserService } from '@core/auth/current-user.service';

const FORMAT_ICONS: Record<ContentFormat, string> = {
  [ContentFormat.VIDEO]: 'videocam',
  [ContentFormat.TEXT]: 'article',
  [ContentFormat.INTERACTIVE]: 'touch_app',
  [ContentFormat.QUIZ]: 'quiz'
};

const FORMAT_LABELS: Record<ContentFormat, string> = {
  [ContentFormat.VIDEO]: 'Video',
  [ContentFormat.TEXT]: 'Metin',
  [ContentFormat.INTERACTIVE]: 'Etkileşimli',
  [ContentFormat.QUIZ]: 'Test'
};

@Component({
  selector: 'app-learning-path',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatChipsModule, ErrorStateComponent, RecommendationReasonCardComponent],
  template: `
    <div class="space-y-4">
      @if (loading()) {
        <div class="flex justify-center py-8"><mat-spinner diameter="32" /></div>
      } @else if (error(); as err) {
        <app-error-state [message]="err" [retryable]="true" (retry)="loadData()" />
      } @else if (pd(); as p) {
        @if (isStudent() && !p.isEnrolled && p.enrollmentStatus !== 'approved' && p.enrollmentStatus !== 'completed') {
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center" role="alert">
            <mat-icon class="text-amber-500 text-4xl mb-2">lock</mat-icon>
            <p class="text-amber-800 font-medium mb-1">
              {{ p.enrollmentStatus === 'pending' ? 'Kayıt talebiniz onay bekliyor.' : 'Bu kursa kayıtlı değilsiniz.' }}
            </p>
            <p class="text-amber-700 text-sm mb-3">Kurs içeriğine erişmek için kayıt talebi gönderin veya yönetici onayını bekleyin.</p>
            <a routerLink="/courses" mat-stroked-button color="primary">Kurslara Dön</a>
          </div>
        } @else {
        <div class="flex items-center justify-between">
          <div>
            <a routerLink="/courses" class="text-sm text-gray-500 hover:text-blue-600 mb-1 inline-block">← Kurslara Dön</a>
            <h1 class="text-2xl font-bold text-gray-900">{{ p.course.title }} - Öğrenme Yolu</h1>
          </div>
        </div>

        <div class="lg:flex lg:gap-6">
        <div class="lg:flex-1 min-w-0">
        @if (p.contents.length === 0) {
          <div class="text-center p-8 text-gray-500">Bu kursa ait içerik bulunmamaktadır</div>
        } @else {
          <div class="space-y-3">
            @for (c of p.contents; track c.id) {
              <mat-card appearance="outlined" class="p-4">
                <div class="flex items-start gap-4">
                  <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                     {{ $index + 1 }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h3 class="text-base font-semibold text-gray-900">{{ c.title }}</h3>
                      <mat-icon class="text-gray-400 text-sm">{{ formatIcon(c.format) }}</mat-icon>
                      <span class="text-xs text-gray-500">{{ formatLabel(c.format) }}</span>
                      <span class="text-xs text-gray-400">&middot; {{ c.durationMinutes }} dk</span>
                      <span class="text-xs text-gray-400">&middot;</span>
                      <span class="text-xs font-medium"
                        [class.text-green-600]="c.difficulty === 'easy'"
                        [class.text-orange-600]="c.difficulty === 'medium'"
                        [class.text-red-600]="c.difficulty === 'hard'"
                        [class.text-gray-400]="!c.difficulty">{{ difficultyLabel(c.difficulty) }}</span>
                    </div>
                    <p class="text-sm text-gray-500 mt-1">{{ c.description }}</p>
                    <div class="flex items-center gap-2 mt-2">
                      @if (c.isLocked) {
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Kilitli</span>
                      } @else if (isDone(c.id)) {
                        @if (isMastered(c.id)) {
                          <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">✨ Uzmanlaşıldı</span>
                        } @else if (studyCount(c.id) > 0) {
                          <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ {{ studyCount(c.id) }} kez çalışıldı</span>
                        } @else {
                          <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Tamamlandı</span>
                        }
                      } @else if (p.recommendations.has(c.id)) {
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Önerilen</span>
                      }
                      @if (c.isRequired) {
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Zorunlu</span>
                      }
                    </div>
                  </div>
                  @if (isStudent() && !c.isLocked && c.status === 'active') {
                    <div class="flex-shrink-0">
                      @if (isDone(c.id)) {
                        <button mat-stroked-button color="primary" (click)="markStudied(c.id)">
                          <mat-icon>refresh</mat-icon> Tekrar Çalış
                        </button>
                      } @else {
                        <button mat-stroked-button color="primary" (click)="markStudied(c.id)">
                          <mat-icon>play_circle</mat-icon> Çalış
                        </button>
                      }
                    </div>
                  }
                </div>
                @if (isStudent() && p.recommendations.get(c.id); as rec) {
                  <div class="mt-3 pt-3 border-t border-gray-100">
                    <app-recommendation-reason-card
                      [recommendation]="rec"
                      [outcomeName]="getOutcomeName(c.outcomeIds[0])" />
                  </div>
                }
              </mat-card>
            }
          </div>

          @if (isStudent() && allRequiredStudied() && p.isEnrolled && p.enrollmentStatus !== 'completed') {
            <div class="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
              <span class="text-green-800 font-medium">Tüm zorunlu içerikler en az 1 kez çalışıldı. Kursu tamamlamak için aşağıdaki butonu kullanın.</span>
              <button mat-raised-button color="primary" (click)="finishCourse()">
                <mat-icon>school</mat-icon> Kursu Tamamla
              </button>
            </div>
          }
        }
        </div>

        @if (isStudent()) {
        <div class="lg:w-80 lg:flex-shrink-0 mt-4 lg:mt-0">
          <mat-card appearance="outlined" class="p-4">
            <h2 class="text-lg font-semibold text-gray-900 mb-3">Kazanım Ustalık Puanları</h2>
            <div class="grid grid-cols-1 gap-3">
              @for (ms of p.courseMasteryScores; track ms.outcomeId) {
                <div class="border rounded-lg p-3">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium text-gray-700">{{ getOutcomeName(ms.outcomeId) }}</span>
                    <span class="text-sm font-bold"
                      [class.text-green-600]="ms.score >= 70"
                      [class.text-yellow-600]="ms.score >= 40 && ms.score < 70"
                      [class.text-red-600]="ms.score < 40">
                      %{{ ms.score }}
                    </span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="h-full rounded-full transition-all"
                      [class.bg-green-500]="ms.score >= 70"
                      [class.bg-yellow-500]="ms.score >= 40 && ms.score < 70"
                      [class.bg-red-500]="ms.score < 40"
                      [style.width.%]="ms.score">
                    </div>
                  </div>
                  <span class="text-xs text-gray-500 mt-1 block">{{ masteryLabel(ms.masteryLevel) }}</span>
                </div>
              }
            </div>
          </mat-card>
        </div>
        }
        </div>
        }
      } @else {
        <div class="text-center p-8">
          <mat-icon class="text-4xl text-gray-400 mb-2">error</mat-icon>
          <p class="text-gray-500">Kurs bulunamadı</p>
          <a routerLink="/courses" class="text-blue-600 hover:underline mt-2 inline-block">Kurslara Dön</a>
        </div>
      }
    </div>
  `
})
export class LearningPathPage implements OnInit {
  private route = inject(ActivatedRoute);
  private facade = inject(CoursesFacade);
  private notification = inject(NotificationService);
  private currentUser = inject(CurrentUserService);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(true);
  error = signal<string | null>(null);
  pd = signal<LearningPathData | null>(null);

  isStudent = computed(() => this.currentUser.user().role === UserRole.STUDENT);

  ngOnInit() {
    this.loadData();
  }

  loadData(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('Geçersiz kurs ID');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.facade.getLearningPath(id).subscribe({
      next: data => {
        this.pd.set(data);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: err => {
        this.error.set(err.message || 'Kurs verisi yüklenirken hata oluştu');
        this.loading.set(false);
      }
    });
  }

  formatIcon(format: ContentFormat): string {
    return FORMAT_ICONS[format] || 'help';
  }

  formatLabel(format: ContentFormat): string {
    return FORMAT_LABELS[format] || '';
  }

  difficultyLabel(difficulty?: Difficulty): string {
    if (difficulty === Difficulty.EASY) return 'Kolay';
    if (difficulty === Difficulty.MEDIUM) return 'Orta';
    if (difficulty === Difficulty.HARD) return 'Zor';
    return '';
  }

  getOutcomeName(outcomeId: number | undefined): string | undefined {
    if (outcomeId == null) return undefined;
    return this.facade.getOutcomeName(outcomeId);
  }

  masteryLabel(level: MasteryLevel): string {
    const labels: Record<MasteryLevel, string> = {
      [MasteryLevel.NOSTUDYYET]: 'hiç çalışılmadı',
      [MasteryLevel.NOVICE]: 'başlangıç',
      [MasteryLevel.EMERGING]: 'gelişmekte',
      [MasteryLevel.PROFICIENT]: 'yeterli',
      [MasteryLevel.ADVANCED]: 'ileri',
    };
    return labels[level] || level;
  }

  isDone(contentId: number): boolean {
    const p = this.pd();
    return p ? p.completedContentIds.has(contentId) : false;
  }

  isMastered(contentId: number): boolean {
    const p = this.pd();
    if (!p) return false;
    const content = p.contents.find(c => c.id === contentId);
    if (!content || content.outcomeIds.length === 0) return false;
    return content.outcomeIds.every(oid => {
      const score = p.masteryScores.find(m => m.outcomeId === oid);
      return score && score.score >= 80;
    });
  }

  studyCount(contentId: number): number {
    const p = this.pd();
    return p ? p.studyCounts.get(contentId) ?? 0 : 0;
  }

  allRequiredStudied(): boolean {
    const p = this.pd();
    if (!p) return false;
    const required = p.contents.filter(c => c.isRequired && c.status === 'active');
    return required.length > 0 && required.every(c => this.isDone(c.id));
  }

  markStudied(contentId: number): void {
    if (!this.isStudent()) return;
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const p = this.pd();
    if (!p) return;

    const completedContentIds = new Set(p.completedContentIds);
    completedContentIds.add(contentId);
    const studyCounts = new Map(p.studyCounts);
    studyCounts.set(contentId, (studyCounts.get(contentId) ?? 0) + 1);
    this.pd.set({ ...p, completedContentIds, studyCounts });

    this.notification.show('İçerik çalışıldı ✓', 'success');

    this.facade.markContentStudied(id, contentId).subscribe(() => {
      const current = this.pd();
      if (!current) return;
      const courseMasteryScores = this.facade.getCourseMasteryScores(id);
      this.pd.set({ ...current, courseMasteryScores });
    });
  }

  finishCourse(): void {
    if (!this.isStudent()) return;
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.notification.show('Kurs tamamlandı ✓', 'success');

    this.facade.finishCourse(id).subscribe({
      next: () => this.loadData()
    });
  }
}