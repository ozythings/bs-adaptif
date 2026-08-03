import { Component,  inject,  signal,  computed,  OnInit,  DestroyRef,  ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { fromEvent } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { SessionFacade } from './data-access/session.facade';
import { DraftStore } from '@core/storage/draft-store.service';
import { QuestionType } from '@core/models/enums';
import { ExamSession } from '@core/models/exam-session.model';
import { ExamTimerComponent } from '@shared/components/exam-timer/exam-timer.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { AutosaveIndicatorComponent } from '@shared/components/autosave-indicator/autosave-indicator.component';

@Component({
  selector: 'app-exam-session',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatButtonModule,
    MatIconModule, MatRadioModule, MatCheckboxModule, MatProgressSpinnerModule,
    MatDividerModule, MatTooltipModule, MatDialogModule, ExamTimerComponent, AutosaveIndicatorComponent
  ],
  template: `
    <div class="max-w-4xl mx-auto">
      @if (!session() && !error()) {
        <div class="flex justify-center py-12">
          <mat-spinner diameter="40" />
        </div>
      } @else if (error()) {
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert">
          <mat-icon class="text-red-500 text-4xl mb-2">error_outline</mat-icon>
          <p class="text-red-700">{{ error() }}</p>
        </div>
      } @else if (submitted()) {
        <div class="bg-green-50 border border-green-200 rounded-lg p-8 text-center" role="status">
          <mat-icon class="text-green-500 text-5xl mb-3">check_circle</mat-icon>
          <h2 class="text-xl font-bold text-gray-900 mb-2">Sınav Başarıyla Gönderildi</h2>
          <p class="text-gray-600 mb-4">Cevaplarınız kaydedildi.</p>
          <button mat-raised-button color="primary" routerLink="/learning/dashboard">Dashboard'a Dön</button>
        </div>
      } @else {
        <div class="bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <span class="font-semibold">Sınav #{{ session()?.examId }}</span>
            <span class="text-sm text-gray-500">Soru {{ currentIndex() + 1 }}/{{ totalQuestions() }}</span>
          </div>
          <div class="flex items-center gap-4">
            <span class="sr-only" role="status" aria-live="polite">{{ saveStatus() === 'conflict' ? 'Çakışma tespit edildi' : '' }}</span>
            <app-autosave-indicator [status]="saveStatus()" />
            <app-exam-timer [serverTimeReference]="session()?.serverTimeReference ?? ''" [durationMinutes]="session()?.durationMinutes ?? 0" (timeUp)="onTimeUp()" />
            <button mat-icon-button (click)="toggleSimulateOffline()" matTooltip="Bağlantıyı Simüle Et" [attr.aria-label]="connectionStatus() === 'offline' ? 'Çevrimiçi ol' : 'Çevrimdışı simüle et'">
              <mat-icon>{{ connectionStatus() === 'offline' ? 'wifi_off' : 'wifi' }}</mat-icon>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2" aria-live="polite" aria-atomic="true">
            @if (currentQuestion(); as q) {
              <div class="bg-white rounded-lg shadow-sm p-6" tabindex="-1" #questionPanel>
                <div class="flex items-start justify-between mb-4">
                  <div>
                    <span class="text-sm text-gray-500">Soru {{ currentIndex() + 1 }}</span>
                    <span class="text-sm text-gray-500 ml-2">({{ q.difficulty }})</span>
                  </div>
                  <div class="flex gap-1">
                    <button mat-icon-button (click)="toggleMark(q.id)" [class.text-yellow-500]="isMarked(q.id)" [attr.aria-label]="(isMarked(q.id) ? 'İşaretli soru' : 'Soruyu işaretle') + ' ' + (currentIndex() + 1)">
                      <mat-icon>{{ isMarked(q.id) ? 'flag' : 'flag_outline' }}</mat-icon>
                    </button>
                  </div>
                </div>

                <p class="text-lg mb-6">{{ q.questionText }}</p>

                @if (conflictQuestionId() === q.id) {
                  <div class="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4" role="alert">
                    <div class="flex items-start gap-3">
                      <mat-icon class="text-amber-600 mt-0.5">warning</mat-icon>
                      <div class="flex-1">
                        <p class="font-semibold text-amber-800">Versiyon Çakışması</p>
                        <p class="text-sm text-amber-700 mt-1">
                          Bu sorunun cevabı <strong>başka bir sekmede değiştirildi</strong>. İki farklı sekmede aynı soruya farklı cevaplar verildi.
                          Buradaki cevabınızı korumak istiyorsanız "Bu Cevabı Koru" butonuna basın. Aksi halde diğer sekmedeki cevap geçerli olacaktır.
                        </p>
                        <button mat-raised-button color="warn" size="small" class="mt-3" (click)="resolveConflict(q.id)">
                          <mat-icon class="text-sm">refresh</mat-icon> Bu Cevabı Koru
                        </button>
                      </div>
                    </div>
                  </div>
                }

                @if (q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.ESSAY) {
                  <div class="space-y-3">
                    <textarea class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                              rows="4"
                              [value]="getAnswer(q.id) || ''"
                              (input)="onAnswer(q.id, $any($event.target).value)"
                              placeholder="Cevabınızı yazın..."></textarea>
                  </div>
                } @else {
                  <div class="space-y-3">
                    @for (opt of q.options; track opt; let i = $index) {
                      <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                             [class.border-blue-500]="getAnswer(q.id) === i.toString()">
                        <input type="radio" [name]="'q' + q.id" [value]="i.toString()"
                               [checked]="getAnswer(q.id) === i.toString()"
                               (change)="onAnswer(q.id, i.toString())"
                               class="w-4 h-4 text-blue-600">
                        <span>{{ getOptionLabel(i) }}. {{ opt }}</span>
                      </label>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <div class="space-y-4">
            <div class="bg-white rounded-lg shadow-sm p-4">
              <h3 class="font-semibold mb-3">Soru Listesi</h3>
              <div class="grid grid-cols-5 gap-2">
                @for (q of questions(); track q.id; let i = $index) {
                  <button mat-mini-fab
                          [class.mat-primary]="i === currentIndex()"
                          [class.mat-accent]="isMarked(q.id) && i !== currentIndex()"
                          [class.border-green-500]="isAnswered(q.id) && i !== currentIndex() && !isMarked(q.id)"
                          [class.border-2]="isAnswered(q.id) && i !== currentIndex() && !isMarked(q.id)"
                          color="{{ i === currentIndex() ? 'primary' : (isMarked(q.id) ? 'accent' : 'basic') }}"
                          (click)="goToQuestion(i)"
                          [attr.aria-label]="'Soru ' + (i + 1) + (isAnswered(q.id) ? ' (cevaplandı)' : '') + (isMarked(q.id) ? ' (işaretli)' : '')">
                    {{ i + 1 }}
                  </button>
                }
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm p-4">
              <button mat-raised-button color="warn" class="w-full" (click)="confirmSubmit()" aria-label="Sınavı bitir ve gönder">
                <mat-icon>send</mat-icon>
                Sınavı Bitir
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ExamSessionPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private facade = inject(SessionFacade);
  private draftStore = inject(DraftStore);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  session = signal<ExamSession | null>(null);
  error = signal<string | null>(null);
  submitted = signal(false);
  isDirty = signal(false);

  readonly QuestionType = QuestionType;

  questions = computed(() => {
    const s = this.session();
    if (!s) return [];
    return s.questionSnapshots.length > 0 ? s.questionSnapshots : this.facade.getQuestions(s.examId);
  });

  currentIndex = this.facade.currentQuestionIndex;
  markedQuestions = this.facade.markedQuestions;
  timeRemaining = this.facade.timeRemaining;
  connectionStatus = this.facade.connectionStatus;
  saveStatus = this.facade.saveStatus;
  conflictQuestionId = this.facade.conflictQuestionId;

  totalQuestions = computed(() => this.questions().length);
  currentQuestion = computed(() => this.questions()[this.currentIndex()]);

  private draftVersion = computed(() => this.draftStore.version());
  private answerMap = computed(() => {
    this.draftVersion();
    const s = this.session();
    if (!s) return new Map<number, string>();
    const map = new Map<number, string>();
    for (const d of this.draftStore.getBySession(s.id)) {
      if (d.answer) map.set(d.questionId, d.answer);
    }
    return map;
  });

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.error.set('Geçersiz sınav oturumu');
      return;
    }

    this.facade.getSession(token).subscribe({
      next: s => {
        if (!s) { this.error.set('Oturum bulunamadı'); return; }
        if (s.status === 'expired') {
          this.facade.submitExpiredSession(token).subscribe(() => {
            this.submitted.set(true);
          });
          return;
        }
        this.session.set(s);
      },
      error: e => this.error.set(e.message || 'Oturum yüklenemedi')
    });

    fromEvent<BeforeUnloadEvent>(window, 'beforeunload').pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => {
      if (this.session() && !this.submitted()) {
        event.preventDefault();
        event.returnValue = '';
      }
    });

    fromEvent<KeyboardEvent>(document, 'keydown').pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => this.onKeydown(event));
  }

  private canInteract(): boolean {
    const s = this.session();
    if (!s || this.submitted()) return false;
    return this.facade.canAnswer(s.id);
  }

  onAnswer(questionId: number, answer: string): void {
    const s = this.session();
    if (!s || !this.canInteract()) return;
    this.isDirty.set(true);
    this.facade.saveAnswer(s.id, questionId, answer);
  }

  getAnswer(questionId: number): string | undefined {
    return this.answerMap().get(questionId);
  }

  toggleMark(questionId: number): void {
    if (!this.canInteract()) return;
    this.facade.toggleMark(questionId);
  }

  isMarked(questionId: number): boolean {
    return this.markedQuestions().includes(questionId);
  }

  isAnswered(questionId: number): boolean {
    const answer = this.answerMap().get(questionId);
    return !!(answer?.trim());
  }

  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  goToQuestion(index: number): void {
    if (!this.canInteract()) return;
    this.facade.goToQuestion(index);
    setTimeout(() => {
      const panel = document.querySelector('[tabindex="-1"]') as HTMLElement;
      panel?.focus();
    });
  }

  confirmSubmit(): void {
    const s = this.session();
    if (!s) return;
    const summary = this.facade.getSubmitSummary(s.id, this.totalQuestions());
    const unansweredMsg = summary.unanswered > 0
      ? `\n\n⚠️ ${summary.unanswered} soru cevaplanmamış: ${summary.unansweredNums.join(', ')}`
      : '\n\n✅ Tüm sorular cevaplandı.';
    const markedMsg = summary.marked > 0
      ? `\n🏁 ${summary.marked} soru işaretli.`
      : '';

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Sınavı Bitir',
        message: `${summary.answered}/${this.totalQuestions()} soru cevaplandı.${unansweredMsg}${markedMsg}\n\nSınavı bitirmek istediğinize emin misiniz?`,
        confirmLabel: 'Bitir',
        cancelLabel: 'İptal',
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.facade.submitSession(s.token).subscribe(() => {
          this.submitted.set(true);
          setTimeout(() => this.router.navigate(['/exams']), 1500);
        });
      }
    });
  }

  onTimeUp(): void {
    const s = this.session();
    if (!s) return;
    this.facade.expireSession(s.token);
    this.submitted.set(true);
    setTimeout(() => this.router.navigate(['/exams']), 1500);
  }

  toggleSimulateOffline(): void {
    if (this.connectionStatus() === 'offline') {
      this.facade.simulateOnline();
    } else {
      this.facade.simulateOffline();
    }
  }

  resolveConflict(questionId: number): void {
    const s = this.session();
    if (!s) return;
    this.facade.resolveConflict(s.id, questionId);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (!this.canInteract()) return;
    const key = event.key;
    const q = this.currentQuestion();
    if (!q || !this.session()) return;

    if (key === 'ArrowLeft' && this.currentIndex() > 0) {
      event.preventDefault();
      this.goToQuestion(this.currentIndex() - 1);
    } else if (key === 'ArrowRight' && this.currentIndex() < this.totalQuestions() - 1) {
      event.preventDefault();
      this.goToQuestion(this.currentIndex() + 1);
    } else if (key === 'f' || key === 'F') {
      event.preventDefault();
      this.toggleMark(q.id);
    } else if (key >= '0' && key <= '9') {
      event.preventDefault();
      const idx = parseInt(key, 10) === 0 ? 9 : parseInt(key, 10) - 1;
      if (idx < (q.options?.length ?? 0)) {
        this.onAnswer(q.id, idx.toString());
      }
    }
  }

}
