import { inject } from '@angular/core';
import { CurrentUserService } from '@core/auth/current-user.service';
import { UserRole } from '@core/models/enums';
import { COURSES_SEED, COHORTS_SEED } from '@core/data';

export interface DataScope {
  allowedStudentIds?: number[];
  allowedCourseIds?: number[];
  allowedCohortIds?: number[];
}
export class DataScopeService {
  private currentUser = inject(CurrentUserService);

  getScope(): DataScope {
    const user = this.currentUser.getUser();
    const role = user.role;

    if (role === UserRole.PLATFORM_ADMIN || role === UserRole.ADMIN) {
      return {};
    }

    if (role === UserRole.PARTICIPANT) {
      return { allowedStudentIds: [user.participantId ?? user.id] };
    }

    if (role === UserRole.INSTRUCTOR) {
      return { allowedCourseIds: COURSES_SEED.filter(c => c.instructorId === user.instructorId).map(c => c.id) };
    }

    if (role === UserRole.PROGRAM_MANAGER) {
      return { allowedCohortIds: COHORTS_SEED.map(c => c.id) };
    }

    if (role === UserRole.OBSERVER) {
      return { allowedCohortIds: user.observerCohortIds ?? COHORTS_SEED.map(c => c.id) };
    }

    return {};
  }

  filterByScope<T extends { studentId?: number; courseId?: number }>(
    items: T[],
    scope: DataScope
  ): T[] {
    if (!scope.allowedStudentIds && !scope.allowedCourseIds) {
      return items;
    }
    return items.filter(item => {
      if (scope.allowedStudentIds && item.studentId != null) {
        return scope.allowedStudentIds.includes(item.studentId);
      }
      return true;
    });
  }
}
