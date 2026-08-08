import { Component,  inject,  signal,  computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { CurrentUserService, UserInfo } from '@core/auth/current-user.service';
import { AuditAction, UserRole } from '@core/models/enums';
import { AuditService } from '@core/observability/audit.service';
import { NotificationService } from '@core/observability/notification.service';
import { ConfirmDialogComponent } from '@shared/components';
import { clearSnapshot } from '@core/data/seed-persist';

@Component({
  selector: 'app-role-switch',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule, MatFormFieldModule, MatSelectModule],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button mat-icon-button routerLink="/learning/dashboard" matTooltip="Geri Dön">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1 class="text-2xl font-bold text-gray-900">Kullanıcı Değiştir</h1>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <div>
          <p class="text-sm text-gray-500 mb-3">
            Şu anki kullanıcı: <span class="font-medium text-gray-900">{{ user().name }}</span>
            <span class="text-xs text-gray-400 ml-2">({{ roleLabel(user().role) }})</span>
          </p>
        </div>

        <div>
          <p class="text-sm font-semibold text-gray-700 mb-3">1. Rol Seçin</p>
          <div class="grid grid-cols-3 gap-4">
            @for (r of roleGroups; track r.role) {
              <button (click)="selectRole(r.role)"
                class="w-full h-28 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-colors"
                [class.bg-blue-600]="selectedRole() === r.role"
                [class.text-white]="selectedRole() === r.role"
                [class.border-blue-600]="selectedRole() === r.role"
                [class.bg-white]="selectedRole() !== r.role"
                [class.border-gray-200]="selectedRole() !== r.role"
                [class.text-gray-700]="selectedRole() !== r.role"
                [class.hover:border-blue-400]="selectedRole() !== r.role">
                <mat-icon class="text-3xl" [class.text-white]="selectedRole() === r.role" [class.text-gray-400]="selectedRole() !== r.role">{{ roleIcon(r.role) }}</mat-icon>
                <span class="text-sm">{{ roleLabel(r.role) }}</span>
              </button>
            }
          </div>
        </div>

        @if (selectedRole()) {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Kullanıcı Seçin</mat-label>
            <mat-select [value]="selectedId()" (selectionChange)="selectedId.set($event.value)">
              @for (u of usersByRole(); track u.id) {
                <mat-option [value]="u.id">{{ u.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        <div class="flex justify-end gap-3 pt-4 border-t">
          <button mat-button routerLink="/learning/dashboard">İptal</button>
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
  selectedRole = signal<UserRole | null>(null);

  roleGroups: { role: UserRole; users: UserInfo[] }[] = [];

  constructor() {
    const order: UserRole[] = [
      UserRole.PLATFORM_ADMIN,
      UserRole.INSTRUCTOR,
      UserRole.STUDENT,
      UserRole.ASSESSMENT_SPECIALIST,
      UserRole.PROGRAM_MANAGER,
      UserRole.OBSERVER,
    ];
    this.roleGroups = order
      .map(role => ({ role, users: this.users.filter(u => u.role === role) }))
      .filter(g => g.users.length > 0);
  }

  usersByRole = computed(() => {
    const role = this.selectedRole();
    if (!role) return [];
    return this.users.filter(u => u.role === role);
  });

  selectRole(role: UserRole): void {
    this.selectedRole.set(role);
    this.selectedId.set(null);
  }

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
      [UserRole.PLATFORM_ADMIN]: 'Platform Yöneticisi',
      [UserRole.INSTRUCTOR]: 'Eğitmen',
      [UserRole.STUDENT]: 'Öğrenci',
      [UserRole.ASSESSMENT_SPECIALIST]: 'Ölçme Uzmanı',
      [UserRole.PROGRAM_MANAGER]: 'Program Yöneticisi',
      [UserRole.OBSERVER]: 'Gözlemci',
    };
    return labels[role] || role;
  }

  roleIcon(role: UserRole): string {
    const icons: Record<UserRole, string> = {
      [UserRole.PLATFORM_ADMIN]: 'admin_panel_settings',
      [UserRole.INSTRUCTOR]: 'school',
      [UserRole.STUDENT]: 'people',
      [UserRole.ASSESSMENT_SPECIALIST]: 'fact_check',
      [UserRole.PROGRAM_MANAGER]: 'manage_accounts',
      [UserRole.OBSERVER]: 'visibility',
    };
    return icons[role] || 'person';
  }
}
