import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { UserRole } from '@core/models/enums';
import { CurrentUserService, ROLE_HIERARCHY } from '@core/auth/current-user.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const currentUser = inject(CurrentUserService);
  const router = inject(Router);

  let snapshot: ActivatedRouteSnapshot | null = route;
  while (snapshot && !snapshot.data['roles']) {
    snapshot = snapshot.parent;
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
