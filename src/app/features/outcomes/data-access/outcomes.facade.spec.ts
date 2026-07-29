import { describe, it, expect } from 'vitest';
import { OUTCOMES_SEED } from '@core/data';

describe('OutcomesFacade (unit)', () => {
  it('should have valid prerequisite references in seed', () => {
    const missing = OUTCOMES_SEED.filter(o =>
      o.prerequisiteIds.some(p => !OUTCOMES_SEED.find(x => x.id === p))
    );
    expect(missing).toHaveLength(0);
  });

  it('should have all prerequisite chains resolve to existing outcomes', () => {
    const allIds = new Set(OUTCOMES_SEED.map(o => o.id));
    const ok = OUTCOMES_SEED.every(o =>
      o.prerequisiteIds.every(p => allIds.has(p))
    );
    expect(ok).toBe(true);
  });

  it('should detect self-referencing cycle', () => {
    const isCyclic = (id: number, prereq: number): boolean => {
      if (id === prereq) return true;
      const queue = [prereq];
      const seen = new Set<number>();
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (cur === id) return true;
        if (seen.has(cur)) continue;
        seen.add(cur);
        const node = OUTCOMES_SEED.find(o => o.id === cur);
        if (node) queue.push(...node.prerequisiteIds);
      }
      return false;
    };
    expect(isCyclic(100, 100)).toBe(true);
  });

  it('should detect deep cycle through chain', () => {
    const isCyclic = (id: number, prereq: number): boolean => {
      const queue = [prereq];
      const seen = new Set<number>();
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (cur === id) return true;
        if (seen.has(cur)) continue;
        seen.add(cur);
        const node = OUTCOMES_SEED.find(o => o.id === cur);
        if (node) queue.push(...node.prerequisiteIds);
      }
      return false;
    };
    expect(isCyclic(100, 103)).toBe(true);
    expect(isCyclic(106, 100)).toBe(false);
  });

  it('should have outcomes grouped by course', () => {
    const courseIds = new Set(OUTCOMES_SEED.map(o => o.courseId));
    expect(courseIds.size).toBeGreaterThan(0);
  });
});
