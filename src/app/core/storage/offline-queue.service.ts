import { inject } from '@angular/core';
import { StorageService } from '@core/storage/storage.service';

export interface QueuedRequest {
  id: string;
  type: 'POST' | 'PUT' | 'DELETE';
  url: string;
  body: unknown;
  timestamp: string;
  retryCount: number;
}
export class OfflineQueueService {
  private storage = inject(StorageService);
  private readonly STORAGE_KEY = 'offline_queue';

  enqueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): void {
    const queue = this.getQueue();
    queue.push({
      ...request,
      id: 'q_' + Date.now(),
      timestamp: new Date().toISOString(),
      retryCount: 0
    });
    this.storage.set(this.STORAGE_KEY, queue);
  }

  getQueue(): QueuedRequest[] {
    return this.storage.get<QueuedRequest[]>(this.STORAGE_KEY) || [];
  }

  remove(id: string): void {
    const queue = this.getQueue().filter(q => q.id !== id);
    this.storage.set(this.STORAGE_KEY, queue);
  }

  incrementRetry(id: string): void {
    const queue = this.getQueue().map(q =>
      q.id === id ? { ...q, retryCount: q.retryCount + 1 } : q
    );
    this.storage.set(this.STORAGE_KEY, queue);
  }

  hasPending(): boolean {
    return this.getQueue().length > 0;
  }

  clear(): void {
    this.storage.remove(this.STORAGE_KEY);
  }
}
