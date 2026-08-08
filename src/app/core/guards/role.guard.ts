import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { UserRole } from '@core/models/enums';
import { CurrentUserService, ROLE_HIERARCHY } from '@core/auth/current-user.service';
import { PermissionService } from '@core/auth/permission.service';

export const studentRedirectGuard: CanActivateFn = () => {
  const user = inject(CurrentUserService);
  const router = inject(Router);
  if (user.getUser().role === UserRole.STUDENT) {
    router.navigate(['/learning/dashboard']);
    return false;
  }
  return true;
};

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const currentUser = inject(CurrentUserService);
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  let snapshot: ActivatedRouteSnapshot | null = route;
  while (snapshot && !snapshot.data['roles'] && !snapshot.data['permissions']) {
    snapshot = snapshot.parent;
  }

  const requiredPermissions = (snapshot?.data['permissions'] || []) as string[];
  if (requiredPermissions.length > 0) {
    if (permissionService.hasAnyPermission(requiredPermissions)) {
      return true;
    }
    router.navigate(['/403']);
    return false;
  }

  const requiredRoles = (snapshot?.data['roles'] || []) as UserRole[];
  if (requiredRoles.length === 0) return true;

  const userRole = currentUser.getUser().role;
  const effectiveRoles = ROLE_HIERARCHY[userRole] || [userRole];
  if (requiredRoles.some(r => effectiveRoles.includes(r))) {
    return true;
  }
  router.navigate(['/403']);
  return false;
};
