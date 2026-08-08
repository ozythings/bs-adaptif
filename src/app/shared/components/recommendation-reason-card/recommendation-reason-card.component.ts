import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Recommendation } from '@core/models/recommendation.model';

const FACTOR_LABELS: Record<string, string> = {
  mastery_score: 'Başarım Puanı',
  repeat_count: 'Tekrar Sayısı',
  prerequisite: 'Önkoşul',
  difficulty: 'Zorluk',
  time_spent: 'Çalışma Süresi',
  completion: 'Tamamlama',
  last_assessed: 'Son Değerlendirme',
  content_difficulty: "İçerik Zorluğu"
};

const FACTOR_ICONS: Record<string, string> = {
  mastery_score: 'track_changes',
  repeat_count: 'repeat',
  prerequisite: 'link',
  difficulty: 'bolt',
  time_spent: 'schedule',
  completion: 'check_circle',
  last_assessed: 'event',
  content_difficulty: 'auto_awesome',
};

const PRIORITY_ICONS: Record<number, string> = {
  1: 'priority_high',
  2: 'remove',
  3: 'arrow_downward',
};

@Component({
  selector: 'app-recommendation-reason-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div
      class="relative bg-white rounded-lg p-5 border border-gray-200 overflow-hidden"
    >
      <div
        class="absolute left-0 top-0 h-full w-1.5 rounded-l-lg"
        [class.bg-red-500]="priority() === 1"
        [class.bg-yellow-400]="priority() === 2"
        [class.bg-blue-500]="priority() === 3"
      ></div>

      <div class="pl-2">
        <div class="flex items-start justify-between gap-3 mb-3">
          <h3 class="text-base font-semibold text-gray-900 leading-snug flex-1">
            {{ recommendation().reason }}
          </h3>

          <span
            class="inline-flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
            [class.bg-red-100]="priority() === 1"
            [class.text-red-600]="priority() === 1"
            [class.bg-yellow-100]="priority() === 2"
            [class.text-yellow-700]="priority() === 2"
            [class.bg-blue-100]="priority() === 3"
            [class.text-blue-600]="priority() === 3"
          >
            <mat-icon class="!w-3.5 !h-3.5 !text-[14px] leading-none">{{ priorityIcon() }}</mat-icon>
            @if (priority() === 1) { Yüksek }
            @else if (priority() === 2) { Orta }
            @else { Düşük }
          </span>
        </div>

        @if (outcomeName()) {
          <p class="text-sm text-gray-500 mb-3 flex items-center gap-1.5 flex-wrap">
            <mat-icon class="!w-4 !h-4 !text-[16px] text-gray-400 leading-none">school</mat-icon>
            <span class="font-medium text-gray-800">{{ outcomeName() }}</span>
            @if (courseName()) {
              <span class="text-gray-300">•</span>
              <span class="text-gray-600">{{ courseName() }}</span>
            }
          </p>
        }

        @if (recommendation().reasonDetails?.length) {
          <div class="mt-3 border border-gray-300 overflow-hidden">
            <div
              class="grid items-start text-sm"
              style="grid-template-columns: 28px minmax(110px, auto) 1fr;"
            >
              @for (detail of recommendation().reasonDetails; track detail.factor; let last = $last) {
                <div
                  class="flex items-center justify-center py-2 text-gray-800 border-gray-100"
                  [class.border-b]="!last"
                >
                  <mat-icon class="!w-[16px] !h-[16px] !text-[16px] leading-none">
                    {{ factorIcon(detail.factor) }}
                  </mat-icon>
                </div>
                <div
                  class="py-2 px-3 font-medium text-gray-800 whitespace-nowrap border-l border-gray-100"
                  [class.border-b]="!last"
                >
                  {{ translateFactor(detail.factor) }}
                </div>
                <div
                  class="py-2 px-3 text-gray-800 leading-relaxed border-l border-gray-100"
                  [class.border-b]="!last"
                >
                  {{ detail.description }}
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class RecommendationReasonCardComponent {
  recommendation = input.required<Recommendation>();
  outcomeName = input<string | undefined>(undefined);
  courseName = input<string | undefined>(undefined);

  priority = computed(() => this.recommendation().priority);
  priorityIcon = computed(() => PRIORITY_ICONS[this.priority()] || 'help_outline');

  translateFactor(factor: string): string {
    return FACTOR_LABELS[factor] || factor;
  }

  factorIcon(factor: string): string {
    return FACTOR_ICONS[factor] || 'info';
  }
}
