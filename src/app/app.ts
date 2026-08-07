import { Component,  inject,  signal,  computed } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastComponent } from '@shared/components/toast/toast.component';
import { CurrentUserService, ROLE_HIERARCHY } from '@core/auth/current-user.service';
import { PermissionService } from '@core/auth/permission.service';
import { ROLE_LABELS } from '@core/auth/permission-constants';
import { UserRole } from '@core/models/enums';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    ToastComponent
  ],
  templateUrl: './app.html'
})
export class App {
  private currentUserService = inject(CurrentUserService);
  private permissionService = inject(PermissionService);
  protected readonly menuOpen = signal(window.innerWidth >= 768);

  readonly user = this.currentUserService.user;

  readonly UserRole = UserRole;

  readonly userInitials = computed(() => {
    const parts = this.user().name.split(' ').filter(Boolean);
    if (parts.length >= 2) return parts[0][0] + parts[1][0];
    return parts[0]?.[0] ?? '';
  });

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  canAccess(roles: UserRole[]): boolean {
    const userRole = this.user().role;
    const effective = ROLE_HIERARCHY[userRole] || [userRole];
    return roles.some(r => effective.includes(r));
  }

  can(permissions: string[]): boolean {
    return this.permissionService.hasAnyPermission(permissions);
  }

  getRoleLabel(role: UserRole): string {
    return ROLE_LABELS[role] || role;
  }
}
