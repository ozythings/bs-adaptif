const SNAPSHOT_KEY = 'bs_adaptif_seed_snapshot';

export type SeedSnapshot = Record<string, unknown[]>;

let autoSaveEnabled = true;

function isBrowser(): boolean {
  return typeof localStorage !== 'undefined';
}

export function loadSnapshot(): SeedSnapshot | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SeedSnapshot;
  } catch {
    return null;
  }
}

export function saveSnapshot(seeds: SeedSnapshot): void {
  if (!isBrowser() || !autoSaveEnabled) return;
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(seeds));
  } catch {
    // storage full or unavailable — keep the session in-memory
  }
}

export function enableAutoSave(seeds: SeedSnapshot): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeunload', () => {
    saveSnapshot(seeds);
  });
}

export function clearSnapshot(): void {
  autoSaveEnabled = false;
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    // ignore
  }
}
