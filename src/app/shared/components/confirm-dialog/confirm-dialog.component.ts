import { Component,  inject } from '@angular/core';
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
      <p class="whitespace-pre-line">{{ data.message }}</p>
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
