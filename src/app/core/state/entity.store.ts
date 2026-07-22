import { signal } from '@angular/core';
import { Exam } from '@core/models/exam.model';
import { ExamBlueprint } from '@core/models/exam-blueprint.model';
import { Question } from '@core/models/question.model';
import { ExamSession } from '@core/models/exam-session.model';
import { EXAMS_SEED, BLUEPRINTS_SEED, QUESTIONS_SEED, EXAM_SESSIONS_SEED } from '@core/data';
export class EntityStore {
  readonly exams = signal<Exam[]>(EXAMS_SEED);
  readonly blueprints = signal<ExamBlueprint[]>(BLUEPRINTS_SEED);
  readonly questions = signal<Question[]>(QUESTIONS_SEED);
  readonly sessions = signal<ExamSession[]>(EXAM_SESSIONS_SEED);

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
