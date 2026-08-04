import { Component,  inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '@core/observability/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      @for (toast of notificationService.current(); track toast.id) {
        <div class="pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-white text-sm max-w-sm animate-slide-in"
             [class.bg-green-600]="toast.type === 'success'"
             [class.bg-red-600]="toast.type === 'error'"
             [class.bg-blue-600]="toast.type === 'info'"
             [class.bg-amber-500]="toast.type === 'warning'"
             (click)="notificationService.remove(toast.id)">
          {{ toast.message }}
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .animate-slide-in { animation: slide-in 0.3s ease-out; }
  `]
})
export class ToastComponent {
  protected notificationService = inject(NotificationService);
}
