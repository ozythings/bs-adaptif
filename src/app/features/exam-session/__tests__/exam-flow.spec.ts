import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { provideAnimations } from '@angular/platform-browser/animations';
import { SessionFacade } from '../data-access/session.facade';
import { SessionService } from '@core/auth/session.service';
import { SessionStatus } from '@core/models/enums';
import { Router } from '@angular/router';
import { APP_SERVICES } from '../../../app.services';
import { EXAMS_SEED } from '@core/data';

describe('ExamSession Flow (integration)', () => {
  let facade: SessionFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...APP_SERVICES,
        SessionFacade,
        provideAnimations(),
        { provide: Router, useValue: { navigate: () => {} } },
      ],
    });
    facade = TestBed.inject(SessionFacade);
  });

  it('should get existing session by token', async () => {
    const exam = EXAMS_SEED[0];
    const started = facade.startExamSession(exam, 4);
    const session = await firstValueFrom(facade.getSession(started.token));
    expect(session).toBeDefined();
    expect(session!.status).toBe(SessionStatus.ACTIVE);
    expect(session!.examId).toBe(exam.id);
  });

  it('should return undefined for invalid token', async () => {
    const session = await firstValueFrom(facade.getSession('invalid_token'));
    expect(session).toBeUndefined();
  });

  it('should track marked questions in signals', () => {
    facade.toggleMark(1);
    facade.toggleMark(3);
    expect(facade.markedQuestions()).toContain(1);
    expect(facade.markedQuestions()).toContain(3);
    facade.toggleMark(1);
    expect(facade.markedQuestions()).not.toContain(1);
  });

  it('should navigate question index', () => {
    facade.goToQuestion(2);
    expect(facade.currentQuestionIndex()).toBe(2);
  });

  it('should handle save answer draft', () => {
    const exam = EXAMS_SEED[0];
    const session = facade.startExamSession(exam, 4);
    facade.saveAnswer(session.id, 1, 'A');
    const draft = facade.getDraft(session.id, 1);
    expect(draft).toBeDefined();
    expect(draft!.answer).toBe('A');
    expect(draft!.version).toBeGreaterThan(0);
  });

  it('should get questions for exam', () => {
    const questions = facade.getQuestions(1);
    expect(questions.length).toBeGreaterThan(0);
  });

  it('should have sessions with valid question orders', () => {
    const exam = EXAMS_SEED[0];
    const session = facade.startExamSession(exam, 4);
    firstValueFrom(facade.getSession(session.token)).then(s => {
      if (!s) return;
      const questions = facade.getQuestions(s.examId);
      s.questionOrder.forEach(qid => {
        expect(questions.some(q => q.id === qid)).toBe(true);
      });
    });
  });

  it('should be offline when simulate offline triggered', () => {
    facade.simulateOffline();
    expect(facade.connectionStatus()).toBe('offline');
    facade.simulateOnline();
    expect(facade.connectionStatus()).toBe('online');
  });

  it('should default to saved save status', () => {
    expect(facade.saveStatus()).toBe('saved');
  });
});
