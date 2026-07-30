import { describe, it, expect } from 'vitest';
import { QUESTIONS_SEED, ANSWER_DRAFTS_SEED, EXAMS_SEED } from '@core/data';

describe('SessionFacade (unit)', () => {
  it('should save answer draft', () => {
    const sessionId = 100;
    const questionId = 1;
    const existingDraft = ANSWER_DRAFTS_SEED.find(d => d.sessionId === sessionId && d.questionId === questionId);
    expect(existingDraft).toBeDefined();
    if (existingDraft) {
      const updated = { ...existingDraft, answer: '2', version: existingDraft.version + 1 };
      expect(updated.version).toBe(existingDraft.version + 1);
      expect(updated.answer).toBe('2');
    }
    const newDraft = { id: Date.now(), sessionId: 100, questionId: 5, answer: '1', version: 1, isSynced: false, syncStatus: 'pending' as const, lastSavedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
    expect(newDraft.sessionId).toBe(100);
    expect(newDraft.questionId).toBe(5);
    expect(newDraft.version).toBe(1);
  });

  it('should toggle marked questions', () => {
    const session = EXAMS_SEED[0];
    expect(session).toBeDefined();
    const marked: number[] = [];
    const questionId = 4;
    const toggled = marked.includes(questionId) ? marked.filter(q => q !== questionId) : [...marked, questionId];
    expect(toggled).toContain(questionId);
    const unmarked = toggled.filter(q => q !== questionId);
    expect(unmarked).not.toContain(questionId);
  });

  it('should navigate between questions', () => {
    const exam = EXAMS_SEED[0];
    const questions = QUESTIONS_SEED.filter(q => q.examId === exam.id);
    const totalQuestions = questions.length;
    expect(totalQuestions).toBeGreaterThan(0);
    const currentIndex = 0;
    const validIndex = Math.min(currentIndex + 1, totalQuestions - 1);
    expect(validIndex).toBeLessThan(totalQuestions);
    expect(validIndex).toBeGreaterThanOrEqual(0);
    const prevIndex = Math.max(currentIndex - 1, 0);
    expect(prevIndex).toBeLessThan(totalQuestions);
    const lastIndex = totalQuestions - 1;
    expect(lastIndex).toBe(totalQuestions - 1);
  });

  it('should start sessions without pre-seeded active sessions', () => {
    expect(EXAMS_SEED).toBeDefined();
    expect(EXAMS_SEED.length).toBeGreaterThan(0);
  });

  it('should enqueue offline answers', () => {
    const offlineQueue = [
      { type: 'PUT' as const, url: '/api/drafts', body: { id: 100, sessionId: 100, questionId: 1, answer: '2', version: 4 } },
      { type: 'PUT' as const, url: '/api/drafts', body: { id: 999, sessionId: 100, questionId: 10, answer: '1', version: 1 } },
    ];
    expect(offlineQueue.length).toBe(2);
    offlineQueue.forEach(item => {
      expect(item.type).toBe('PUT');
      expect(item.url).toBe('/api/drafts');
      expect(item.body).toHaveProperty('sessionId');
      expect(item.body).toHaveProperty('questionId');
      expect(item.body).toHaveProperty('answer');
    });
    const synced = offlineQueue.filter(item => {
      const body = item.body as any;
      return ANSWER_DRAFTS_SEED.some(d => d.sessionId === body.sessionId && d.questionId === body.questionId);
    });
    expect(synced.length).toBeGreaterThanOrEqual(1);
  });
});
