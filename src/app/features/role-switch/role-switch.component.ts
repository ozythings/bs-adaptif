import { Component,  inject,  signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CurrentUserService, UserInfo } from '@core/auth/current-user.service';
import { AuditAction, UserRole } from '@core/models/enums';
import { AuditService } from '@core/observability/audit.service';
import { NotificationService } from '@core/observability/notification.service';
import { ConfirmDialogComponent } from '@shared/components';
import { clearSnapshot } from '@core/data/seed-persist';

@Component({
  selector: 'app-role-switch',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule, ConfirmDialogComponent],
  template: `
    <div class="space-y-4">
      <div class="flex items-center gap-2 mb-2">
        <button mat-icon-button routerLink="/learning/dashboard" matTooltip="Geri Dön">
          <mat-icon>arrow_back</mat-icon>
        </button>
      </div>
      <h1 class="text-2xl font-bold text-gray-900">Kullanıcı Değiştir</h1>

      <div class="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <p class="text-sm text-gray-500">
          Şu anki kullanıcı: <span class="font-medium text-gray-900">{{ user().name }}</span>
          <span class="text-xs text-gray-400 ml-2">({{ roleLabel(user().role) }})</span>
        </p>

        <div class="space-y-2 max-h-96 overflow-y-auto">
          @for (u of users; track u.id) {
            <button (click)="switchUser(u)"
              class="w-full text-left px-4 py-3 rounded-lg border-2 flex items-center justify-between transition-colors"
              [class.border-blue-500]="selectedId() === u.id"
              [class.bg-blue-50]="selectedId() === u.id"
              [class.border-gray-200]="selectedId() !== u.id"
              [class.hover:border-blue-300]="selectedId() !== u.id">
              <div>
                <span class="font-medium text-gray-900">{{ u.name }}</span>
                <span class="text-xs text-gray-500 ml-2">({{ roleLabel(u.role) }})</span>
              </div>
              @if (selectedId() === u.id) {
                <mat-icon color="primary">check_circle</mat-icon>
              }
            </button>
          }
        </div>

        <div class="flex justify-end pt-3 border-t">
          <button mat-raised-button color="primary"
            [disabled]="!selectedId() || selectedId() === user().id"
            (click)="confirmSwitch()">Değiştir</button>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm p-6 space-y-3">
        <h2 class="text-lg font-semibold text-gray-900">Veri Yönetimi</h2>
        <p class="text-sm text-gray-500">
          Yerel depolamadaki (localStorage) tüm uygulama verilerini siler ve başlangıç verilerine döner.
          Kurs tamamlama, çalışma sayıları ve kazanım puanları sıfırlanır.
        </p>
        <button mat-stroked-button color="warn" (click)="confirmReset()">
          <mat-icon>restart_alt</mat-icon> Verileri Sıfırla
        </button>
      </div>
    </div>
  `
})
export class RoleSwitchComponent {
  private currentUserService = inject(CurrentUserService);
  private auditService = inject(AuditService);
  private notificationService = inject(NotificationService);
  private dialog = inject(MatDialog);

  readonly user = this.currentUserService.user;
  readonly users: UserInfo[] = this.currentUserService.getAvailableUsers();

  selectedId = signal<number | null>(null);

  switchUser(u: UserInfo): void {
    this.selectedId.set(u.id);
  }

  confirmSwitch(): void {
    const id = this.selectedId();
    if (!id) return;
    const target = this.users.find(u => u.id === id);
    if (!target) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Kullanıcı Değiştir',
        message: `"${target.name}" kullanıcısına geçmek istediğinize emin misiniz? (${this.roleLabel(target.role)})`,
        confirmLabel: 'Değiştir',
        cancelLabel: 'İptal',
      },
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      const previousRole = this.roleLabel(this.user().role);
      this.currentUserService.switchUser(id);
      this.auditService.log({
        action: AuditAction.SWITCH,
        entity: 'User',
        entityId: id,
        description: `Rol "${previousRole}" → "${this.roleLabel(target.role)}" olarak değiştirildi: ${target.name}`
      });
      this.notificationService.show(`Kullanıcı "${target.name}" olarak değiştirildi`, 'success');
    });
  }

  confirmReset(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Verileri Sıfırla',
        message: 'Tüm yerel uygulama verileri silinecek ve başlangıç verilerine dönülecek. Emin misiniz?',
        confirmLabel: 'Sıfırla',
        cancelLabel: 'İptal',
      },
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      clearSnapshot();
      this.notificationService.show('Veriler sıfırlandı, sayfa yenileniyor', 'success');
      window.location.reload();
    });
  }

  roleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      [UserRole.INSTRUCTOR]: 'Eğitmen',
      [UserRole.STUDENT]: 'Öğrenci',
      [UserRole.ASSESSMENT_SPECIALIST]: 'Ölçme Uzmanı',
      [UserRole.PROGRAM_MANAGER]: 'Program Yöneticisi',
      [UserRole.OBSERVER]: 'Gözlemci',
      [UserRole.PLATFORM_ADMIN]: 'Platform Yöneticisi'
    };
    return labels[role] || role;
  }
}
