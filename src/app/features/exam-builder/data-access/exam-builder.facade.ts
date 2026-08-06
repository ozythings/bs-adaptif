import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MockApiService } from '@core/api/mock-api.service';
import { NotificationService } from '@core/observability/notification.service';
import { AuditService } from '@core/observability/audit.service';
import { EntityStore } from '@core/state/entity.store';
import { AuditAction } from '@core/models/enums';
import { ExamBlueprint, BlueprintConstraint, BlueprintSummary, PointDistribution } from '@core/models/exam-blueprint.model';
import { Exam } from '@core/models/exam.model';
import { Question } from '@core/models/question.model';
import { LearningOutcome } from '@core/models/learning-outcome.model';
import { BlueprintStatus, ExamStatus, QuestionType, Difficulty } from '@core/models/enums';
import { OUTCOMES_SEED } from '@core/data';
export class ExamBuilderFacade {
  private mockApi = inject(MockApiService);
  private notification = inject(NotificationService);
  private audit = inject(AuditService);
  private store = inject(EntityStore);

  private outcomes = OUTCOMES_SEED;
  private nextId = Math.max(...this.store.blueprints().map(b => b.id), 0) + 1;

  getBlueprints(): Observable<ExamBlueprint[]> {
    return this.mockApi.get([...this.store.blueprints()]);
  }

  getBlueprint(id: number): Observable<ExamBlueprint | undefined> {
    return this.mockApi.get(this.store.blueprints().find(b => b.id === id));
  }

  getExams(): Observable<Exam[]> {
    return this.mockApi.get([...this.store.exams().filter(e => !e.deletedAt)]);
  }

  getExam(examId: number): Exam | undefined {
    return this.store.exams().find(e => e.id === examId);
  }

  getQuestionsByCourse(courseId: number): Observable<Question[]> {
    const outcomeIds = new Set(this.outcomes.filter(o => o.courseId === courseId).map(o => o.id));
    return this.mockApi.get(this.store.questions().filter(q =>
      (q.outcomeIds ?? []).some(id => outcomeIds.has(id))
    ));
  }

  getQuestionsByIds(ids: number[]): Question[] {
    return ids
      .map(id => this.store.questions().find(q => q.id === id))
      .filter((q): q is Question => !!q);
  }

  getExamName(examId: number): string {
    return this.store.exams().find(e => e.id === examId)?.title ?? `Sınav #${examId}`;
  }

  getOutcomesByCourse(courseId: number): Observable<LearningOutcome[]> {
    return this.mockApi.get(this.outcomes.filter(o => o.courseId === courseId));
  }

  updateConstraints(blueprintId: number, constraints: BlueprintConstraint[]): void {
    const bp = this.store.blueprints().find(b => b.id === blueprintId);
    if (!bp) return;
    const totalPoints = constraints.reduce((s, c) => s + c.minCount * c.pointsPerQuestion, 0);
    if (totalPoints > 100) {
      this.notification.show('Toplam puan 100\'u aşamaz', 'error');
      return;
    }
    this.store.updateBlueprint(blueprintId, { constraints, version: bp.version + 1 });
    this.notification.show('Kısıtlamalar güncellendi', 'success');
  }

