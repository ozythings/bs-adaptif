import { LearningOutcome } from '@core/models/learning-outcome.model';

export function hasCycle(
  outcomes: LearningOutcome[],
  outcomeId: number,
  prerequisiteId: number
): boolean {
  if (outcomeId === prerequisiteId) return true;
  return dependsOn(outcomes, prerequisiteId, outcomeId);
}

function dependsOn(
  outcomes: LearningOutcome[],
  sourceId: number,
  targetId: number,
  visited = new Set<number>()
): boolean {
  if (sourceId === targetId) return true;
  if (visited.has(sourceId)) return false;
  visited.add(sourceId);
  const node = outcomes.find(o => o.id === sourceId);
  if (!node) return false;
  return node.prerequisiteIds.some(pid => dependsOn(outcomes, pid, targetId, visited));
}

export type CycleGroup = number[];

export function findCyclePath(
  outcomes: LearningOutcome[],
  startId: number,
  targetId: number
): number[] | null {
  const path: number[] = [startId];
  const visited = new Set<number>([startId]);
  if (dfsPath(outcomes, startId, targetId, path, visited)) {
    return path;
  }
  return null;
}

function dfsPath(
  outcomes: LearningOutcome[],
  currentId: number,
  targetId: number,
  path: number[],
  visited: Set<number>
): boolean {
  if (currentId === targetId) return true;
  const node = outcomes.find(o => o.id === currentId);
  if (!node) return false;
  for (const pid of node.prerequisiteIds) {
    if (visited.has(pid)) continue;
    visited.add(pid);
    path.push(pid);
    if (dfsPath(outcomes, pid, targetId, path, visited)) return true;
    path.pop();
  }
  return false;
}
