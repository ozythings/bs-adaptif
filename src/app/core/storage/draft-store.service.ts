import { inject, signal, effect } from '@angular/core';
import { AnswerDraft } from '@core/models/answer-draft.model';
import { StorageService } from './storage.service';

const DRAFT_STORAGE_KEY = 'exam_session_drafts';

export interface DraftSaveResult {
  ok: boolean;
  conflict: boolean;
  serverDraft?: AnswerDraft;
  saved?: AnswerDraft;
}

export class DraftStore {
  private storage = inject(StorageService);
  private inner = signal(new Map<string, AnswerDraft>());
  private merging = false;

  readonly version = signal(0);
  readonly isOffline = signal(false);
  readonly remoteUpdates = signal<Array<{ sessionId: number; questionId: number; answer: string }>>([]);

  constructor() {
    const cached = this.storage.get<AnswerDraft[]>(DRAFT_STORAGE_KEY) || [];
    const map = new Map<string, AnswerDraft>();
    for (const d of cached) {
      map.set(`${d.sessionId}_${d.questionId}`, d);
    }
    this.inner.set(map);

    effect(() => {
      if (this.merging || this.isOffline()) return;
      const snapshot = [...this.inner().values()];
      this.storage.set(DRAFT_STORAGE_KEY, snapshot);
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === this.storage.prefixedKey(DRAFT_STORAGE_KEY) && event.newValue) {
          try {
            const remote = JSON.parse(event.newValue) as AnswerDraft[];
            this.mergeRemoteDrafts(remote);
          } catch { /* ignore */ }
        }
      });
    }
  }

  get(sessionId: number, questionId: number): AnswerDraft | undefined {
    return this.inner().get(`${sessionId}_${questionId}`);
  }

  save(draft: AnswerDraft): DraftSaveResult {
    const key = `${draft.sessionId}_${draft.questionId}`;
    const map = new Map(this.inner());
    const existing = map.get(key);

    if (existing && draft.version <= existing.version) {
      return { ok: false, conflict: true, serverDraft: existing };
    }

    const saved: AnswerDraft = {
      ...draft,
      version: (existing?.version ?? 0) + 1,
      isSynced: true,
      syncStatus: 'synced',
    };
    map.set(key, saved);
    this.inner.set(map);
    this.version.update(v => v + 1);
    return { ok: true, conflict: false, saved };
  }

  getBySession(sessionId: number): AnswerDraft[] {
    return [...this.inner().values()].filter(d => d.sessionId === sessionId);
  }

  getAll(): AnswerDraft[] {
    return [...this.inner().values()];
  }

  loadInitial(drafts: AnswerDraft[]): void {
    const map = new Map(this.inner());
    let changed = false;
    for (const d of drafts) {
      const key = `${d.sessionId}_${d.questionId}`;
      if (!map.has(key)) {
        map.set(key, d);
        changed = true;
      }
    }
    if (changed) {
      this.inner.set(map);
    }
  }

  flushPending(): void {
    const snapshot = [...this.inner().values()];
    this.storage.set(DRAFT_STORAGE_KEY, snapshot);
  }

  private mergeRemoteDrafts(remote: AnswerDraft[]): void {
    this.merging = true;
    const map = new Map(this.inner());
    const updated: Array<{ sessionId: number; questionId: number; answer: string }> = [];

    for (const remoteDraft of remote) {
      const key = `${remoteDraft.sessionId}_${remoteDraft.questionId}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, remoteDraft);
        if (remoteDraft.answer) {
          updated.push({ sessionId: remoteDraft.sessionId, questionId: remoteDraft.questionId, answer: remoteDraft.answer });
        }
      } else if (remoteDraft.version > existing.version) {
        map.set(key, remoteDraft);
        if (remoteDraft.answer) {
          updated.push({ sessionId: remoteDraft.sessionId, questionId: remoteDraft.questionId, answer: remoteDraft.answer });
        }
      }
    }

    if (updated.length > 0) {
      this.inner.set(map);
      this.remoteUpdates.set(updated);
    }
    this.merging = false;
  }
}
