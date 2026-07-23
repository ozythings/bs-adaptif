import { Observable, interval, map } from 'rxjs';

export interface ActivityEvent {
  type: string;
  message: string;
  timestamp: Date;
}

const SAMPLE_EVENTS: string[] = [
  'Ali Korkmaz sınavı tamamladı',
  'Zeynep Arslan yeni içerik izledi',
  'Burak Çelik soru bankasına soru ekledi',
  'Elif Yıldız kaydoldu: Angular Temelleri',
  'Ahmet Yılmaz değerlendirme yaptı',
  'Sistem: oturum zaman aşımı',
];
export class ActivityStreamService {
  stream(intervalMs: number = 5000): Observable<ActivityEvent> {
    let index = 0;
    return interval(intervalMs).pipe(
      map(() => {
        const msg = SAMPLE_EVENTS[index % SAMPLE_EVENTS.length];
        index++;
        return { type: 'activity', message: msg, timestamp: new Date() };
      })
    );
  }
}
