import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MasteryScore } from '@core/models/mastery-score.model';
import { LearningOutcome } from '@core/models/learning-outcome.model';

@Component({
  selector: 'app-mastery-heatmap',
  standalone: true,
  imports: [CommonModule],
  template: `
    @defer (on viewport) {
      <div class="bg-white border border-gray-200">
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50">
                <th class="text-left py-2.5 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wide relative md:sticky md:left-0 md:z-10 md:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]"
                    style="background-color: #f9fafb;">Kod</th>
                <th class="text-left py-2.5 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wide relative md:sticky md:left-[72px] md:z-10 md:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]"
                    style="background-color: #f9fafb;">Kazanım</th>
                <th class="text-center py-2.5 px-3 font-semibold text-xs uppercase tracking-wide text-white" style="background: #22c55e">Kolay</th>
                <th class="text-center py-2.5 px-3 font-semibold text-xs uppercase tracking-wide text-white" style="background: #f59e0b">Orta</th>
                <th class="text-center py-2.5 px-3 font-semibold text-xs uppercase tracking-wide text-white" style="background: #ef4444">Zor</th>
                <th class="text-center py-2.5 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wide">Puan</th>
              </tr>
            </thead>
            <tbody>
              @for (outcome of outcomes(); track outcome.id; let odd = $odd; let last = $last) {
                @let score = scoreMap().get(outcome.id);
                @let bd = score?.difficultyBreakdown;
                <tr [class.border-b]="!last" class="border-gray-100 hover:bg-gray-50/50"
                    [style.background-color]="odd ? '#f9fafb' : '#ffffff'">
                  <td class="py-2 px-3 relative md:sticky md:left-0 md:z-10 md:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]"
                      style="background-color: inherit">
                    <span class="font-mono text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {{ outcome.code }}
                    </span>
                  </td>
                  <td class="py-2 px-3 text-gray-700 text-xs relative md:sticky md:left-[72px] md:z-10 max-w-[180px] truncate md:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]"
                      style="background-color: inherit" [title]="outcome.name">
                    {{ outcome.name }}
                  </td>
                  @if (bd) {
                    <td class="py-2 px-3 text-center">
                      <span
                        class="inline-flex items-center justify-center w-12 h-8 rounded text-xs font-bold text-white"
                        [style.background]="getCellColor(bd.easy.successRate)"
                        [title]="'Kolay: ' + formatRate(bd.easy)"
                      >
                        {{ formatPercent(bd.easy.successRate) }}
                      </span>
                    </td>
                    <td class="py-2 px-3 text-center">
                      <span
                        class="inline-flex items-center justify-center w-12 h-8 rounded text-xs font-bold text-white"
                        [style.background]="getCellColor(bd.medium.successRate)"
                        [title]="'Orta: ' + formatRate(bd.medium)"
                      >
                        {{ formatPercent(bd.medium.successRate) }}
                      </span>
                    </td>
                    <td class="py-2 px-3 text-center">
                      <span
                        class="inline-flex items-center justify-center w-12 h-8 rounded text-xs font-bold text-white"
                        [style.background]="getCellColor(bd.hard.successRate)"
                        [title]="'Zor: ' + formatRate(bd.hard)"
                      >
                        {{ formatPercent(bd.hard.successRate) }}
                      </span>
                    </td>
                  } @else {
                    <td class="py-2 px-3 text-center" colspan="3">
                      @if (score) {
                        <span
                          class="inline-flex items-center justify-center w-12 h-8 rounded text-xs font-bold text-white mx-auto"
                          [style.background]="getCellColor(score.score / 100)"
                        >
                          {{ score.score }}%
                        </span>
                      } @else {
                        <span class="text-xs text-gray-400 italic">-</span>
                      }
                    </td>
                  }
                  <td class="py-2 px-3 text-center">
                    @if (score) {
                      <span
                        class="inline-block px-2 py-0.5 text-xs font-semibold rounded"
                        [class]="getBadgeClass(score.score)"
                      >
                        {{ score.score }}
                      </span>
                    } @else {
                      <span class="text-xs text-gray-400">-</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="text-center py-10 text-gray-400" style="background-color: #ffffff">
                    <div class="flex flex-col items-center gap-1">
                      <span class="text-lg">📋</span>
                      <span class="text-sm">Henüz kazanım bulunmuyor</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (outcomes().length > 0) {
          <div class="flex items-center justify-center gap-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
            <span class="font-medium">Renk:</span>
            <span class="flex items-center gap-1">
              <span class="w-3 h-3 rounded-sm" style="background: #ef4444"></span> &lt;%40
            </span>
            <span class="flex items-center gap-1">
              <span class="w-3 h-3 rounded-sm" style="background: #f59e0b"></span> %40–69
            </span>
            <span class="flex items-center gap-1">
              <span class="w-3 h-3 rounded-sm" style="background: #22c55e"></span> %70+
            </span>
          </div>
        }
      </div>
    } @placeholder {
      <div class="h-40 bg-gray-100 animate-pulse rounded-lg"></div>
    }
  `,
})
export class MasteryHeatmap {
  scores = input<MasteryScore[]>([]);
  outcomes = input<LearningOutcome[]>([]);

  scoreMap = computed(() => {
    const map = new Map<number, MasteryScore>();
    for (const s of this.scores()) {
      map.set(s.outcomeId, s);
    }
    return map;
  });

  getCellColor(successRate: number): string {
    if (successRate < 0.4) return '#ef4444';
    if (successRate < 0.7) return '#f59e0b';
    return '#22c55e';
  }

  getBadgeClass(score: number): string {
    if (score < 40) return 'bg-red-100 text-red-700';
    if (score < 60) return 'bg-orange-100 text-orange-700';
    if (score < 80) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  }

  formatPercent(rate: number): string {
    return Math.round(rate * 100) + '%';
  }

  formatRate(tier: { correct: number; total: number; successRate: number }): string {
    return `${tier.correct}/${tier.total} (${Math.round(tier.successRate * 100)}%)`;
  }
}
