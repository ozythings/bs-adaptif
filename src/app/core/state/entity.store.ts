import { inject, signal, effect } from '@angular/core';
import { Exam } from '@core/models/exam.model';
import { ExamBlueprint } from '@core/models/exam-blueprint.model';
import { Question } from '@core/models/question.model';
import { ExamSession } from '@core/models/exam-session.model';
import { StorageService } from '@core/storage/storage.service';
import { EXAMS_SEED, BLUEPRINTS_SEED, QUESTIONS_SEED, EXAM_SESSIONS_SEED } from '@core/data';

const SESSION_STORAGE_KEY = 'exam_sessions';
const EXAMS_STORAGE_KEY = 'entity_exams';
const BLUEPRINTS_STORAGE_KEY = 'entity_blueprints';
const QUESTIONS_STORAGE_KEY = 'entity_questions';
const DATA_VERSION_KEY = 'entity_data_version';
const DATA_VERSION = 1;

export class EntityStore {
  private storage = inject(StorageService);

  readonly exams = signal<Exam[]>(this.hydrateExams());
  readonly blueprints = signal<ExamBlueprint[]>(this.hydrateBlueprints());
  readonly questions = signal<Question[]>(this.hydrateQuestions());
  readonly sessions = signal<ExamSession[]>(this.hydrateSessions());

  constructor() {
    effect(() => {
      const current = this.sessions();
      const cached = this.storage.get<ExamSession[]>(SESSION_STORAGE_KEY) || [];
      if (cached.length === 0) {
        this.storage.set(SESSION_STORAGE_KEY, current);
        return;
      }
      const merged = new Map(cached.map(s => [s.id, s]));
      current.forEach(s => {
        const existing = merged.get(s.id);
        if (!existing || isNewer(s, existing)) {
          merged.set(s.id, s);
        }
      });
      this.storage.set(SESSION_STORAGE_KEY, [...merged.values()]);
    });

    effect(() => {
      this.storage.set(DATA_VERSION_KEY, DATA_VERSION);
      this.storage.set(EXAMS_STORAGE_KEY, this.exams());
    });

    effect(() => {
      this.storage.set(DATA_VERSION_KEY, DATA_VERSION);
      this.storage.set(BLUEPRINTS_STORAGE_KEY, this.blueprints());
    });

    effect(() => {
      this.storage.set(DATA_VERSION_KEY, DATA_VERSION);
      this.storage.set(QUESTIONS_STORAGE_KEY, this.questions());
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === this.storage.prefixedKey(SESSION_STORAGE_KEY) && event.newValue) {
          try {
            const remote = JSON.parse(event.newValue) as ExamSession[];
            this.mergeRemoteSessions(remote);
          } catch { /* ignore */ }
        }
      });
    }
  }

  /**
   * Seed data is only ever used as a *starting point*. We always copy it so the
   * shared module-level array (EXAM_SESSIONS_SEED) never becomes an alias of the
   * live signal value. Mutating that shared array was the root cause of the
   * duplicate-session bug and the cross-instance/SSR staleness bug.
   */
  private hydrateSessions(): ExamSession[] {
    const cached = this.storage.get<ExamSession[]>(SESSION_STORAGE_KEY);
    if (cached && cached.length > 0) return cached;
    return [...EXAM_SESSIONS_SEED];
  }

  private hydrateExams(): Exam[] {
    if (this.storage.get<number>(DATA_VERSION_KEY) !== DATA_VERSION) return [...EXAMS_SEED];
    const cached = this.storage.get<Exam[]>(EXAMS_STORAGE_KEY);
    if (cached && cached.length > 0) return cached;
    return [...EXAMS_SEED];
  }

  private hydrateBlueprints(): ExamBlueprint[] {
    if (this.storage.get<number>(DATA_VERSION_KEY) !== DATA_VERSION) return [...BLUEPRINTS_SEED];
    const cached = this.storage.get<ExamBlueprint[]>(BLUEPRINTS_STORAGE_KEY);
    if (cached && cached.length > 0) return cached;
    return [...BLUEPRINTS_SEED];
  }

  private hydrateQuestions(): Question[] {
    if (this.storage.get<number>(DATA_VERSION_KEY) !== DATA_VERSION) return [...QUESTIONS_SEED];
    const cached = this.storage.get<Question[]>(QUESTIONS_STORAGE_KEY);
    if (cached && cached.length > 0) return cached;
    return [...QUESTIONS_SEED];
  }

  /**
   * Merge sessions coming from another tab. Replaces sessions we already have
   * (so edits from another tab aren't silently dropped) and appends new ones,
   * instead of only appending unseen ids.
   */
  private mergeRemoteSessions(remote: ExamSession[]): void {
    const merged = new Map(this.sessions().map(s => [s.id, s] as const));
    let changed = false;

    for (const remoteSession of remote) {
      const existing = merged.get(remoteSession.id);
      if (!existing) {
        merged.set(remoteSession.id, remoteSession);
        changed = true;
      } else if (isNewer(remoteSession, existing)) {
        merged.set(remoteSession.id, remoteSession);
        changed = true;
      }
    }

    if (changed) {
      this.sessions.set([...merged.values()]);
    }
  }

  updateExam(id: number, patch: Partial<Exam>): void {
    this.exams.update(list => list.map(e => e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e));
  }

  addExam(exam: Exam): void {
    this.exams.update(list => [...list, exam]);
  }

  addBlueprint(blueprint: ExamBlueprint): void {
    this.blueprints.update(list => [...list, blueprint]);
  }

  updateBlueprint(id: number, patch: Partial<ExamBlueprint>): void {
    this.blueprints.update(list => list.map(b => b.id === id ? { ...b, ...patch, updatedAt: new Date().toISOString() } : b));
  }

  removeBlueprint(id: number): void {
    this.blueprints.update(list => list.filter(b => b.id !== id));
  }

  addSession(session: ExamSession): void {
    // Only the signal is the source of truth now. The persistence effect
    // (constructor) takes care of writing it to storage for other tabs.
    this.sessions.update(list => [...list, session]);
  }

  updateSession(id: number, patch: Partial<ExamSession>): void {
    this.sessions.update(list => list.map(s => s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s));
  }

  addQuestion(question: Question): void {
    this.questions.update(list => [...list, question]);
  }

  updateQuestion(id: number, patch: Partial<Question>): void {
    this.questions.update(list => list.map(q => q.id === id ? { ...q, ...patch } : q));
  }
}

/**
 * Prefer the remote session if it looks newer. Falls back to "remote wins"
 * when there's no updatedAt to compare, which matches the old behavior for
 * brand-new sessions but no longer silently drops edits.
 */
function isNewer(remote: ExamSession, local: ExamSession): boolean {
  const remoteTime = (remote as any).updatedAt ? Date.parse((remote as any).updatedAt) : NaN;
  const localTime = (local as any).updatedAt ? Date.parse((local as any).updatedAt) : NaN;
  if (!isNaN(remoteTime) && !isNaN(localTime)) return remoteTime > localTime;
  return true;
}
