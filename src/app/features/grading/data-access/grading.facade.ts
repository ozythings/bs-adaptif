import { inject,  signal,  computed } from '@angular/core';
import { Observable } from 'rxjs';
import { Attempt, QuestionResponse } from '@core/models/attempt.model';
import { Rubric, RubricScore, GradingResult } from '@core/models/rubric.model';
import { ResultStatus, AuditAction, QuestionType, UserRole } from '@core/models/enums';
import { Question } from '@core/models/question.model';
import { MockApiService } from '@core/api/mock-api.service';
import { StorageService } from '@core/storage/storage.service';
import { AuditService } from '@core/observability/audit.service';
import { CurrentUserService } from '@core/auth/current-user.service';
import { NotificationService } from '@core/observability/notification.service';
import { OptimisticService } from '@core/optimistic/optimistic.service';
import { DataScopeService } from '@core/auth/data-scope.service';
import { ATTEMPTS_SEED, RUBRICS_SEED, QUESTIONS_SEED, PARTICIPANTS_SEED, EXAMS_SEED } from '@core/data';
import { ItemAnalysisFacade } from '../../item-analysis/data-access/item-analysis.facade';

export interface GradingHistoryEntry {
  attemptId: number;
  questionId: number;
  gradedAt: string;
  totalScore: number;
  previousScore: number;
  changeReason?: string;
}
export class GradingFacade {
  private mockApi = inject(MockApiService);
  private storage = inject(StorageService);
  private audit = inject(AuditService);
  private currentUser = inject(CurrentUserService);
  private notification = inject(NotificationService);
  private optimistic = inject(OptimisticService);
  private dataScope = inject(DataScopeService);

  private readonly ATTEMPTS_KEY = 'grading_attempts';
  private readonly RUBRICS_KEY = 'grading_rubrics';
  private readonly QUESTIONS_KEY = 'grading_questions';
  private readonly HISTORY_KEY = 'grading_history';

  private attemptsSignal = signal<Attempt[]>(this.loadData<Attempt[]>(this.ATTEMPTS_KEY, ATTEMPTS_SEED));
  private rubricsSignal = signal<Rubric[]>(this.loadData<Rubric[]>(this.RUBRICS_KEY, RUBRICS_SEED));
  private questionsSignal = signal<Question[]>(this.loadData<Question[]>(this.QUESTIONS_KEY, QUESTIONS_SEED));
  private historySignal = signal<GradingHistoryEntry[]>(this.loadData<GradingHistoryEntry[]>(this.HISTORY_KEY, []));
  private itemAnalysisFacade = inject(ItemAnalysisFacade);

  readonly gradingHistory = this.historySignal.asReadonly();

  readonly pendingAttempts = computed(() => {
    const scope = this.dataScope.getScope();
    let attempts = this.attemptsSignal().filter(a => a.status === ResultStatus.DRAFT);
    if (scope.allowedStudentIds) {
      attempts = attempts.filter(a => scope.allowedStudentIds!.includes(a.studentId));
    }
    return attempts;
  });

  private questionTypeOverrides: Record<number, QuestionType> = {
    11: QuestionType.SHORT_ANSWER,
    12: QuestionType.ESSAY,
  };

  private loadData<T>(key: string, fallback: T): T {
    const stored = this.storage.get<T>(key);
    if (stored) return stored;
    this.storage.set(key, fallback);
    return fallback;
  }

  private saveAttempts(attempts: Attempt[]): void {
    this.storage.set(this.ATTEMPTS_KEY, attempts);
    this.attemptsSignal.set(attempts);
  }

  private saveHistory(history: GradingHistoryEntry[]): void {
    this.storage.set(this.HISTORY_KEY, history);
    this.historySignal.set(history);
  }

  getPendingGrading(): Observable<Attempt[]> {
    this.syncFromSeed();
    return this.mockApi.get(this.pendingAttempts());
  }

  syncFromSeed(): void {
    const stored = this.storage.get<Attempt[]>(this.ATTEMPTS_KEY);
    const existing = stored ? [...stored] : [...this.attemptsSignal()];
    const existingIds = new Set(existing.map(a => a.id));
    for (const a of ATTEMPTS_SEED) {
      if (!existingIds.has(a.id)) existing.push(a);
    }
    this.saveAttempts(existing);
  }

  getAttempt(id: number): Observable<Attempt | undefined> {
    const attempt = this.attemptsSignal().find(a => a.id === id);
    return this.mockApi.get(attempt);
  }

  getQuestion(questionId: number): Question | undefined {
    return this.questionsSignal().find(q => q.id === questionId);
  }

  getStudentName(studentId: number): string {
    const participant = PARTICIPANTS_SEED.find(p => p.id === studentId);
    return participant ? `${participant.firstName} ${participant.lastName}` : `Öğrenci #${studentId}`;
  }

  getExamName(examId: number): string {
    return EXAMS_SEED.find(e => e.id === examId)?.title ?? `Sınav #${examId}`;
  }

  getExamTitles(): { id: number; title: string }[] {
    return EXAMS_SEED.filter(e => !e.deletedAt).map(e => ({ id: e.id, title: e.title }));
  }

  getQuestionText(questionId: number): string {
    return this.questionsSignal().find(q => q.id === questionId)?.questionText ?? `Soru #${questionId}`;
  }

