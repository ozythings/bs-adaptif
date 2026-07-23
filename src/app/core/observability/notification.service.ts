import { signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}
export class NotificationService {
  private readonly toasts = signal<Toast[]>([]);
  private nextId = 0;

  readonly current = this.toasts.asReadonly();

  show(message: string, type: Toast['type'] = 'info', duration: number = 2500): void {
    const id = this.nextId++;
    this.toasts.update(list => [...list, { id, message, type, duration }]);
    setTimeout(() => this.remove(id), duration);
  }

  remove(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
