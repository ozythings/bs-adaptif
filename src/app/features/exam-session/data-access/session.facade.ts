import { inject,  signal,  computed,  effect } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { MockApiService } from '@core/api/mock-api.service';
import { CurrentUserService } from '@core/auth/current-user.service';
import { AuditService } from '@core/observability/audit.service';
import { SessionService } from '@core/auth/session.service';
import { OfflineQueueService } from '@core/storage/offline-queue.service';
import { StorageService } from '@core/storage/storage.service';
import { EntityStore } from '@core/state/entity.store';
import { ANSWER_DRAFTS_SEED, ATTEMPTS_SEED } from '@core/data';
import { ExamSession } from '@core/models/exam-session.model';
import { Exam } from '@core/models/exam.model';
import { AnswerDraft } from '@core/models/answer-draft.model';
import { Attempt, QuestionResponse } from '@core/models/attempt.model';
import { Question } from '@core/models/question.model';
import { SessionStatus, AuditAction, ResultStatus } from '@core/models/enums';
import { autoScore } from '@core/engine';
import { GradingFacade } from '../../grading/data-access/grading.facade';
export class SessionFacade {
  private mockApi = inject(MockApiService);
  private currentUser = inject(CurrentUserService);
  private audit = inject(AuditService);
  private sessionService = inject(SessionService);
  private offlineQueue = inject(OfflineQueueService);
  private storage = inject(StorageService);
  private store = inject(EntityStore);
  private gradingFacade = inject(GradingFacade);

  private sessions = signal<ExamSession[]>(this.store.sessions());
  private drafts = signal<AnswerDraft[]>(this.loadDrafts());
  private nextSessionId = Math.max(...this.store.sessions().map(s => s.id)) + 1;
  private channel: BroadcastChannel;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private readonly DRAFTS_KEY = 'exam_session_drafts';

