import { Component,  input,  output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <div class="text-red-500 text-6xl mb-4">⚠</div>
      <p class="text-gray-700 text-lg font-medium mb-2">{{ title() }}</p>
      <p class="text-gray-500 mb-6">{{ message() }}</p>
      @if (retryable()) {
        <button mat-raised-button color="primary" (click)="onRetry()">
          Tekrar Dene
        </button>
      }
    </div>
  `
})
export class ErrorStateComponent {
  title = input('Bir hata oluştu');
  message = input('Lütfen daha sonra tekrar deneyin.');
  retryable = input(true);

  retry = output<void>();

  onRetry(): void {
    this.retry.emit();
  }
}
