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
      <div class="overflow-hidden border border-gray-300">
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="text-left py-3 px-4 font-semibold text-gray-900 text-xs uppercase tracking-wide">Kod</th>
                <th class="text-left py-3 px-4 font-semibold text-gray-900 text-xs uppercase tracking-wide">Kazanım</th>
                <th class="text-center py-3 px-4 font-semibold text-gray-900 text-xs uppercase tracking-wide">Puan</th>
                <th class="text-center py-3 px-4 font-semibold text-gray-900 text-xs uppercase tracking-wide">Seviye</th>
              </tr>
            </thead>
            <tbody>
              @for (outcome of outcomes(); track outcome.id; let last = $last) {
                @let score = scoreMap().get(outcome.id);
                <tr
                  [class.border-b]="!last"
                  [class.border-gray-50]="!last"
                >
                  <td class="py-3 px-4">
                    <span class="font-mono text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5">
                      {{ outcome.code }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-gray-700">{{ outcome.name }}</td>
                  <td class="py-3 px-4">
                    <div class="flex items-center justify-center gap-2 min-w-[90px] mx-auto">
                      <span
                        class="font-semibold text-gray-800 tabular-nums w-7 text-right"
                        [attr.aria-label]="(score ? score.score + ' puan' : 'Veri yok')"
                      >
                        {{ score ? score.score : '-' }}
                      </span>
                      @if (score) {
                        <div class="flex-1 h-1.5 overflow-hidden max-w-[60px]">
                          <div
                            class="h-full"
                            [class]="getBarColorClass(score.score)"
                            [style.width.%]="score.score"
                          ></div>
                        </div>
                      }
                    </div>
                  </td>
                  <td class="py-3 px-4 text-center">
                    @if (score) {
                      <span
                        class="inline-block px-2 py-1 text-xs font-medium"
                        [class]="getBadgeColorClass(score.score)"
                        [attr.aria-label]="getLevelLabel(score.score) + ' seviye - ' + score.score + ' puan'"
                      >
                        {{ getLevelLabel(score.score) }}
                      </span>
                    } @else {
                      <span class="text-xs text-gray-400 italic">Veri yok</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="text-center py-12 text-gray-400">
                    <div class="flex flex-col items-center gap-2">
                      <span class="text-2xl">📋</span>
                      <span>Henüz kazanım bulunmuyor</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    } @placeholder {
      <div class="h-40 bg-gray-100 animate-pulse"></div>
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

  getBadgeColorClass(score: number): string {
    if (score < 40) return 'bg-red-100 text-red-700';
    if (score < 60) return 'bg-orange-100 text-orange-700';
    if (score < 80) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  }

  getBarColorClass(score: number): string {
    if (score < 40) return 'bg-red-500';
    if (score < 60) return 'bg-orange-500';
    if (score < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  getLevelLabel(score: number): string {
    if (score < 40) return 'Acemi';
    if (score < 60) return 'Gelişiyor';
    if (score < 80) return 'Yeterli';
    return 'İleri';
  }
}
