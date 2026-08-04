import { MasteryScore } from '@core/models/mastery-score.model';
import { LearningOutcome } from '@core/models/learning-outcome.model';

export function getMasteryColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-700';
  if (score >= 60) return 'bg-blue-100 text-blue-700';
  if (score >= 40) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

export function getMasteryLabel(score: number): string {
  if (score >= 80) return 'İleri';
  if (score >= 60) return 'Yeterli';
  if (score >= 40) return 'Gelişmekte';
  return 'Başlangıç';
}

export function isWeak(score: number): boolean {
  return score < 60;
}

export function isStrong(score: number): boolean {
  return score >= 80;
}

export function getOverallMastery(masteryScores: MasteryScore[]): number {
  if (masteryScores.length === 0) return 0;
  return Math.round(masteryScores.reduce((s, m) => s + m.score, 0) / masteryScores.length);
}

export function getWeakOutcomes(masteryScores: MasteryScore[], outcomes: LearningOutcome[]): LearningOutcome[] {
  const weakIds = masteryScores.filter(m => isWeak(m.score)).map(m => m.outcomeId);
  return outcomes.filter(o => weakIds.includes(o.id));
}

export function getStrongOutcomes(masteryScores: MasteryScore[], outcomes: LearningOutcome[]): LearningOutcome[] {
  const strongIds = masteryScores.filter(m => isStrong(m.score)).map(m => m.outcomeId);
  return outcomes.filter(o => strongIds.includes(o.id));
}

export function getOutcomeName(outcomes: LearningOutcome[], outcomeId: number): string {
  return outcomes.find(o => o.id === outcomeId)?.name ?? `Kazanım #${outcomeId}`;
}

export function getOutcomeCode(outcomes: LearningOutcome[], outcomeId: number): string {
  return outcomes.find(o => o.id === outcomeId)?.code ?? `#${outcomeId}`;
}
