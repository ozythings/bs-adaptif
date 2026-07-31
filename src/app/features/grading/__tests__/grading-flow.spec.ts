import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { provideAnimations } from '@angular/platform-browser/animations';
import { GradingFacade } from '../data-access/grading.facade';
import { RubricScore } from '@core/models/rubric.model';
import { ResultStatus, QuestionType } from '@core/models/enums';
import { APP_SERVICES } from '../../../app.services';

describe('Grading Flow (integration)', () => {
  let facade: GradingFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...APP_SERVICES, GradingFacade, provideAnimations()],
    });
    facade = TestBed.inject(GradingFacade);
  });

  it('should have pending attempts ready for grading', () => {
    const pending = facade.pendingAttempts();
    expect(pending.length).toBeGreaterThan(0);
    pending.forEach(a => {
      expect(a.status).toBe(ResultStatus.DRAFT);
    });
  });

  it('should get attempt by id', async () => {
    const attempt = await firstValueFrom(facade.getAttempt(100));
    expect(attempt).toBeDefined();
    expect([ResultStatus.DRAFT, ResultStatus.FINALIZED]).toContain(attempt!.status);
    expect(attempt!.questionResponses.length).toBeGreaterThan(0);
  });

  it('should detect objective question type', () => {
    const type = facade.getQuestionType(1);
    expect(type).toBe(QuestionType.MULTIPLE_CHOICE);
  });

  it('should detect essay question type', () => {
    const type = facade.getQuestionType(12);
    expect(type).toBe(QuestionType.ESSAY);
  });

  it('should have rubrics for essay questions', () => {
    const rubric = facade.getRubricSync(12);
    expect(rubric).toBeDefined();
    expect(rubric!.criteria.length).toBeGreaterThan(0);
  });

  it('should get pending grading list', async () => {
    const pending = await firstValueFrom(facade.getPendingGrading());
    expect(pending.length).toBeGreaterThan(0);
  });

  it('should have grading history signal', () => {
    const history = facade.gradingHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  it('should get question by id', () => {
    const question = facade.getQuestion(1);
    expect(question).toBeDefined();
    expect(question!.examId).toBeDefined();
  });

  it('should reject grading without change reason on score override', async () => {
    const attempt = await firstValueFrom(facade.getAttempt(100));
    const essayResponse = attempt!.questionResponses.find(r => r.questionId === 12);
    if (!essayResponse) return;
    const rubric = facade.getRubricSync(12)!;
    const scores: RubricScore[] = rubric.criteria.map(c => ({
      criterionId: c.id,
      score: c.maxPoints,
      comment: 'Test',
    }));

    const result = await firstValueFrom(
      facade.gradeQuestion(100, 12, scores, 'Test', undefined)
    );
    expect(result).toBeUndefined();
  });

  it('should accept grading with change reason', async () => {
    const attempt = await firstValueFrom(facade.getAttempt(100));
    const essayResponse = attempt!.questionResponses.find(r => r.questionId === 12);
    if (!essayResponse) return;
    const rubric = facade.getRubricSync(12)!;
    const scores: RubricScore[] = rubric.criteria.map(c => ({
      criterionId: c.id,
      score: 1,
      comment: 'Test',
    }));

    const result = await firstValueFrom(
      facade.gradeQuestion(100, 12, scores, 'Test yorumu', 'Puan farklılığı var')
    );
    expect(result).toBeDefined();
    expect(result!.totalScore).toBeGreaterThan(0);
    expect(result!.changeReason).toBe('Puan farklılığı var');
  });
});
