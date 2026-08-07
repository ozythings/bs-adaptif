import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FocusTrapDirective } from '@shared/directives/focus-trap.directive';
import { ConfirmDialogData } from '@core/models/confirm-dialog-data.model';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, FocusTrapDirective],
  template: `
    <div appFocusTrap>
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      @if (data.messageItems && data.messageItems.length > 0) {
        <div class="space-y-2 text-gray-900">
          @for (item of data.messageItems; track $index) {
            <div class="flex items-center gap-2">
              @if (item.icon) {
                <span class="material-icons text-sm align-middle" [class]="item.iconClass || ''">{{ item.icon }}</span>
              }
              <span>{{ item.text }}</span>
            </div>
          }
        </div>
      } @else {
        <p class="whitespace-pre-line text-gray-900">{{ data.message }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">{{ data.cancelLabel || 'İptal' }}</button>
      <button mat-raised-button color="warn" (click)="onConfirm()">{{ data.confirmLabel || 'Onayla' }}</button>
    </mat-dialog-actions>
    </div>
  `
})
export class ConfirmDialogComponent {
  private dialogRef = inject(MatDialogRef);
  data: ConfirmDialogData = inject(MAT_DIALOG_DATA);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
