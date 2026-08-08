import { inject, signal, computed, effect } from '@angular/core';
import { Observable, of, map } from 'rxjs';
import { MockApiService } from '@core/api/mock-api.service';
import { CurrentUserService } from '@core/auth/current-user.service';
import { AuditService } from '@core/observability/audit.service';
import { NotificationService } from '@core/observability/notification.service';
import { SessionService } from '@core/auth/session.service';
import { OfflineQueueService } from '@core/storage/offline-queue.service';
import { StorageService } from '@core/storage/storage.service';
import { DraftStore } from '@core/storage/draft-store.service';
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
  private notification = inject(NotificationService);
  private sessionService = inject(SessionService);
  private offlineQueue = inject(OfflineQueueService);
  private storage = inject(StorageService);
  private store = inject(EntityStore);
  private gradingFacade = inject(GradingFacade);
  private draftStore = inject(DraftStore);

  private sessions = computed(() => this.store.sessions());
  private nextSessionId = Math.max(...this.store.sessions().map(s => s.id)) + 1;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    this.draftStore.loadInitial(this.storage.get<AnswerDraft[]>('exam_session_drafts') || ANSWER_DRAFTS_SEED);

    effect(() => {
      const updates = this.draftStore.remoteUpdates();
      if (updates.length === 0) return;
      for (const u of updates) {
        const session = this.sessions().find(s => s.id === u.sessionId);
        const idx = session?.questionOrder.indexOf(u.questionId) ?? -1;
        const num = idx >= 0 ? idx + 1 : '?';
        this.notification.show(`Soru ${num} cevabı güncellendi`, 'info', 3000);
      }
      this.draftStore.remoteUpdates.set([]);
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

  readonly activeSession = signal<ExamSession | null>(null);
  readonly currentQuestionIndex = signal(0);
  readonly markedQuestions = signal<number[]>([]);
  readonly timeRemaining = signal(0);
  readonly connectionStatus = signal<'online' | 'offline' | 'reconnecting'>('online');
  readonly saveStatus = signal<'idle' | 'saved' | 'saving' | 'offline' | 'conflict' | 'error'>('idle');
  readonly questionSaveStatus = signal<Map<number, 'idle' | 'saving' | 'saved' | 'offline' | 'conflict'>>(new Map());
  readonly conflictQuestionId = signal<number | null>(null);
  readonly timerReady = signal(false);

  getQuestionSaveStatus(questionId: number): 'idle' | 'saving' | 'saved' | 'offline' | 'conflict' {
    return this.questionSaveStatus().get(questionId) ?? 'idle';
  }

  private setQuestionSaveStatus(questionId: number, status: 'idle' | 'saving' | 'saved' | 'offline' | 'conflict'): void {
    this.questionSaveStatus.update(m => {
      const next = new Map(m);
      next.set(questionId, status);
      return next;
    });
  }

  getSession(token: string): Observable<ExamSession | undefined> {
    const session = this.sessions().find(s => s.token === token);
    if (session) {
      this.activeSession.set(session);
      this.timeRemaining.set(session.timeRemainingSeconds);
      this.timerReady.set(true);
      this.markedQuestions.set(session.markedQuestions);
      this.currentQuestionIndex.set(session.currentQuestionIndex);

      const drafts = this.draftStore.getBySession(session.id);
      const statusMap = new Map<number, 'idle' | 'saving' | 'saved' | 'offline' | 'conflict'>();
      for (const d of drafts) {
        if (d.answer) {
          statusMap.set(d.questionId, 'saved');
        }
      }
      this.questionSaveStatus.set(statusMap);
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

  startExamSession(exam: Exam, userId: number): Observable<ExamSession> {
    this.sessionService.endSessionsForExam(exam.id, userId);

    const oldSessions = this.sessions().filter(
      s => s.userId === userId && s.examId === exam.id && s.status === SessionStatus.ACTIVE
    );
    for (const s of oldSessions) {
      this.store.updateSession(s.id, { status: SessionStatus.EXPIRED });
    }

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

    return this.mockApi.getServerTime().pipe(
      map(serverNow => {
        session.serverTimeReference = serverNow;
        this.store.addSession(session);
        return session;
      })
    );
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
    return this.draftStore.get(sessionId, questionId);
  }

  saveAnswer(sessionId: number, questionId: number, answer: string): void {
    if (!this.canAnswer(sessionId)) return;
    const existing = this.draftStore.get(sessionId, questionId);

    this.setQuestionSaveStatus(questionId, 'saving');

    const newVersion = (existing?.version ?? 0) + 1;
    const draftData: AnswerDraft = {
      id: existing?.id ?? Date.now(),
      sessionId,
      questionId,
      answer,
      version: newVersion,
      isSynced: false,
      syncStatus: 'pending',
      lastSavedAt: new Date().toISOString(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const key = `${sessionId}_${questionId}`;
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!);
    }

    this.debounceTimers.set(key, setTimeout(() => {
      this.debounceTimers.delete(key);
      this.flushAnswer(sessionId, questionId, draftData);
    }, 300));
  }

  private flushAnswer(sessionId: number, questionId: number, draftData: AnswerDraft): void {
    if (this.connectionStatus() === 'offline') {
      this.draftStore.save(draftData);
      this.offlineQueue.enqueue({ type: 'PUT', url: '/api/drafts', body: draftData });
      this.saveStatus.set('offline');
      this.setQuestionSaveStatus(questionId, 'offline');
      return;
    }

    this.saveStatus.set('saving');
    const result = this.draftStore.save(draftData);
    if (result.conflict) {
      this.saveStatus.set('conflict');
      this.setQuestionSaveStatus(questionId, 'conflict');
      this.conflictQuestionId.set(questionId);
      return;
    }
    this.saveStatus.set('saved');
    this.setQuestionSaveStatus(questionId, 'saved');
  }

  resolveConflict(sessionId: number, questionId: number): void {
    const draft = this.draftStore.get(sessionId, questionId);
    if (!draft) return;
    this.saveStatus.set('saving');
    const result = this.draftStore.save({ ...draft, version: draft.version + 1 });
    if (result.ok) {
      this.saveStatus.set('saved');
      this.conflictQuestionId.set(null);
    } else {
      this.saveStatus.set('conflict');
    }
  }

  getSubmitSummary(sessionId: number, totalQuestions: number): { answered: number; unanswered: number; marked: number; unansweredNums: number[] } {
    const sessionDrafts = this.draftStore.getBySession(sessionId);
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

    for (const item of queue) {
      this.mockApi.post(item.body).subscribe({
        next: () => {
          const draft = item.body as AnswerDraft;
          this.draftStore.save({ ...draft, isSynced: true, syncStatus: 'synced' });
          this.offlineQueue.remove(item.id);
          if (this.offlineQueue.getQueue().length === 0) {
            this.connectionStatus.set('online');
            this.saveStatus.set('saved');
          }
        },
        error: () => {
          this.offlineQueue.incrementRetry(item.id);
        }
      });
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
    if (session) {
      this.store.updateSession(session.id, { status: SessionStatus.COMPLETED });
      this.submitAnswers(session, SessionStatus.COMPLETED);
    }
    this.activeSession.set(null);
    this.sessionService.endSession(token);
    return this.mockApi.post(true);
  }

  expireSession(token: string): void {
    const session = this.sessions().find(s => s.token === token);
    if (!session || session.status !== SessionStatus.ACTIVE) return;
    this.store.updateSession(session.id, { status: SessionStatus.EXPIRED });
    this.submitAnswers(session, SessionStatus.EXPIRED);
    this.sessionService.endSession(token);
    this.activeSession.set(null);
    this.audit.log({ action: AuditAction.SESSION_EXPIRE, entity: 'Session', entityId: session.id, description: 'Sınav oturumu süre aşımına uğradı', oldValue: { status: SessionStatus.ACTIVE }, newValue: { status: SessionStatus.EXPIRED } });
  }

  expireOverdueSessions(): void {
    const now = Date.now();
    for (const s of this.store.sessions()) {
      if (s.status !== SessionStatus.ACTIVE) continue;
      const deadline = Date.parse(s.startedAt) + s.durationMinutes * 60 * 1000;
      if (now >= deadline) {
        this.expireSession(s.token);
      }
    }
  }

  submitExpiredSession(token: string): Observable<boolean> {
    const session = this.sessions().find(s => s.token === token);
    if (!session) return this.mockApi.post(false);
    this.submitAnswers(session, SessionStatus.EXPIRED);
    this.activeSession.set(null);
    this.sessionService.endSession(token);
    return this.mockApi.post(true);
  }

  private submitAnswers(session: ExamSession, finalStatus: SessionStatus): void {
    const questions = this.getQuestions(session.examId);
    const sessionDrafts = this.draftStore.getBySession(session.id);
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
      studentId: user.studentId ?? user.id,
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

    const description = finalStatus === SessionStatus.EXPIRED ? 'Sınav oturumu süre aşımına uğradı' : 'Sınav oturumu tamamlandı';
    this.audit.log({ action: AuditAction.SUBMIT, entity: 'Attempt', entityId: session.examId, description: `Sınav gönderildi: Sınav #${session.examId} (${description.toLowerCase()})` });
  }

  simulateOffline(): void {
    this.connectionStatus.set('offline');
    this.saveStatus.set('offline');
    const qId = this.activeSession()?.questionOrder[this.currentQuestionIndex()];
    if (qId != null) this.setQuestionSaveStatus(qId, 'offline');
  }

  simulateOnline(): void {
    this.connectionStatus.set('online');
    this.saveStatus.set('saved');
    const qId = this.activeSession()?.questionOrder[this.currentQuestionIndex()];
    if (qId != null) this.setQuestionSaveStatus(qId, 'saved');
    this.syncQueuedAnswers();
  }
}
