import { inject,  signal } from '@angular/core';
import { StorageService } from '@core/storage/storage.service';

export interface SessionToken {
  token: string;
  examId: number;
  userId: number;
  startedAt: string;
  lastActivity: string;
}
export class SessionService {
  private storage = inject(StorageService);
  private readonly STORAGE_KEY = 'active_sessions';

  private sessionsSignal = signal<SessionToken[]>(this.loadSessions());

  private loadSessions(): SessionToken[] {
    return this.storage.get<SessionToken[]>(this.STORAGE_KEY) || [];
  }

  private save(): void {
    this.storage.set(this.STORAGE_KEY, this.sessionsSignal());
  }

  startSession(examId: number, userId: number, token?: string): SessionToken {
    const active = this.sessionsSignal().find(s => s.userId === userId && s.examId === examId);
    if (active) {
      throw new Error('Bu sınav için zaten aktif bir oturumunuz bulunuyor');
    }

    const newToken: SessionToken = {
      token: token || this.generateToken(),
      examId,
      userId,
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    this.sessionsSignal.update(list => [...list, newToken]);
    this.save();
    return newToken;
  }

  getActiveSession(token: string): SessionToken | undefined {
    return this.sessionsSignal().find(s => s.token === token);
  }

  hasActiveSession(examId: number, userId: number): boolean {
    return this.sessionsSignal().some(s => s.examId === examId && s.userId === userId);
  }

  endSession(token: string): void {
    this.sessionsSignal.update(list => list.filter(s => s.token !== token));
    this.save();
  }

  endSessionsForExam(examId: number, userId: number): void {
    this.sessionsSignal.update(list => list.filter(s => !(s.examId === examId && s.userId === userId)));
    this.save();
  }

  refreshActivity(token: string): void {
    this.sessionsSignal.update(list =>
      list.map(s => s.token === token ? { ...s, lastActivity: new Date().toISOString() } : s)
    );
    this.save();
  }

  private generateToken(): string {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  }
}
