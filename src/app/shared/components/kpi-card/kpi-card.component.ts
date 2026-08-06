import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="bg-white rounded-xl shadow-sm p-5 border-l-4 hover:shadow-md transition-shadow group"
      [class]="borderClass()">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center"
          [class]="iconBgClass()">
          <mat-icon [class]="iconColorClass()">{{ icon() }}</mat-icon>
        </div>
        <div class="flex-1">
          <p class="text-xs text-gray-500">{{ label() }}</p>
          <p class="text-2xl font-bold text-gray-900">{{ value() }}</p>
        </div>
        @if (clickable()) {
          <mat-icon class="text-gray-400 transition-transform" [style.transform]="expanded() ? 'rotate(90deg)' : 'none'">chevron_right</mat-icon>
        }
      </div>
    </div>
  `,
})
export class KpiCardComponent {
  borderClass = input<string>('border-blue-500');
  iconBgClass = input<string>('bg-blue-100');
  iconColorClass = input<string>('text-blue-600');
  icon = input<string>('school');
  label = input<string>('');
  value = input<string | number>('');
  clickable = input<boolean>(false);
  expanded = input<boolean>(false);
  click = output<void>();
}
