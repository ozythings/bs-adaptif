import { MasteryScore } from '@core/models/mastery-score.model';
import { ContentItem } from '@core/models/content-item.model';
import { Recommendation, ReasonDetail } from '@core/models/recommendation.model';
import { RecommendationStatus, MasteryLevel, Difficulty } from '@core/models/enums';
import { generateStudySequence, SequencedContent } from './study-sequencer';

export interface RecommendationInput {
  masteryScores: MasteryScore[];
  contents: ContentItem[];
  completedContentIds: number[];
  lockedContentIds: number[];
}

const LEVEL_LABELS: Record<MasteryLevel, string> = {
  [MasteryLevel.NOSTUDYYET]: 'hiç çalışılmadı',
  [MasteryLevel.NOVICE]: 'başlangıç — temel bilgi eksik',
  [MasteryLevel.EMERGING]: 'gelişmekte',
  [MasteryLevel.PROFICIENT]: 'yeterli — geliştirilebilir',
  [MasteryLevel.ADVANCED]: 'ileri',
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function generateRecommendations(
  input: RecommendationInput,
  studentId: number
): Omit<Recommendation, 'id' | 'version' | 'createdAt' | 'updatedAt'>[] {
  const sequence = generateStudySequence(input);
  const weakItems = sequence.filter(s => s.isWeak);

  return weakItems
    .slice(0, 5)
    .map(s => {
      const mastery = input.masteryScores.find(m =>
        s.content.outcomeIds.includes(m.outcomeId)
      );
      const details = mastery ? buildReasonDetails(mastery, s.content) : [];
      const isCritical = s.priority === 'critical';
      const label = isCritical ? 'kritik eksik' : 'geliştirilmeli';

      return {
        studentId,
        contentType: 'content' as const,
        contentId: s.content.id,
        outcomeId: s.content.outcomeIds[0],
        reason: `${s.content.title} — ${label} (%${s.masteryScore})`,
        reasonDetails: details,
        priority: isCritical ? 1 : 2,
        status: RecommendationStatus.PENDING,
        isApplied: false,
        isDismissed: false,
      };
    });
}

function buildReasonDetails(mastery: MasteryScore, content: ContentItem): ReasonDetail[] {
  const details: ReasonDetail[] = [];

  const isCritical = mastery.score < 40;
  const levelLabel = LEVEL_LABELS[mastery.masteryLevel] ?? mastery.masteryLevel;
  details.push({
    factor: 'mastery_score',
    weight: isCritical ? 0.6 : 0.4,
    description: `Ustalık puanı ${mastery.score} — ${levelLabel}`,
  });

  if (content.difficulty) {
    details.push(contentDifficultyReason(content.difficulty));
  }

  const difficulty = difficultyReason(mastery);
  if (difficulty) details.push(difficulty);

  details.push(repeatReason(mastery));

  const lastAssessed = lastAssessedReason(mastery);
  if (lastAssessed) details.push(lastAssessed);

  return details;
}

function contentDifficultyReason(difficulty: Difficulty): ReasonDetail {
  const labels: Record<Difficulty, string> = {
    [Difficulty.EASY]: 'Kolay',
    [Difficulty.MEDIUM]: 'Orta',
    [Difficulty.HARD]: 'Zor',
  };
  return {
    factor: 'content_difficulty',
    weight: 0.15,
    description: `İçerik zorluğu: ${labels[difficulty]}`,
  };
}

function difficultyReason(mastery: MasteryScore): ReasonDetail | null {
  const b = mastery.difficultyBreakdown;
  if (b) {
    const hasData = b.easy.total + b.medium.total + b.hard.total > 0;
    if (hasData && b.hard.total > 0 && b.hard.successRate < 0.5) {
      return {
        factor: 'difficulty',
        weight: 0.3,
        description: `Zor sorularda %${Math.round(b.hard.successRate * 100)} başarı — zorluk seviyesi desteği önerilir`,
      };
    }
    if (hasData && b.medium.total > 0 && b.medium.successRate < 0.5) {
      return {
        factor: 'difficulty',
        weight: 0.2,
        description: `Orta zorluktaki sorularda %${Math.round(b.medium.successRate * 100)} başarı`,
      };
    }
  }

  if (mastery.difficultyWeightedAverage > 0.7 && mastery.score < 60) {
    return {
      factor: 'difficulty',
      weight: 0.2,
      description: `Ağırlıklı zorluk %${Math.round(mastery.difficultyWeightedAverage * 100)} — zor içerikler üzerinde çalışılıyor`,
    };
  }

  return null;
}

function repeatReason(mastery: MasteryScore): ReasonDetail {
  if (mastery.repeatCount <= 1) {
    return { factor: 'repeat_count', weight: 0.2, description: `Sadece ${mastery.repeatCount} kez çalışılmış — daha fazla tekrar önerilir` };
  }
  if (mastery.repeatCount <= 2) {
    return { factor: 'repeat_count', weight: 0.2, description: `${mastery.repeatCount} kez çalışılmış — pekiştirme için tekrar önerilir` };
  }
  if (mastery.repeatCount >= 5) {
    return { factor: 'repeat_count', weight: 0.2, description: `${mastery.repeatCount} kez çalışılmış — mevcut yaklaşım yetmiyor, farklı bir yöntem deneyin` };
  }
  return { factor: 'repeat_count', weight: 0.1, description: `${mastery.repeatCount} kez çalışılmış` };
}

function lastAssessedReason(mastery: MasteryScore): ReasonDetail | null {
  if (!mastery.lastAssessedAt) return null;
  const last = new Date(mastery.lastAssessedAt).getTime();
  if (Number.isNaN(last)) return null;

  const days = Math.floor((Date.now() - last) / DAY_MS);
  if (days >= 14) {
    return { factor: 'last_assessed', weight: 0.2, description: `Son değerlendirme ${days} gün önce — bilgi tazelenmeli` };
  }
  if (days >= 5) {
    return { factor: 'last_assessed', weight: 0.1, description: `Son değerlendirme ${days} gün önce` };
  }
  return null;
}
