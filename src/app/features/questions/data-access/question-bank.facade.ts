import { inject,  signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { MockApiService } from '@core/api/mock-api.service';
import { NotificationService } from '@core/observability/notification.service';
import { AuditService } from '@core/observability/audit.service';
import { CurrentUserService } from '@core/auth/current-user.service';
import { PermissionService } from '@core/auth/permission.service';
import { StorageService } from '@core/storage/storage.service';
import { QuestionSummary, QuestionVersion, QuestionOption } from '@core/models/question-version.model';
import { QuestionVersionStatus, QuestionType, Difficulty, QuestionStatus, AuditAction, UserRole } from '@core/models/enums';
import { QUESTIONS_SEED, EXAMS_SEED, OUTCOMES_SEED } from '@core/data';
import { Question } from '@core/models/question.model';
import { LearningOutcome } from '@core/models/learning-outcome.model';

function mapOldToSummary(q: Question): QuestionSummary {
  return {
    id: q.id,
    stem: q.questionText,
    type: q.type,
    difficulty: q.difficulty,
    points: q.points,
    solution: q.solution,
    outcomeIds: q.outcomeIds ?? [],
    tags: q.tags ?? [],
    status: q.status === QuestionStatus.ACTIVE ? QuestionVersionStatus.PUBLISHED : QuestionVersionStatus.ARCHIVED,
    currentVersion: 1,
    latestVersionId: q.id,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}

function mapOldToVersion(q: Question): QuestionVersion {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const options: QuestionOption[] = (q.options ?? []).map((opt, i) => ({
    key: letters[i] || `${i}`,
    value: opt,
    isCorrect: i === q.correctAnswer,
  }));
  return {
    id: q.id,
    questionId: q.id,
    version: 1,
    stem: q.questionText,
    type: q.type,
    options,
    correctAnswer: typeof q.correctAnswer === 'number'
      ? (q.options ?? [])[q.correctAnswer] || ''
      : q.correctAnswer,
    solution: q.solution ?? '',
    difficulty: q.difficulty,
    points: q.points,
    partialPoints: false,
    outcomeIds: q.outcomeIds ?? [],
    tags: q.tags ?? [],
    status: q.status === QuestionStatus.ACTIVE ? QuestionVersionStatus.PUBLISHED : QuestionVersionStatus.ARCHIVED,
    changeNote: 'Initial version',
    createdBy: 1,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}
export class QuestionBankFacade {
  private mockApi = inject(MockApiService);
  private notification = inject(NotificationService);
  private audit = inject(AuditService);
  private currentUser = inject(CurrentUserService);
  private permission = inject(PermissionService);
  private storage = inject(StorageService);

  private readonly QUESTIONS_KEY = 'qb_questions';
  private readonly VERSIONS_KEY = 'qb_versions';
  private readonly MAP_KEY = 'qb_exam_map';

  private questionsSeed = signal<QuestionSummary[]>(
    this.storage.get<QuestionSummary[]>(this.QUESTIONS_KEY) ?? QUESTIONS_SEED.map(mapOldToSummary)
  );
  private versionsSeed = signal<QuestionVersion[]>(
    this.storage.get<QuestionVersion[]>(this.VERSIONS_KEY) ?? QUESTIONS_SEED.map(mapOldToVersion)
  );
  private questionExamMap = new Map<number, number>(
    this.storage.get<[number, number][]>(this.MAP_KEY) ?? QUESTIONS_SEED.map(q => [q.id, q.examId])
  );

  private nextId = Math.max(...this.questionsSeed().map(q => q.id), ...QUESTIONS_SEED.map(q => q.id)) + 1;
  private nextVersionId = Math.max(...this.versionsSeed().map(v => v.id), ...QUESTIONS_SEED.map(q => q.id)) + 1000;

  private saveState(): void {
    this.storage.set(this.QUESTIONS_KEY, this.questionsSeed());
    this.storage.set(this.VERSIONS_KEY, this.versionsSeed());
    this.storage.set(this.MAP_KEY, [...this.questionExamMap.entries()]);
  }

  getAll(): Observable<QuestionSummary[]> {
    return this.mockApi.get([...this.questionsSeed()]);
  }

  getOutcomes(): LearningOutcome[] {
    return OUTCOMES_SEED;
  }

  getById(id: number): Observable<QuestionSummary | undefined> {
    return this.mockApi.get(this.questionsSeed().find(q => q.id === id));
  }

  getVersions(questionId: number): Observable<QuestionVersion[]> {
    return this.mockApi.get(this.versionsSeed().filter(v => v.questionId === questionId));
  }

  create(data: {
    stem: string;
    type: QuestionType;
    difficulty: Difficulty;
    points: number;
    options?: QuestionOption[];
    correctAnswer?: string;
    solution?: string;
    outcomeIds?: number[];
    tags?: string[];
  }): Observable<QuestionSummary> {
    if (!this.canManage()) {
      this.notification.show('Bu işlem için yetkiniz bulunmamaktadır', 'error');
      return this.mockApi.simulateError();
    }
    const id = this.nextId++;
    const versionId = this.nextVersionId++;
    const now = new Date().toISOString();
    const summary: QuestionSummary = {
      id,
      stem: data.stem,
      type: data.type,
      difficulty: data.difficulty,
      points: data.points,
      solution: data.solution,
      outcomeIds: data.outcomeIds || [],
      tags: data.tags || [],
      status: QuestionVersionStatus.DRAFT,
      currentVersion: 1,
      latestVersionId: versionId,
      createdAt: now,
      updatedAt: now,
    };
    const version: QuestionVersion = {
      id: versionId,
      questionId: id,
      version: 1,
      stem: data.stem,
      type: data.type,
      options: data.options || [],
      correctAnswer: data.correctAnswer || '',
      solution: data.solution || '',
      difficulty: data.difficulty,
      points: data.points,
      partialPoints: false,
      outcomeIds: data.outcomeIds || [],
      tags: data.tags || [],
      status: QuestionVersionStatus.DRAFT,
      changeNote: 'Oluşturuldu',
      createdBy: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.questionsSeed.update(list => [...list, summary]);
    this.versionsSeed.update(list => [...list, version]);
    this.saveState();
    this.audit.log({ action: AuditAction.CREATE, entity: 'Question', entityId: id, description: 'Soru oluşturuldu: ' + data.stem, newValue: summary });
    this.notification.show('Soru oluşturuldu', 'success');
    return this.mockApi.post(summary);
  }

  update(id: number, data: Partial<{
    stem: string;
    type: QuestionType;
    difficulty: Difficulty;
    points: number;
    options: QuestionOption[];
    correctAnswer: string;
    solution: string;
    changeNote: string;
    outcomeIds: number[];
    tags: string[];
  }>): Observable<QuestionSummary | undefined> {
    if (!this.canManage()) {
      this.notification.show('Bu işlem için yetkiniz bulunmamaktadır', 'error');
      return this.mockApi.simulateError();
    }
    const existing = this.questionsSeed().find(q => q.id === id);
    if (!existing) {
      this.notification.show('Soru bulunamadı', 'error');
      return this.mockApi.simulateError();
    }

    if (existing.status === QuestionVersionStatus.PUBLISHED) {
      const versionId = this.nextVersionId++;
      const currentVersion = this.versionsSeed().filter(v => v.questionId === id);
      const maxVersion = currentVersion.length > 0 ? Math.max(...currentVersion.map(v => v.version)) : 0;
      const latest = currentVersion.find(v => v.id === existing.latestVersionId);

      const newVersion: QuestionVersion = {
        id: versionId,
        questionId: id,
        version: maxVersion + 1,
        stem: data.stem ?? latest?.stem ?? existing.stem,
        type: data.type ?? latest?.type ?? existing.type,
        options: data.options ?? latest?.options ?? [],
        correctAnswer: data.correctAnswer ?? latest?.correctAnswer ?? '',
        solution: data.solution ?? latest?.solution ?? '',
        difficulty: data.difficulty ?? latest?.difficulty ?? existing.difficulty,
        points: data.points ?? latest?.points ?? existing.points,
        partialPoints: latest?.partialPoints ?? false,
        outcomeIds: data.outcomeIds ?? latest?.outcomeIds ?? existing.outcomeIds,
        tags: data.tags ?? latest?.tags ?? existing.tags,
        status: QuestionVersionStatus.DRAFT,
        changeNote: data.changeNote || 'Yeni versiyon',
        createdBy: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.versionsSeed.update(list => [...list, newVersion]);
      this.questionsSeed.update(list => list.map(q =>
        q.id === id ? {
          ...q,
          status: QuestionVersionStatus.PUBLISHED,
          currentVersion: newVersion.version,
          latestVersionId: versionId,
          updatedAt: new Date().toISOString(),
          stem: newVersion.stem,
          type: newVersion.type,
          difficulty: newVersion.difficulty,
          points: newVersion.points,
          solution: newVersion.solution,
          outcomeIds: newVersion.outcomeIds,
          tags: newVersion.tags,
        } : q
      ));
      this.saveState();
      this.audit.log({ action: AuditAction.UPDATE, entity: 'Question', entityId: id, description: 'Yeni versiyon oluşturuldu', oldValue: existing, newValue: data });
      this.notification.show('Yeni versiyon oluşturuldu', 'success');
      return this.mockApi.get(this.questionsSeed().find(q => q.id === id));
    }

    const updated: QuestionSummary = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.questionsSeed.update(list => list.map(q => q.id === id ? updated : q));

    const version = this.versionsSeed().find(v => v.id === existing.latestVersionId);
    if (version) {
      const updatedVersion: QuestionVersion = {
        ...version,
        stem: data.stem ?? version.stem,
        type: data.type ?? version.type,
        options: data.options ?? version.options,
        correctAnswer: data.correctAnswer ?? version.correctAnswer,
        solution: data.solution ?? version.solution,
        difficulty: data.difficulty ?? version.difficulty,
        points: data.points ?? version.points,
        outcomeIds: data.outcomeIds ?? version.outcomeIds,
        tags: data.tags ?? version.tags,
      };
      this.versionsSeed.update(list => list.map(v => v.id === existing.latestVersionId ? updatedVersion : v));
    }
    this.saveState();

    this.audit.log({ action: AuditAction.UPDATE, entity: 'Question', entityId: id, description: 'Soru güncellendi', oldValue: existing, newValue: updated });
    this.notification.show('Soru güncellendi', 'success');
    return this.mockApi.put(updated);
  }

  delete(id: number): Observable<boolean> {
    if (!this.canManage()) {
      this.notification.show('Bu işlem için yetkiniz bulunmamaktadır', 'error');
      return this.mockApi.delete(false);
    }
    const existing = this.questionsSeed().find(q => q.id === id);
    if (!existing) {
      this.notification.show('Soru bulunamadı', 'error');
      return this.mockApi.delete(false);
    }

    const examId = this.questionExamMap.get(id);
    if (examId !== undefined) {
      const exam = EXAMS_SEED.find(e => e.id === examId);
      if (exam && (exam as any).status === 'published') {
        this.notification.show('Yayındaki sınavda kullanılan soru silinemez', 'error');
        return this.mockApi.delete(false);
      }
    }

    this.audit.log({ action: AuditAction.DELETE, entity: 'Question', entityId: id, description: 'Soru silindi: ' + existing.stem });
    this.questionsSeed.update(list => list.filter(q => q.id !== id));
    this.versionsSeed.update(list => list.filter(v => v.questionId !== id));
    this.questionExamMap.delete(id);
    this.saveState();
    this.notification.show('Soru silindi', 'success');
    return this.mockApi.delete(true);
  }

  publish(id: number): Observable<QuestionSummary | undefined> {
    if (!this.canManage()) {
      this.notification.show('Bu işlem için yetkiniz bulunmamaktadır', 'error');
      return this.mockApi.simulateError();
    }
    const existing = this.questionsSeed().find(q => q.id === id);
    if (!existing) {
      this.notification.show('Soru bulunamadı', 'error');
      return this.mockApi.simulateError();
    }

    const updated: QuestionSummary = {
      ...existing,
      status: QuestionVersionStatus.PUBLISHED,
      updatedAt: new Date().toISOString(),
    };
    this.questionsSeed.update(list => list.map(q => q.id === id ? updated : q));

    const version = this.versionsSeed().find(v => v.id === existing.latestVersionId);
    if (version) {
      this.versionsSeed.update(list => list.map(v =>
        v.id === existing.latestVersionId
          ? { ...v, status: QuestionVersionStatus.PUBLISHED }
          : v
      ));
    }
    this.saveState();

    this.audit.log({ action: AuditAction.PUBLISH, entity: 'Question', entityId: id, description: 'Soru yayınlandı: ' + existing.stem, oldValue: existing, newValue: updated });
    this.notification.show('Soru yayınlandı', 'success');
    return this.mockApi.put(updated);
  }

  revertToVersion(questionId: number, versionId: number): void {
    const target = this.versionsSeed().find(v => v.id === versionId && v.questionId === questionId);
    if (!target) return;

    this.questionsSeed.update(list =>
      list.map(q => q.id === questionId
        ? {
            ...q,
            stem: target.stem,
            type: target.type,
            difficulty: target.difficulty,
            options: target.options,
            correctAnswer: target.correctAnswer,
            solution: target.solution,
            points: target.points,
            tags: target.tags,
            latestVersionId: versionId,
            currentVersion: target.version,
            updatedAt: new Date().toISOString(),
          }
        : q
      )
    );
    this.saveState();

    this.notification.show(`v${target.version} versiyonuna dönüldü`, 'success');
  }

  getVersionNumbers(questionId: number): number[] {
    const versions = this.versionsSeed().filter(v => v.questionId === questionId);
    const nums = [...new Set(versions.map(v => v.version))];
    return nums.sort((a, b) => a - b);
  }

  private canManage(): boolean {
    return this.permission.hasAnyPermission(['question_create', 'question_update', 'question_delete']);
  }
}
