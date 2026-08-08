const SNAPSHOT_KEY = 'bs_adaptif_seed_snapshot';
const SNAPSHOT_VERSION = 10;

export type SeedSnapshot = Record<string, unknown[]> & { __version?: number };

let autoSaveEnabled = true;

function isBrowser(): boolean {
  return typeof localStorage !== 'undefined';
}

export function loadSnapshot(): SeedSnapshot | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SeedSnapshot;
    if (parsed.__version !== SNAPSHOT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSnapshot(seeds: SeedSnapshot): void {
  if (!isBrowser() || !autoSaveEnabled) return;
  try {
    const withVersion = { ...seeds, __version: SNAPSHOT_VERSION };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(withVersion));
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
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('bs_adaptif_')) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // ignore
  }
}