  autoSelectQuestions(blueprintId: number): Observable<{ selectedIds: number[]; coverage: BlueprintSummary['coverage']; violations: string[] } | null> {
    const blueprint = this.store.blueprints().find(b => b.id === blueprintId);
    if (!blueprint) {
      this.notification.show('Blueprint bulunamadı', 'error');
      return this.mockApi.get(null);
    }

    const exam = this.store.exams().find(e => e.id === blueprint.examId);
    if (!exam) {
      this.notification.show('Sınav bulunamadı', 'error');
      return this.mockApi.get(null);
    }

    const courseOutcomeIds = new Set(this.outcomes.filter(o => o.courseId === exam.courseId).map(o => o.id));
    const examQuestions = this.store.questions().filter(q =>
      (q.outcomeIds ?? []).some(id => courseOutcomeIds.has(id))
    );
    const selectedIds: number[] = [];
    const coverage: BlueprintSummary['coverage'] = [];
    const violations: string[] = [];

    for (const constraint of blueprint.constraints) {
      const available = examQuestions.filter(q =>
        !selectedIds.includes(q.id) &&
        q.difficulty === constraint.difficulty &&
        q.type === constraint.questionType &&
        (!constraint.outcomeId || !q.outcomeIds || q.outcomeIds.includes(constraint.outcomeId))
      );

      const selected: Question[] = [];
      const shuffled = [...available].sort(() => Math.random() - 0.5);

      for (let i = 0; i < constraint.minCount && i < shuffled.length; i++) {
        selected.push(shuffled[i]);
      }

      const remaining = shuffled.filter(q => !selected.some(s => s.id === q.id));

      for (let i = selected.length; i < constraint.maxCount && i - selected.length < remaining.length; i++) {
        selected.push(remaining[i - selected.length]);
      }

      selected.forEach(q => selectedIds.push(q.id));
      coverage.push({
        outcomeId: constraint.outcomeId,
        selected: selected.length,
        required: constraint.minCount,
      });

      if (selected.length < constraint.minCount) {
        const outcomeName = this.outcomes.find(o => o.id === constraint.outcomeId);
        const displayName = outcomeName ? `${outcomeName.code} - ${outcomeName.name}` : `Kazanım #${constraint.outcomeId}`;
        const typeLabel = this.typeLabel(constraint.questionType);
        const diffLabel = this.diffLabel(constraint.difficulty);
        const missing = constraint.minCount - selected.length;
        violations.push(`${displayName} (${typeLabel}, ${diffLabel}): ${selected.length}/${constraint.minCount} seçildi — ${missing} daha ${typeLabel}, ${diffLabel} zorlukta soru ekleyin veya soru havuzunu genişletin.`);
      }
    }

    const totalPoints = selectedIds.reduce((sum, id) => {
      const q = examQuestions.find(qe => qe.id === id);
      return sum + (q?.points ?? 0);
    }, 0);

    const updated: ExamBlueprint = {
      ...blueprint,
      status: violations.length > 0 ? BlueprintStatus.VIOLATED : BlueprintStatus.READY,
      summary: {
        totalQuestions: selectedIds.length,
        totalPoints,
        coverage,
        violations,
      },
      updatedAt: new Date().toISOString(),
    };

    this.store.updateBlueprint(blueprintId, updated);

    if (violations.length > 0) {
      this.notification.show('Bazı kısıtlamalar karşılanamadı', 'error');
    } else {
      this.notification.show('Soru seçimi tamamlandı', 'success');
    }

    return this.mockApi.get({ selectedIds, coverage, violations });
  }

  checkConstraints(blueprintId: number): Observable<{ valid: boolean; violations: string[] }> {
    const blueprint = this.store.blueprints().find(b => b.id === blueprintId);
    if (!blueprint) {
      return this.mockApi.get({ valid: false, violations: ['Blueprint bulunamadı'] });
    }
    return this.mockApi.get({
      valid: blueprint.summary.violations.length === 0,
      violations: blueprint.summary.violations,
    });
  }

  computePointDistribution(blueprintId: number): PointDistribution | undefined {
    const blueprint = this.store.blueprints().find(b => b.id === blueprintId);
    if (!blueprint || blueprint.constraints.length === 0) return undefined;

    const byDifficulty: { difficulty: Difficulty; totalPoints: number; count: number }[] = [];
    const byOutcome: { outcomeId: number; outcomeName: string; totalPoints: number; count: number }[] = [];
    const byType: { type: QuestionType; totalPoints: number; count: number }[] = [];

    const diffMap = new Map<Difficulty, { totalPoints: number; count: number }>();
    const outcomeMap = new Map<number, { totalPoints: number; count: number }>();
    const typeMap = new Map<QuestionType, { totalPoints: number; count: number }>();

    for (const c of blueprint.constraints) {
      const points = c.minCount * c.pointsPerQuestion;

      const de = diffMap.get(c.difficulty) ?? { totalPoints: 0, count: 0 };
      de.totalPoints += points;
      de.count += c.minCount;
      diffMap.set(c.difficulty, de);

      const oe = outcomeMap.get(c.outcomeId) ?? { totalPoints: 0, count: 0 };
      oe.totalPoints += points;
      oe.count += c.minCount;
      outcomeMap.set(c.outcomeId, oe);

      const te = typeMap.get(c.questionType) ?? { totalPoints: 0, count: 0 };
      te.totalPoints += points;
      te.count += c.minCount;
      typeMap.set(c.questionType, te);
    }

    const diffOrder: Difficulty[] = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];
    for (const d of diffOrder) {
      const e = diffMap.get(d);
      if (e) byDifficulty.push({ difficulty: d, ...e });
    }

