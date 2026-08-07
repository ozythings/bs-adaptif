import { Injectable, inject } from '@angular/core';
import { CurrentUserService, ROLE_HIERARCHY } from '@core/auth/current-user.service';
import { UserRole } from '@core/models/enums';
import { ROLE_PERMISSIONS, ROLE_LABELS } from '@core/auth/permission-constants';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private currentUser = inject(CurrentUserService);

  hasPermission(permissionKey: string): boolean {
    const role = this.currentUser.user().role;
    return ROLE_PERMISSIONS[role]?.[permissionKey] === true;
  }

  hasAnyPermission(permissionKeys: string[]): boolean {
    const role = this.currentUser.user().role;
    const rolePerms = ROLE_PERMISSIONS[role];
    if (!rolePerms) return false;
    return permissionKeys.some(key => rolePerms[key] === true);
  }

  hasAllPermissions(permissionKeys: string[]): boolean {
    const role = this.currentUser.user().role;
    const rolePerms = ROLE_PERMISSIONS[role];
    if (!rolePerms) return false;
    return permissionKeys.every(key => rolePerms[key] === true);
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const userRole = this.currentUser.user().role;
    const effective = ROLE_HIERARCHY[userRole] || [userRole];
    return roles.some(r => effective.includes(r));
  }

  getRoleLabel(role: UserRole): string {
    return ROLE_LABELS[role] ?? role;
  }
}
