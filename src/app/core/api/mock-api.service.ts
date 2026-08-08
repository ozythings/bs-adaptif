import { inject } from '@angular/core';
import { Observable, of, throwError, Subject, timer } from 'rxjs';
import { delay, retry } from 'rxjs/operators';
import { PageRequest, PageResponse, MockApiOptions, StreamEvent, RetryConfig, DEFAULT_RETRY } from '@core/api/mock-api.types';
import { detectConflict, Versioned } from '@core/api/conflict-detector';
import { CurrentUserService } from '@core/auth/current-user.service';
import { NotificationService } from '@core/observability/notification.service';
import { ConflictResolverService } from '@core/storage/conflict-resolver.service';
export class MockApiService {
  private currentUser = inject(CurrentUserService);
  private notification = inject(NotificationService);
  private conflictResolver = inject(ConflictResolverService);

  private readonly DEFAULT_DELAY = 100;
  private simulationDelay = 100;
  private simulationErrorRate = 0;

  setErrorRate(rate: number): void {
    this.simulationErrorRate = Math.max(0, Math.min(1, rate));
  }

  setDelay(ms: number): void {
    this.simulationDelay = ms;
  }

  get<T>(data: T, options: MockApiOptions = {}): Observable<T> {
    return this.wrap(data, options);
  }

  post<T>(data: T, options: MockApiOptions = {}): Observable<T> {
    return this.wrap(data, options);
  }

  put<T>(data: T, existing?: T, options: MockApiOptions = {}): Observable<T> {
    const check = options.conflictCheck ?? true;
    if (check && existing && typeof data === 'object' && data !== null) {
      const d = data as Record<string, unknown>;
      const e = existing as Record<string, unknown>;
      if (d['version'] !== undefined && e['version'] !== undefined) {
          const conflict = detectConflict(e as unknown as Versioned, d as unknown as Versioned);
        if (conflict.hasConflict) {
          const resolved = this.conflictResolver.resolve(
            { id: e['id'] as number, version: e['version'] as number, updatedAt: (e['updatedAt'] as string) || '', data: e },
            { id: d['id'] as number, version: (d['version'] as number) || 0, updatedAt: '', data: d }
          );
          if (resolved.resolution === 'server') {
            this.notification.show('Sunucudaki versiyon kullanıldı', 'warning');
            return of(resolved.result as T);
          }
          this.notification.show(conflict.message, 'error');
          return throwError(() => new Error(conflict.message));
        }
      }
    }
    return this.wrap(data, options);
  }

  delete<T>(data: T, options: MockApiOptions = {}): Observable<T> {
    return this.wrap(data, options);
  }

  paginate<T>(items: T[], request: PageRequest, options: MockApiOptions = {}): Observable<PageResponse<T>> {
    let result = [...items];
    const search = request.search?.toLowerCase();
    if (search) {
      result = result.filter(item =>
        Object.values(item as Record<string, unknown>).some(val =>
          String(val).toLowerCase().includes(search)
        )
      );
    }
    if (request.filters) {
      for (const [key, value] of Object.entries(request.filters)) {
        if (value !== null && value !== undefined && value !== '') {
          result = result.filter(item =>
            (item as Record<string, unknown>)[key] === value
          );
        }
      }
    }
    const sortCol = request.sortColumn;
    const sortDir = request.sortDirection || 'asc';
    if (sortCol) {
      result = [...result].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortCol] as string | number;
        const bVal = (b as Record<string, unknown>)[sortCol] as string | number;
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    const total = result.length;
    const page = request.page || 0;
    const pageSize = request.pageSize || 10;
    const totalPages = Math.ceil(total / pageSize);
    const start = page * pageSize;
    const sliced = result.slice(start, start + pageSize);
    return this.wrap({ items: sliced, total, page, pageSize, totalPages }, options);
  }

  stream<T>(data: T[], intervalMs: number = 2000): Observable<StreamEvent<T>> {
    const subj = new Subject<StreamEvent<T>>();
    let idx = 0;
    const id = setInterval(() => {
      if (idx < data.length) {
        subj.next({ type: 'data', data: data[idx] });
        idx++;
      } else {
        subj.next({ type: 'complete' });
        clearInterval(id);
        subj.complete();
      }
    }, intervalMs);
    return subj.asObservable();
  }

  simulateError(): Observable<never> {
    return throwError(() => new Error('Simüle hata'));
  }

  getServerTime(): Observable<string> {
    return this.get(new Date().toISOString());
  }

  private wrap<T>(data: T, options: MockApiOptions = {}): Observable<T> {
    const ms = options.delay ?? this.simulationDelay;
    const errRate = options.errorRate ?? this.simulationErrorRate;
    if (options.authRequired && !this.currentUser.isAuthenticated()) {
      this.notification.show('Bu işlem için oturum açmanız gerekiyor', 'error');
      return throwError(() => new Error('Yetkisiz erişim'));
    }
    let result: Observable<T>;
    if (Math.random() < errRate) {
      result = throwError(() => new Error('Sunucu hatası')).pipe(delay(ms));
    } else {
      result = of(data).pipe(delay(ms));
    }

    const retryCfg: RetryConfig | null = options.retry === true
      ? DEFAULT_RETRY
      : (options.retry as RetryConfig) ?? null;

    if (retryCfg) {
      result = result.pipe(
        retry({
          count: retryCfg.maxRetries,
          delay: (_err, attempt) => timer(Math.min(retryCfg.baseDelay * Math.pow(2, attempt - 1), retryCfg.maxDelay)),
        })
      );
    }
    return result;
  }
}
