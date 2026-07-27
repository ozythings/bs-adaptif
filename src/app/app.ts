import { Component,  inject,  signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastComponent } from '@shared/components/toast/toast.component';
import { CurrentUserService, ROLE_HIERARCHY } from '@core/auth/current-user.service';
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
  protected readonly menuOpen = signal(window.innerWidth >= 768);

  readonly user = this.currentUserService.user;

  readonly UserRole = UserRole;

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  canAccess(roles: UserRole[]): boolean {
    const userRole = this.user().role;
    const effective = ROLE_HIERARCHY[userRole] || [userRole];
    return roles.some(r => effective.includes(r));
  }

  getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      [UserRole.PLATFORM_ADMIN]: 'Platform Yöneticisi',
      [UserRole.PROGRAM_MANAGER]: 'Program Yöneticisi',
      [UserRole.ADMIN]: 'Eğitim Yöneticisi',
      [UserRole.INSTRUCTOR]: 'Eğitmen',
      [UserRole.ASSESSMENT_SPECIALIST]: 'Ölçme Uzmanı',
      [UserRole.OBSERVER]: 'Gözlemci',
      [UserRole.PARTICIPANT]: 'Katılımcı'
    };
    return labels[role] || role;
  }
}
