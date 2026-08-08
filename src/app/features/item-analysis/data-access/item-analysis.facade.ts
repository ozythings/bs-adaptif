import { inject,  signal } from '@angular/core';
import { Observable } from 'rxjs';
import { MockApiService } from '@core/api/mock-api.service';
import { StorageService } from '@core/storage/storage.service';
import { ItemAnalysis, DistractorAnalysis } from '@core/models/item-analysis.model';
import { AuditService } from '@core/observability/audit.service';
import { AuditAction, QuestionType } from '@core/models/enums';
import { ATTEMPTS_SEED, QUESTIONS_SEED } from '@core/data';
import { SNAPSHOT_VERSION } from '@core/data/seed-persist';
import { Attempt } from '@core/models/attempt.model';
import { Question } from '@core/models/question.model';
import { memoizeWithKey } from '@shared/utils/memoize';

const memoizedCompute = memoizeWithKey(
  (questions: Question[], attempts: Attempt[]): ItemAnalysis[] => {
    const now = new Date().toISOString();
    const results: ItemAnalysis[] = [];

    for (const q of questions) {
      const questionAttempts = attempts.filter(a =>
        a.questionResponses.some(r => r.questionId === q.id)
      );

      if (questionAttempts.length === 0) continue;

      const responses = questionAttempts.flatMap(a =>
        a.questionResponses.filter(r => r.questionId === q.id).map(r => ({
          ...r,
          studentId: a.studentId,
          totalScore: a.totalScore,
        }))
      );

      const sampleSize = responses.length;
      const correctCount = responses.filter(r => r.isCorrect).length;
      const difficultyIndex = sampleSize > 0 ? Math.round((correctCount / sampleSize) * 100) / 100 : 0;

      const sorted = [...questionAttempts]
        .map(a => ({ studentId: a.studentId, totalScore: a.totalScore }))
        .sort((a, b) => b.totalScore - a.totalScore);

      const splitIdx = Math.max(1, Math.round(sorted.length * 0.27));
      const upper = sorted.slice(0, splitIdx);
      const lower = sorted.slice(-splitIdx);

      const upperCorrect = upper.filter(s => {
        const resp = questionAttempts.find(a => a.studentId === s.studentId);
        return resp?.questionResponses.find(r => r.questionId === q.id)?.isCorrect ?? false;
      }).length;

      const lowerCorrect = lower.filter(s => {
        const resp = questionAttempts.find(a => a.studentId === s.studentId);
        return resp?.questionResponses.find(r => r.questionId === q.id)?.isCorrect ?? false;
      }).length;

      const upperGroupRate = upper.length > 0 ? Math.round((upperCorrect / upper.length) * 100) / 100 : 0;
      const lowerGroupRate = lower.length > 0 ? Math.round((lowerCorrect / lower.length) * 100) / 100 : 0;
      const discriminationIndex = Math.round((upperGroupRate - lowerGroupRate) * 100) / 100;

      const correctRate = sampleSize > 0 ? correctCount / sampleSize : 0;
      const meanTotal = sorted.reduce((s, a) => s + a.totalScore, 0) / sorted.length;
      const stdTotal = Math.sqrt(
        sorted.reduce((s, a) => s + Math.pow(a.totalScore - meanTotal, 2), 0) / sorted.length
      );
      const correctTotalMean = responses
        .filter(r => r.isCorrect)
        .reduce((s, r) => s + r.totalScore, 0) / Math.max(correctCount, 1);
      const pointBiserial = stdTotal > 0
        ? Math.round(((correctTotalMean - meanTotal) / stdTotal * Math.sqrt(correctRate * (1 - correctRate))) * 100) / 100
        : 0;

      const distractorAnalysis: DistractorAnalysis[] = (q.type === QuestionType.MULTIPLE_CHOICE && q.options)
        ? q.options.map((opt, i) => ({
            optionKey: i.toString(),
            optionValue: opt,
            selectionRate: sampleSize > 0
              ? Math.round((responses.filter(r => r.answer === i.toString()).length / sampleSize) * 100) / 100
              : 0,
            isCorrect: i === q.correctAnswer,
          }))
        : [];

      results.push({
        id: q.id,
        questionId: q.id,
        examId: q.examId,
        difficultyIndex,
        discriminationIndex,
        pointBiserial,
        distractorAnalysis,
        upperGroupRate,
        lowerGroupRate,
        sampleSize,
        status: 'computed' as const,
        version: 1,
        calculatedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return results;
  },
  (questions: Question[], attempts: Attempt[]) =>
    questions.length + '|' + attempts.map(a => a.id + ':' + a.totalScore).join(',')
);
export class ItemAnalysisFacade {
  private mockApi = inject(MockApiService);
  private storage = inject(StorageService);
  private audit = inject(AuditService);

  private analyses = signal<ItemAnalysis[]>([]);

  private readonly ATTEMPTS_KEY = 'grading_attempts';

  constructor() {
    this.computeAll();
  }

  private loadAttempts(): Attempt[] {
    const snapshot = this.storage.get<Record<string, unknown>>('seed_snapshot');
    if (snapshot && snapshot['__version'] === SNAPSHOT_VERSION) {
      const stored = this.storage.get<Attempt[]>(this.ATTEMPTS_KEY);
      if (stored) return stored;
    }
    return ATTEMPTS_SEED;
  }

  private computeAll(): void {
    const attempts = this.loadAttempts();
    const questions = QUESTIONS_SEED;
    this.analyses.set(memoizedCompute(questions, attempts));
  }

  recompute(): void {
    this.computeAll();
  }

  getAll(): Observable<ItemAnalysis[]> {
    this.audit.log({ action: AuditAction.VIEW, entity: 'ItemAnalysis', entityId: 0, description: 'Madde analizi listesi görüntülendi' });
    return this.mockApi.get([...this.analyses()]);
  }

  getByExam(examId: number): Observable<ItemAnalysis[]> {
    this.audit.log({ action: AuditAction.VIEW, entity: 'ItemAnalysis', entityId: examId, description: 'Sınav bazlı madde analizi görüntülendi' });
    return this.mockApi.get(this.analyses().filter(i => i.examId === examId));
  }

  getById(id: number): Observable<ItemAnalysis | undefined> {
    this.audit.log({ action: AuditAction.VIEW, entity: 'ItemAnalysis', entityId: id, description: 'Madde analizi detayı görüntülendi' });
    return this.mockApi.get(this.analyses().find(i => i.id === id));
  }
}
