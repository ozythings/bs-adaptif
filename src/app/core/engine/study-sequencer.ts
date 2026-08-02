import { MasteryScore } from '@core/models/mastery-score.model';
import { ContentItem } from '@core/models/content-item.model';
import { RecommendationStatus } from '@core/models/enums';
import { Recommendation } from '@core/models/recommendation.model';
import { Difficulty } from '@core/models/enums';

export const MASTERED_THRESHOLD = 80;
export const WEAK_THRESHOLD = 60;
export const CRITICAL_THRESHOLD = 40;
export const MAX_RECOMMENDATIONS = 5;

export interface SequenceInput {
  masteryScores: MasteryScore[];
  contents: ContentItem[];
  completedContentIds: number[];
  lockedContentIds: number[];
}

export interface SequencedContent {
  content: ContentItem;
  outcomeName?: string;
  masteryScore: number;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'mastered';
  order: number;
  isMastered: boolean;
  isWeak: boolean;
}

export function generateStudySequence(input: SequenceInput): SequencedContent[] {
  const { masteryScores, contents, completedContentIds, lockedContentIds } = input;

  const available = contents.filter(c =>
    !completedContentIds.includes(c.id) &&
    !lockedContentIds.includes(c.id)
  );

  const scored = available.map(c => {
    const scores = c.outcomeIds
      .map(oid => masteryScores.find(m => m.outcomeId === oid))
      .filter(Boolean) as MasteryScore[];
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((s, m) => s + m.score, 0) / scores.length)
      : 0;
    const allMastered = scores.length > 0 && scores.every(m => m.score >= MASTERED_THRESHOLD);
    const isWeak = scores.length > 0 && avgScore < WEAK_THRESHOLD;
    return { content: c, avgScore, allMastered, isWeak, scores };
  });

  const sorted = topologicalSort(scored, contents);

  let order = 0;
  return sorted.map(({ content, avgScore, allMastered, isWeak }) => {
    let priority: SequencedContent['priority'] = 'low';
    if (allMastered) priority = 'mastered';
    else if (avgScore < CRITICAL_THRESHOLD) priority = 'critical';
    else if (avgScore < WEAK_THRESHOLD) priority = 'high';
    else if (isWeak) priority = 'medium';
    return {
      content,
      outcomeName: undefined,
      masteryScore: avgScore,
      priority,
      order: order++,
      isMastered: allMastered,
      isWeak,
    };
  });
}

function topologicalSort(
  items: { content: ContentItem; avgScore: number; allMastered: boolean; isWeak: boolean }[],
  allContents: ContentItem[]
): typeof items {
  const idSet = new Set(items.map(i => i.content.id));
  const result: typeof items = [];
  const visited = new Set<number>();

  const addPrereqs = (content: ContentItem) => {
    for (const pid of content.prerequisiteContentIds) {
      if (!visited.has(pid) && idSet.has(pid)) {
        visited.add(pid);
        const prereq = items.find(i => i.content.id === pid);
        if (prereq) {
          addPrereqs(prereq.content);
          result.push(prereq);
        }
      }
    }
  };

  for (const item of items) {
    if (visited.has(item.content.id)) continue;
    addPrereqs(item.content);
    if (!visited.has(item.content.id)) {
      visited.add(item.content.id);
      result.push(item);
    }
  }

  return result;
}

export function generateRecommendations(
  input: SequenceInput & { studentId: number }
): Omit<Recommendation, 'id' | 'version' | 'createdAt' | 'updatedAt'>[] {
  const sequence = generateStudySequence(input);
  const weakItems = sequence.filter(s => s.isWeak);

  return weakItems
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        const order = { critical: 0, high: 1, medium: 2, low: 3, mastered: 4 };
        return order[a.priority] - order[b.priority];
      }
      return a.order - b.order;
    })
    .slice(0, MAX_RECOMMENDATIONS)
    .map(s => {
      const outcomeId = s.content.outcomeIds[0];
      const label = s.priority === 'critical' ? 'kritik eksik' : 'geliştirilmeli';
      return {
        studentId: input.studentId,
        contentType: 'content' as const,
        contentId: s.content.id,
        outcomeId,
        reason: `${s.content.title} — ${label} (%${s.masteryScore})`,
        reasonDetails: [],
        priority: s.priority === 'critical' ? 1 : 2,
        status: RecommendationStatus.PENDING,
        isApplied: false,
        isDismissed: false,
      };
    });
}

export function difficultyLabel(difficulty?: Difficulty): string {
  if (difficulty === Difficulty.EASY) return 'Kolay';
  if (difficulty === Difficulty.MEDIUM) return 'Orta';
  if (difficulty === Difficulty.HARD) return 'Zor';
  return '';
}

export function difficultyColor(difficulty?: Difficulty): string {
  if (difficulty === Difficulty.EASY) return 'text-green-600';
  if (difficulty === Difficulty.MEDIUM) return 'text-orange-600';
  if (difficulty === Difficulty.HARD) return 'text-red-600';
  return 'text-gray-400';
}