    for (const [outcomeId, e] of outcomeMap.entries()) {
      const outcome = this.outcomes.find(o => o.id === outcomeId);
      byOutcome.push({ outcomeId, outcomeName: outcome ? `${outcome.code} - ${outcome.name}` : `#${outcomeId}`, ...e });
    }
    byOutcome.sort((a, b) => a.outcomeName.localeCompare(b.outcomeName));

    for (const [type, e] of typeMap.entries()) {
      byType.push({ type, ...e });
    }

    return { byDifficulty, byOutcome, byType };
  }

  createBlueprint(name: string, examId: number): Observable<ExamBlueprint> {
    const newBlueprint: ExamBlueprint = {
      id: this.nextId++,
      name,
      examId,
      constraints: [],
      status: BlueprintStatus.DRAFT,
      summary: { totalQuestions: 0, totalPoints: 0, coverage: [], violations: [] },
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.store.addBlueprint(newBlueprint);
    this.audit.log({ action: AuditAction.CREATE, entity: 'ExamBlueprint', entityId: newBlueprint.id, description: `Blueprint oluşturuldu: ${name}` });
    this.notification.show('Blueprint oluşturuldu', 'success');
    return this.mockApi.post(newBlueprint);
  }

  publishBlueprint(blueprintId: number, selectedQuestionIds?: number[]): Observable<ExamBlueprint | undefined> {
    const blueprint = this.store.blueprints().find(b => b.id === blueprintId);
    if (!blueprint) {
      this.notification.show('Blueprint bulunamadı', 'error');
      return this.mockApi.put(undefined);
    }

    const exam = this.store.exams().find(e => e.id === blueprint.examId);
    const courseOutcomeIds = new Set(this.outcomes.filter(o => o.courseId === exam?.courseId).map(o => o.id));
    const questionIds = selectedQuestionIds ?? this.store.questions()
      .filter(q => (q.outcomeIds ?? []).some(id => courseOutcomeIds.has(id)))
      .filter(q => {
        for (const c of blueprint.constraints) {
          if (q.difficulty === c.difficulty && q.type === c.questionType && (!c.outcomeId || (q.outcomeIds ?? []).includes(c.outcomeId))) return true;
        }
        return false;
      })
      .map(q => q.id);

    if (questionIds.length === 0 && blueprint.summary.totalQuestions === 0) {
      this.notification.show('Hiç soru seçilmedi. Önce soruları seçin.', 'error');
      return this.mockApi.put(undefined);
    }

    if (!selectedQuestionIds && blueprint.summary.violations.length > 0) {
      this.notification.show('Blueprint kısıtlamaları karşılamıyor', 'error');
      return this.mockApi.put(undefined);
    }

    const updated: ExamBlueprint = {
      ...blueprint,
      status: BlueprintStatus.READY,
      summary: {
        ...blueprint.summary,
        totalQuestions: questionIds.length,
        violations: selectedQuestionIds ? [] : blueprint.summary.violations,
      },
      updatedAt: new Date().toISOString(),
    };

    const versionIds: Record<number, number> = {};
    for (const qid of [...new Set(questionIds)]) {
      const q = this.store.questions().find(x => x.id === qid);
      versionIds[qid] = q?.version ?? 1;
    }

    this.store.updateBlueprint(blueprintId, updated);

    const newStatus = exam?.status === ExamStatus.DRAFT ? ExamStatus.PUBLISHED : exam?.status;
    const newCount = questionIds.length || exam?.questionCount || 0;

    this.store.updateExam(blueprint.examId, {
      questionVersionIds: versionIds,
      questionCount: newCount,
      status: newStatus ?? ExamStatus.PUBLISHED,
    });

    this.audit.log({ action: AuditAction.PUBLISH, entity: 'ExamBlueprint', entityId: blueprintId, description: `Blueprint yayınlandı: ${updated.name}`, newValue: updated });
    this.audit.log({ action: AuditAction.PUBLISH, entity: 'Exam', entityId: blueprint.examId, description: `Sınav yayınlandı (blueprint ${blueprintId})` });
    this.notification.show('Sınav yayınlandı ve öğrencilerin kullanımına açıldı', 'success');
    return this.mockApi.put(updated);
  }

  updateBlueprint(id: number, data: { name?: string; examId?: number }): Observable<ExamBlueprint | undefined> {
    const blueprint = this.store.blueprints().find(b => b.id === id);
    if (!blueprint) {
      this.notification.show('Blueprint bulunamadı', 'error');
      return this.mockApi.put(undefined);
    }
    const updated: ExamBlueprint = {
      ...blueprint,
      ...data,
      version: blueprint.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.store.updateBlueprint(id, updated);
    this.audit.log({ action: AuditAction.UPDATE, entity: 'ExamBlueprint', entityId: id, description: `Blueprint güncellendi: ${updated.name}` });
    this.notification.show('Blueprint güncellendi', 'success');
    return this.mockApi.put(updated);
  }

  deleteBlueprint(id: number): Observable<boolean> {
    const blueprint = this.store.blueprints().find(b => b.id === id);
    if (!blueprint) {
      this.notification.show('Blueprint bulunamadı', 'error');
      return this.mockApi.delete(false);
    }
    this.store.removeBlueprint(id);
    this.audit.log({ action: AuditAction.DELETE, entity: 'ExamBlueprint', entityId: id, description: `Blueprint silindi: ${blueprint.name}` });
    this.notification.show('Blueprint silindi', 'success');
    return this.mockApi.delete(true);
  }

  private typeLabel(t: QuestionType): string {
    switch (t) {
      case QuestionType.MULTIPLE_CHOICE: return 'Çoktan Seçmeli';
      case QuestionType.TRUE_FALSE: return 'Doğru/Yanlış';
      case QuestionType.SHORT_ANSWER: return 'Kısa Cevap';
      case QuestionType.ESSAY: return 'Kompozisyon';
      default: return t;
    }
  }

  private diffLabel(d: Difficulty): string {
    switch (d) {
      case Difficulty.EASY: return 'Kolay';
      case Difficulty.MEDIUM: return 'Orta';
      case Difficulty.HARD: return 'Zor';
      default: return d;
    }
  }

  createExam(title: string, courseId: number, duration: number, passingScore: number): Observable<Exam> {
    const maxId = Math.max(...this.store.exams().map(e => e.id), 0);
    const exam: Exam = {
      id: maxId + 1,
      courseId,
      title,
      questionCount: 0,
      passingScore,
      duration,
      wrongAnswerPenalty: 4,
      status: ExamStatus.DRAFT,
      version: 1,
      questionVersionIds: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.store.addExam(exam);
    this.audit.log({ action: AuditAction.CREATE, entity: 'Exam', entityId: exam.id, description: `Sınav oluşturuldu: ${title}` });
    this.notification.show('Sınav oluşturuldu', 'success');
    return this.mockApi.post(exam);
  }

  updateQuestion(id: number, data: Partial<{ questionText: string; type: QuestionType; difficulty: Difficulty; points: number; options: string[]; correctAnswer: number | string; outcomeIds: number[] }>): Observable<Question | undefined> {
    const question = this.store.questions().find(q => q.id === id);
    if (!question) {
      this.notification.show('Soru bulunamadı', 'error');
      return this.mockApi.put(undefined);
    }
    this.store.updateQuestion(id, data as any);
    this.audit.log({ action: AuditAction.UPDATE, entity: 'Question', entityId: id, description: 'Soru güncellendi (exam-builder)' });
    this.notification.show('Soru güncellendi', 'success');
    return this.mockApi.put({ ...question, ...data } as Question);
  }
}
