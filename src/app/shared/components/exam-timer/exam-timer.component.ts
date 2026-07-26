import { Component,  input,  output,  signal,  computed,  inject,  DestroyRef,  effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, fromEvent, merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-exam-timer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center gap-2" role="timer" [attr.aria-label]="'Kalan süre: ' + remaining()">
      <div class="text-6xl font-mono font-bold tracking-wider"
        [class.text-red-600]="isLowTime()"
        [class.animate-pulse]="isLowTime()">
        {{ remaining() }}
      </div>
      @if (syncing()) {
        <span class="text-xs text-gray-400">süre senkronize ediliyor...</span>
      }
      <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div class="h-full rounded-full transition-all duration-1000 ease-linear"
          [class.bg-red-500]="isLowTime()"
          [class.bg-blue-600]="!isLowTime()"
          [style.width.%]="progress()">
        </div>
      </div>
      <span class="text-sm text-gray-500">Kalan Süre</span>
    </div>
  `
})
export class ExamTimerComponent {
  serverTimeReference = input.required<string>();
  durationMinutes = input.required<number>();
  timeUp = output<void>();

  private destroyRef = inject(DestroyRef);

  private elapsed = signal(0);
  protected syncing = signal(false);

  private totalSeconds = computed(() => this.durationMinutes() * 60);

  remainingSeconds = computed(() => Math.max(0, this.totalSeconds() - this.elapsed()));

  remaining = computed(() => {
    const totalSec = this.remainingSeconds();
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  progress = computed(() => {
    if (this.totalSeconds() === 0) return 0;
    return (this.remainingSeconds() / this.totalSeconds()) * 100;
  });

  isLowTime = computed(() => this.remainingSeconds() > 0 && this.remainingSeconds() < 120);

  private started = false;
  private anchorPerf = 0;
  private initialElapsed = 0;
  private emitted = false;

  constructor() {
    effect(() => {
      const ref = this.serverTimeReference();
      if (!ref || this.started) return;
      this.started = true;

      const startMs = new Date(ref).getTime();
      this.initialElapsed = isNaN(startMs)
        ? 0
        : Math.max(0, this.computeServerElapsed(startMs));
      this.anchorPerf = performance.now();

      interval(1000)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.tick());

      merge(
        fromEvent(document, 'visibilitychange'),
        fromEvent(window, 'focus')
      ).pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.onResume());
    });
  }

  private computeServerElapsed(startMs: number): number {
    return Math.floor((Date.now() - startMs) / 1000);
  }

  private tick(): void {
    const elapsedSec = Math.floor((performance.now() - this.anchorPerf) / 1000);
    this.elapsed.set(this.initialElapsed + elapsedSec);
    this.syncing.set(false);

    if (this.remainingSeconds() <= 0 && !this.emitted) {
      this.emitted = true;
      this.timeUp.emit();
    }
  }

  private onResume(): void {
    if (!this.started) return;
    this.syncing.set(true);
    this.tick();
  }
}
