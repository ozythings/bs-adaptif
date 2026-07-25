import { describe, it, expect } from 'vitest';
import { generateRecommendations } from './recommendation-engine';
import { MasteryScore } from '@core/models/mastery-score.model';
import { ContentItem } from '@core/models/content-item.model';
import { MasteryLevel, ContentFormat, ContentStatus } from '@core/models/enums';

describe('RecommendationEngine', () => {
  it('should return empty for no weak outcomes', () => {
    const masteryScores: MasteryScore[] = [
      { id: 1, studentId: 1, outcomeId: 100, masteryLevel: MasteryLevel.PROFICIENT, score: 75, recentAnswers: [], difficultyWeightedAverage: 0, repeatCount: 2, version: 1, lastAssessedAt: '', calculatedAt: '', createdAt: '', updatedAt: '' }
    ];
    const contents: ContentItem[] = [];
    const result = generateRecommendations({ masteryScores, contents, completedContentIds: [], lockedContentIds: [] }, 1);
    expect(result).toHaveLength(0);
  });

  it('should recommend content for weak outcomes', () => {
    const masteryScores: MasteryScore[] = [
      { id: 1, studentId: 1, outcomeId: 100, masteryLevel: MasteryLevel.NOVICE, score: 30, recentAnswers: [0, 1, 0], difficultyWeightedAverage: 0.3, repeatCount: 1, version: 1, lastAssessedAt: '', calculatedAt: '', createdAt: '', updatedAt: '' }
    ];
    const contents: ContentItem[] = [
      { id: 1, title: 'Angular Components', description: '', format: ContentFormat.VIDEO, durationMinutes: 15, outcomeIds: [100], courseId: 1, prerequisiteContentIds: [], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 1, version: 1, createdAt: '', updatedAt: '' }
    ];
    const result = generateRecommendations({ masteryScores, contents, completedContentIds: [], lockedContentIds: [] }, 1);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].studentId).toBe(1);
    expect(result[0].contentId).toBe(1);
    expect(result[0].reasonDetails.length).toBeGreaterThan(0);
  });

  it('should exclude completed and locked content', () => {
    const masteryScores: MasteryScore[] = [
      { id: 1, studentId: 1, outcomeId: 100, masteryLevel: MasteryLevel.NOVICE, score: 25, recentAnswers: [0, 0], difficultyWeightedAverage: 0.2, repeatCount: 1, version: 1, lastAssessedAt: '', calculatedAt: '', createdAt: '', updatedAt: '' }
    ];
    const contents: ContentItem[] = [
      { id: 1, title: 'A', description: '', format: ContentFormat.VIDEO, durationMinutes: 10, outcomeIds: [100], courseId: 1, prerequisiteContentIds: [], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 1, version: 1, createdAt: '', updatedAt: '' },
      { id: 2, title: 'B', description: '', format: ContentFormat.TEXT, durationMinutes: 10, outcomeIds: [100], courseId: 1, prerequisiteContentIds: [], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 2, version: 1, createdAt: '', updatedAt: '' },
    ];
    const result = generateRecommendations({ masteryScores, contents, completedContentIds: [1], lockedContentIds: [] }, 1);
    expect(result.every(r => r.contentId !== 1)).toBe(true);
  });

  it('should prioritize critically weak outcomes', () => {
    const masteryScores: MasteryScore[] = [
      { id: 1, studentId: 1, outcomeId: 100, masteryLevel: MasteryLevel.NOVICE, score: 25, recentAnswers: [0], difficultyWeightedAverage: 0.2, repeatCount: 1, version: 1, lastAssessedAt: '', calculatedAt: '', createdAt: '', updatedAt: '' },
      { id: 2, studentId: 1, outcomeId: 101, masteryLevel: MasteryLevel.EMERGING, score: 50, recentAnswers: [1, 0], difficultyWeightedAverage: 0.4, repeatCount: 2, version: 1, lastAssessedAt: '', calculatedAt: '', createdAt: '', updatedAt: '' }
    ];
    const contents: ContentItem[] = [
      { id: 1, title: 'A', description: '', format: ContentFormat.VIDEO, durationMinutes: 10, outcomeIds: [100], courseId: 1, prerequisiteContentIds: [], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 1, version: 1, createdAt: '', updatedAt: '' },
      { id: 2, title: 'B', description: '', format: ContentFormat.TEXT, durationMinutes: 10, outcomeIds: [101], courseId: 1, prerequisiteContentIds: [], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 1, version: 1, createdAt: '', updatedAt: '' }
    ];
    const result = generateRecommendations({ masteryScores, contents, completedContentIds: [], lockedContentIds: [] }, 1);
    expect(result[0].priority).toBe(1);
    expect(result[0].outcomeId).toBe(100);
  });

  it('should explain the mastery level in the mastery_score reason', () => {
    const masteryScores: MasteryScore[] = [
      { id: 1, studentId: 1, outcomeId: 100, masteryLevel: MasteryLevel.NOVICE, score: 30, recentAnswers: [0, 1, 0], difficultyWeightedAverage: 0.3, repeatCount: 1, version: 1, lastAssessedAt: '', calculatedAt: '', createdAt: '', updatedAt: '' }
    ];
    const contents: ContentItem[] = [
      { id: 1, title: 'A', description: '', format: ContentFormat.VIDEO, durationMinutes: 10, outcomeIds: [100], courseId: 1, prerequisiteContentIds: [], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 1, version: 1, createdAt: '', updatedAt: '' }
    ];
    const result = generateRecommendations({ masteryScores, contents, completedContentIds: [], lockedContentIds: [] }, 1);
    const masteryReason = result[0].reasonDetails.find(d => d.factor === 'mastery_score');
    expect(masteryReason?.description).toContain('30');
    expect(masteryReason?.description.toLowerCase()).toContain('başlangıç');
  });

  it('should add a difficulty reason when hard-question success is low', () => {
    const masteryScores: MasteryScore[] = [
      {
        id: 1, studentId: 1, outcomeId: 100, masteryLevel: MasteryLevel.EMERGING, score: 42,
        recentAnswers: [1, 0, 1, 0], difficultyWeightedAverage: 0.5, repeatCount: 2,
        difficultyBreakdown: {
          easy: { correct: 3, total: 4, successRate: 0.75 },
          medium: { correct: 2, total: 5, successRate: 0.4 },
          hard: { correct: 0, total: 3, successRate: 0 },
        },
        version: 1, lastAssessedAt: '', calculatedAt: '', createdAt: '', updatedAt: ''
      }
    ];
    const contents: ContentItem[] = [
      { id: 1, title: 'A', description: '', format: ContentFormat.VIDEO, durationMinutes: 10, outcomeIds: [100], courseId: 1, prerequisiteContentIds: [], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 1, version: 1, createdAt: '', updatedAt: '' }
    ];
    const result = generateRecommendations({ masteryScores, contents, completedContentIds: [], lockedContentIds: [] }, 1);
    const difficultyReason = result[0].reasonDetails.find(d => d.factor === 'difficulty');
    expect(difficultyReason).toBeDefined();
    expect(difficultyReason?.description).toContain('Zor sorularda');
  });

  it('should add a last_assessed reason when the assessment is old', () => {
    const monthsAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const masteryScores: MasteryScore[] = [
      { id: 1, studentId: 1, outcomeId: 100, masteryLevel: MasteryLevel.EMERGING, score: 50, recentAnswers: [1, 0], difficultyWeightedAverage: 0.4, repeatCount: 2, version: 1, lastAssessedAt: monthsAgo, calculatedAt: monthsAgo, createdAt: '', updatedAt: '' }
    ];
    const contents: ContentItem[] = [
      { id: 1, title: 'A', description: '', format: ContentFormat.VIDEO, durationMinutes: 10, outcomeIds: [100], courseId: 1, prerequisiteContentIds: [], status: ContentStatus.ACTIVE, isLocked: false, isRequired: true, sortOrder: 1, version: 1, createdAt: '', updatedAt: '' }
    ];
    const result = generateRecommendations({ masteryScores, contents, completedContentIds: [], lockedContentIds: [] }, 1);
    const lastAssessedReason = result[0].reasonDetails.find(d => d.factor === 'last_assessed');
    expect(lastAssessedReason).toBeDefined();
    expect(lastAssessedReason?.description).toContain('gün önce');
  });
});
