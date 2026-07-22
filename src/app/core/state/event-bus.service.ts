import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface AppEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
}
export class EventBusService {
  private bus = new Subject<AppEvent>();
  readonly events = this.bus.asObservable();

  emit(type: string, payload: unknown): void {
    this.bus.next({ type, payload, timestamp: new Date() });
  }

  ofType<T>(eventType: string): Observable<T> {
    return this.events.pipe(
      filter(e => e.type === eventType),
      map(e => e.payload as T)
    );
  }
}
