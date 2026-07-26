import { Component,  input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-autosave-indicator',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <span class="flex items-center gap-1 text-sm"
          [class.text-green-600]="status() === 'saved'"
          [class.text-orange-600]="status() === 'saving'"
          [class.text-red-600]="status() === 'offline' || status() === 'conflict' || status() === 'error'">
      @if (status() === 'saved') { <mat-icon class="text-sm">cloud_done</mat-icon> }
      @if (status() === 'saving') { <mat-icon class="text-sm animate-pulse">cloud_upload</mat-icon> }
      @if (status() === 'offline') { <mat-icon class="text-sm">cloud_off</mat-icon> }
      @if (status() === 'conflict') { <mat-icon class="text-sm">warning</mat-icon> }
      @if (status() === 'error') { <mat-icon class="text-sm">error_outline</mat-icon> }
      {{ label() }}
    </span>
  `
})
export class AutosaveIndicatorComponent {
  status = input<'saved' | 'saving' | 'offline' | 'conflict' | 'error'>('saved');

  protected label(): string {
    switch (this.status()) {
      case 'saved': return 'Kaydedildi';
      case 'saving': return 'Kaydediliyor';
      case 'offline': return 'Çevrimdışı';
      case 'conflict': return 'Çakışma';
      case 'error': return 'Hata';
    }
  }
}