  constructor() {
    this.channel = new BroadcastChannel('bs_adaptif_sessions');
    this.channel.onmessage = (event) => {
      if (event.data?.type === 'draft_updated') {
        const session = this.activeSession();
        if (session && session.id === event.data.sessionId) {
          const draft = this.drafts().find(
            d => d.sessionId === session.id && d.questionId === event.data.questionId
          );
          if (draft) {
            this.saveStatus.set('conflict');
            this.conflictQuestionId.set(event.data.questionId);
          }
        }
      }
    };
    effect(() => {
      this.storage.set(this.DRAFTS_KEY, this.drafts());
    });

    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.connectionStatus.set('online');
      this.syncQueuedAnswers();
    });
    window.addEventListener('offline', () => {
      this.connectionStatus.set('offline');
      this.saveStatus.set('offline');
    });
    if (!navigator.onLine) {
      this.connectionStatus.set('offline');
    }
  }

  private loadDrafts(): AnswerDraft[] {
    return this.storage.get<AnswerDraft[]>(this.DRAFTS_KEY) || ANSWER_DRAFTS_SEED;
  }

  private notifyChannel(type: string, data?: unknown): void {
    this.channel.postMessage({ type, data });
  }

  readonly activeSession = signal<ExamSession | null>(null);
  readonly currentQuestionIndex = signal(0);
  readonly markedQuestions = signal<number[]>([]);
  readonly timeRemaining = signal(0);
  readonly connectionStatus = signal<'online' | 'offline' | 'reconnecting'>('online');
  readonly saveStatus = signal<'saved' | 'saving' | 'offline' | 'conflict' | 'error'>('saved');
  readonly conflictQuestionId = signal<number | null>(null);
  readonly timerReady = signal(false);

  getSession(token: string): Observable<ExamSession | undefined> {
    const session = this.sessions().find(s => s.token === token);
    if (session) {
      this.activeSession.set(session);
      this.timeRemaining.set(session.timeRemainingSeconds);
      this.timerReady.set(true);
      this.markedQuestions.set(session.markedQuestions);
      this.currentQuestionIndex.set(session.currentQuestionIndex);
    }
    return this.mockApi.get(session);
  }

  getActiveSessionsForUser(userId: number): ExamSession[] {
    return this.sessions().filter(s => s.userId === userId && s.status === SessionStatus.ACTIVE);
  }

  getAllActiveSessions(): ExamSession[] {
    return this.sessions().filter(s => s.status === SessionStatus.ACTIVE);
  }

  getActiveSessionForExam(examId: number, userId: number): ExamSession | undefined {
    return this.sessions().find(s => s.examId === examId && s.userId === userId && s.status === SessionStatus.ACTIVE);
  }

  canAnswer(sessionId: number): boolean {
    const session = this.sessions().find(s => s.id === sessionId);
    if (!session || session.status !== SessionStatus.ACTIVE) return false;
    const remaining = this.timerReady() ? this.timeRemaining() : session.timeRemainingSeconds;
    return remaining > 0;
  }

  startExamSession(exam: Exam, userId: number): ExamSession {
    this.sessionService.endSessionsForExam(exam.id, userId);

    const token = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    this.sessionService.startSession(exam.id, userId, token);

    const now = new Date();
    const questions = this.getQuestions(exam.id);
    const questionVersionIds = exam.questionVersionIds ?? {};
    questions.forEach(q => { if (!questionVersionIds[q.id]) questionVersionIds[q.id] = q.id; });
    const session: ExamSession = {
      id: this.nextSessionId++,
      token,
      examId: exam.id,
      userId,
      startedAt: now.toISOString(),
      serverTimeReference: now.toISOString(),
      durationMinutes: exam.duration,
      timeRemainingSeconds: exam.duration * 60,
      status: SessionStatus.ACTIVE,
      questionOrder: questions.map(q => q.id),
      currentQuestionIndex: 0,
      markedQuestions: [],
      connectionStatus: 'online',
      version: 1,
      questionVersionIds,
      questionSnapshots: questions.map(q => ({ ...q })),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.sessions.update(list => [...list, session]);
    return session;
  }

  getQuestions(examId: number) {
    const exam = this.store.exams().find(e => e.id === examId);
    if (exam?.questionVersionIds && Object.keys(exam.questionVersionIds).length > 0) {
      const ids = Object.keys(exam.questionVersionIds).map(Number);
      return this.store.questions().filter(q => ids.includes(q.id));
    }
    return this.store.questions().filter(q => q.examId === examId);
  }

  getQuestionOrder(session: ExamSession) {
    return session.questionOrder;
  }

  getDraft(sessionId: number, questionId: number): AnswerDraft | undefined {
    return this.drafts().find(d => d.sessionId === sessionId && d.questionId === questionId);
  }

  saveAnswer(sessionId: number, questionId: number, answer: string): void {
    if (!this.canAnswer(sessionId)) return;
    const existing = this.drafts().find(d => d.sessionId === sessionId && d.questionId === questionId);

    const newVersion = (existing?.version ?? 0) + 1;
    const draftData = {
      id: existing?.id ?? Date.now(),
      sessionId,
      questionId,
      answer,
      version: newVersion,
      isSynced: false,
      syncStatus: 'pending' as const,
      lastSavedAt: new Date().toISOString(),
    };

    if (existing) {
      this.drafts.update(list => list.map(d =>
        d.id === existing.id ? { ...d, ...draftData } : d
      ));
    } else {
      this.drafts.update(list => [...list, {
        ...draftData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        id: draftData.id,
      } as AnswerDraft]);
    }

    const key = `${sessionId}_${questionId}`;
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!);
    }

    this.debounceTimers.set(key, setTimeout(() => {
      this.debounceTimers.delete(key);
      this.flushAnswer(sessionId, questionId, draftData, existing);
    }, 1000));
  }

  private flushAnswer(sessionId: number, questionId: number, draftData: any, existing: AnswerDraft | undefined): void {
    if (this.connectionStatus() === 'offline') {
      this.offlineQueue.enqueue({ type: 'PUT', url: '/api/drafts', body: draftData });
      this.saveStatus.set('offline');
      return;
    }

    this.saveStatus.set('saving');
    this.mockApi.put(draftData, existing as any).subscribe({
      next: (result) => {
        this.drafts.update(list => list.map(d =>
          d.sessionId === sessionId && d.questionId === questionId
            ? { ...d, isSynced: true, syncStatus: 'synced' as const, version: (result as any)?.version ?? draftData.version }
            : d
        ));
        this.saveStatus.set('saved');
        this.notifyChannel('draft_updated', { sessionId, questionId });
      },
      error: () => {
        if (this.connectionStatus() === 'offline') {
          this.offlineQueue.enqueue({ type: 'PUT', url: '/api/drafts', body: draftData });
          this.saveStatus.set('offline');
        } else {
          this.saveStatus.set('error');
        }
      }
    });
  }

  resolveConflict(sessionId: number, questionId: number): void {
    const draft = this.drafts().find(d => d.sessionId === sessionId && d.questionId === questionId);
    if (!draft) return;
    this.saveStatus.set('saving');
    this.mockApi.put(draft, draft).subscribe({
      next: () => {
        this.drafts.update(list => list.map(d =>
          d.id === draft.id ? { ...d, isSynced: true, syncStatus: 'synced' as const } : d
        ));
        this.saveStatus.set('saved');
        this.conflictQuestionId.set(null);
      },
      error: () => this.saveStatus.set('conflict')
    });
  }

  getSubmitSummary(sessionId: number, totalQuestions: number): { answered: number; unanswered: number; marked: number; unansweredNums: number[] } {
    const sessionDrafts = this.drafts().filter(d => d.sessionId === sessionId);
    const answeredIds = new Set(sessionDrafts.filter(d => d.answer?.trim()).map(d => d.questionId));
    const allOrder = this.sessions().find(s => s.id === sessionId)?.questionOrder || [];
    const unansweredNums = allOrder
      .map((id, i) => ({ id, num: i + 1 }))
      .filter(({ id }) => !answeredIds.has(id))
      .map(({ num }) => num);
    return {
      answered: answeredIds.size,
      unanswered: totalQuestions - answeredIds.size,
      marked: this.markedQuestions().length,
      unansweredNums,
    };
  }

  syncQueuedAnswers(): void {
    const queue = [...this.offlineQueue.getQueue()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    if (queue.length === 0) return;

    this.connectionStatus.set('reconnecting');
    let delay = 300;

    for (const item of queue) {
      this.mockApi.post(item.body).subscribe({
        next: () => {
          this.offlineQueue.remove(item.id);
          const body = item.body as any;
          if (body.sessionId && body.questionId) {
            this.drafts.update(list => list.map(d =>
              d.sessionId === body.sessionId && d.questionId === body.questionId
                ? { ...d, isSynced: true, syncStatus: 'synced' as const }
                : d
            ));
          }
          delay = 300;
        },
        error: () => {
          this.offlineQueue.incrementRetry(item.id);
          delay = Math.min(delay * 2, 5000);
        }
      });
    }

    if (this.offlineQueue.getQueue().length === 0) {
      this.connectionStatus.set('online');
      this.saveStatus.set('saved');
    } else {
      setTimeout(() => this.syncQueuedAnswers(), delay);
    }
  }

  toggleMark(questionId: number): void {
    this.markedQuestions.update(list =>
      list.includes(questionId) ? list.filter(q => q !== questionId) : [...list, questionId]
    );
  }

  goToQuestion(index: number): void {
    this.currentQuestionIndex.set(index);
  }

  submitSession(token: string): Observable<boolean> {
    const session = this.sessions().find(s => s.token === token);
    this.sessions.update(list => list.map(s =>
      s.token === token ? { ...s, status: SessionStatus.COMPLETED } : s
    ));
    if (session) {
      this.store.updateSession(session.id, { status: SessionStatus.COMPLETED });
    }
    this.activeSession.set(null);
    this.sessionService.endSession(token);

    if (session) {
      const questions = this.getQuestions(session.examId);
      const sessionDrafts = this.drafts().filter(d => d.sessionId === session.id);
      const questionResponses: QuestionResponse[] = questions.map(q => {
        const draft = sessionDrafts.find(d => d.questionId === q.id);
        const answer = draft?.answer ?? '';
        const result = autoScore({
          response: { questionId: q.id, answer, isCorrect: false, autoScore: 0, maxScore: q.points },
          question: q,
        });
        return {
          questionId: q.id,
          answer,
          isCorrect: result.isCorrect,
          autoScore: result.autoScore,
          maxScore: q.points,
        };
      });
      const totalScore = questionResponses.reduce((s, r) => s + r.autoScore, 0);
      const maxScore = questionResponses.reduce((s, r) => s + r.maxScore, 0);
      const scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0;
      const now = new Date().toISOString();
      const user = this.currentUser.getUser();
      const newAttempt: Attempt = {
        id: Math.max(0, ...ATTEMPTS_SEED.map(a => a.id)) + 1,
        examId: session.examId,
        sessionToken: session.token,
        studentId: user.participantId ?? user.id,
        startedAt: session.startedAt,
        submittedAt: now,
        status: ResultStatus.DRAFT,
        questionResponses,
        totalScore,
        maxScore,
        scorePercentage,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      ATTEMPTS_SEED.push(newAttempt);
      this.gradingFacade.syncFromSeed();

      this.audit.log({ action: AuditAction.SESSION_END, entity: 'Session', entityId: session.id, description: 'Sınav oturumu tamamlandı', oldValue: { status: session.status }, newValue: { status: SessionStatus.COMPLETED } });
      this.audit.log({ action: AuditAction.SUBMIT, entity: 'Attempt', entityId: session.examId, description: `Sınav gönderildi: Sınav #${session.examId}` });
    }
    return this.mockApi.post(true);
  }

  expireSession(token: string): void {
    const session = this.sessions().find(s => s.token === token);
    if (!session || session.status !== SessionStatus.ACTIVE) return;
    this.sessions.update(list => list.map(s =>
      s.token === token ? { ...s, status: SessionStatus.EXPIRED } : s
    ));
    this.store.updateSession(session.id, { status: SessionStatus.EXPIRED });
    this.sessionService.endSession(token);
    this.audit.log({ action: AuditAction.SESSION_EXPIRE, entity: 'Session', entityId: session.id, description: 'Sınav oturumu süre aşımına uğradı', oldValue: { status: session.status }, newValue: { status: SessionStatus.EXPIRED } });
  }

  simulateOffline(): void {
    this.connectionStatus.set('offline');
    this.saveStatus.set('offline');
  }

  simulateOnline(): void {
    this.connectionStatus.set('online');
    this.saveStatus.set('saved');
    this.syncQueuedAnswers();
  }
}
