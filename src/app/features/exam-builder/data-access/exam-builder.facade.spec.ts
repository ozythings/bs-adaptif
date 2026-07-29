import { describe, it, expect } from 'vitest';
import { BLUEPRINTS_SEED, QUESTIONS_SEED } from '@core/data';
import { BlueprintStatus } from '@core/models/enums';

describe('ExamBuilderFacade (unit)', () => {
  it('should have seed blueprints', () => {
    expect(BLUEPRINTS_SEED.length).toBeGreaterThan(0);
  });

  it('should check blueprint constraints are met for ready blueprints', () => {
    const ready = BLUEPRINTS_SEED.filter(b => b.status === BlueprintStatus.READY);
    ready.forEach(b => {
      expect(b.summary.violations).toHaveLength(0);
      b.constraints.forEach(c => {
        const coverage = b.summary.coverage.find(x => x.outcomeId === c.outcomeId);
        expect(coverage).toBeDefined();
        expect(coverage!.selected).toBeGreaterThanOrEqual(c.minCount);
      });
    });
  });

  it('should detect violated blueprints', () => {
    const violated = BLUEPRINTS_SEED.filter(b => b.status === BlueprintStatus.VIOLATED);
    violated.forEach(b => {
      expect(b.summary.violations.length).toBeGreaterThan(0);
    });
  });

  it('should find questions matching blueprint constraints', () => {
    const blueprint = BLUEPRINTS_SEED[0];
    blueprint.constraints.forEach(c => {
      const matching = QUESTIONS_SEED.filter(q =>
        q.difficulty === c.difficulty
      );
      expect(matching.length).toBeGreaterThanOrEqual(c.minCount);
    });
  });

  it('should not select same question twice', () => {
    const blueprint = BLUEPRINTS_SEED[0];
    const allQuestions = QUESTIONS_SEED.filter(q => q.examId === blueprint.examId);
    const selected = allQuestions.slice(0, blueprint.constraints.reduce((s, c) => s + c.minCount, 0));
    const unique = new Set(selected.map(q => q.id));
    expect(unique.size).toBe(selected.length);
  });
});