  getQuestionType(questionId: number): QuestionType {
    return this.questionTypeOverrides[questionId] ?? QuestionType.MULTIPLE_CHOICE;
  }

  getRubric(questionId: number): Observable<Rubric | undefined> {
    return this.mockApi.get(this.getRubricSync(questionId));
  }

  getRubricSync(questionId: number): Rubric | undefined {
    const type = this.getQuestionType(questionId);
    return this.rubricsSignal().find(r => {
      if (type === QuestionType.SHORT_ANSWER && r.name.includes('Kisa Cevap')) return true;
      if (type === QuestionType.ESSAY && r.name.includes('Essay')) return true;
      return false;
    });
  }

  gradeQuestion(
    attemptId: number,
    questionId: number,
    scores: RubricScore[],
    comment: string,
    changeReason?: string
  ): Observable<GradingResult> {
    if (!this.canManage()) {
      this.notification.show('Bu işlem için yetkiniz bulunmamaktadır', 'error');
      return this.mockApi.post(undefined as any);
    }
    const attempts = this.attemptsSignal();
    const attempt = attempts.find(a => a.id === attemptId);
    if (!attempt) {
      this.notification.show('Deneme bulunamadı', 'error');
      return this.mockApi.post(undefined as any);
    }

    const user = this.currentUser.getUser();

    const responseIndex = attempt.questionResponses.findIndex(r => r.questionId === questionId);
    if (responseIndex === -1) {
      this.notification.show('Soru cevabı bulunamadı', 'error');
      return this.mockApi.post(undefined as any);
    }

    const existingResponse = attempt.questionResponses[responseIndex];
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const previousScore = existingResponse.autoScore;

    if (totalScore !== previousScore && !changeReason) {
      this.notification.show('Puan farklılığı için değişiklik sebebi gereklidir', 'error');
      return this.mockApi.post(undefined as any);
    }

    const previousAttempts = [...this.attemptsSignal()];
    const previousHistory = [...this.historySignal()];

    const updatedResponses = [...attempt.questionResponses];
    updatedResponses[responseIndex] = {
      ...existingResponse,
      manualScore: totalScore,
      gradedBy: user.id,
      gradedAt: new Date().toISOString(),
      gradingNote: comment,
    };

    const totalManual = updatedResponses.reduce(
      (sum, r) => sum + (r.manualScore ?? r.autoScore), 0
    );
    const updatedAttempt: Attempt = {
      ...attempt,
      questionResponses: updatedResponses,
      totalScore: totalManual,
      scorePercentage: Math.round((totalManual / attempt.maxScore) * 10000) / 100,
      updatedAt: new Date().toISOString(),
    };

    const updatedAttempts = attempts.map(a => a.id === attemptId ? updatedAttempt : a);

    const historyEntry: GradingHistoryEntry = {
      attemptId,
      questionId,
      gradedAt: new Date().toISOString(),
      totalScore,
      previousScore,
      changeReason,
    };

    this.audit.log({
      action: totalScore !== previousScore ? AuditAction.OVERRIDE : AuditAction.GRADE,
      entity: 'Attempt',
      entityId: attemptId,
      description: `Soru #${questionId} değerlendirildi: ${previousScore} -> ${totalScore}`,
      newValue: { scores, comment, changeReason },
    });

    const result: GradingResult = {
      attemptId,
      questionId,
      scores,
      totalScore,
      comment,
      gradedBy: user.id,
      gradedAt: new Date().toISOString(),
      previousScore,
      changeReason,
    };

    return this.optimistic.execute(
      () => {
        this.saveAttempts(updatedAttempts);
        this.saveHistory([...this.historySignal(), historyEntry]);
        this.notification.show('Değerlendirme kaydedildi', 'success');
      },
      () => {
        this.saveAttempts(previousAttempts);
        this.saveHistory(previousHistory);
      },
      () => this.mockApi.post(result)
    );
  }

  finalizeGrading(attemptId: number): Observable<Attempt | undefined> {
    if (!this.canManage()) {
      this.notification.show('Bu işlem için yetkiniz bulunmamaktadır', 'error');
      return this.mockApi.put(undefined);
    }
    const attempts = this.attemptsSignal();
    const attemptIndex = attempts.findIndex(a => a.id === attemptId);
    if (attemptIndex === -1) {
      this.notification.show('Deneme bulunamadı', 'error');
      return this.mockApi.put(undefined);
    }

    const updated = {
      ...attempts[attemptIndex],
      status: ResultStatus.FINALIZED,
      gradingCompletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedAttempts = [...attempts];
    updatedAttempts[attemptIndex] = updated;
    this.saveAttempts(updatedAttempts);

    this.audit.log({
      action: AuditAction.GRADE,
      entity: 'Attempt',
      entityId: attemptId,
      description: 'Değerlendirme tamamlandı ve sonuçlandırıldı',
      oldValue: { status: attempts[attemptIndex].status },
      newValue: { status: ResultStatus.FINALIZED },
    });

    this.notification.show('Değerlendirme sonuçlandırıldı', 'success');
    this.itemAnalysisFacade.recompute();
    return this.mockApi.put(updated);
  }

  private canManage(): boolean {
    return this.currentUser.hasAnyRole([UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN]);
  }
}
