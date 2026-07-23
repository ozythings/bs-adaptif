import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationService } from '@core/observability/notification.service';
import { tap } from 'rxjs/operators';
export class OptimisticService {
  private notification = inject(NotificationService);

  execute<T>(
    apply: () => void,
    rollback: () => void,
    apiCall: () => Observable<T>
  ): Observable<T> {
    apply();
    return apiCall().pipe(
      tap({
        error: () => {
          rollback();
          this.notification.show('İşlem başarısız oldu, değişiklikler geri alındı', 'error');
        }
      })
    );
  }
}
