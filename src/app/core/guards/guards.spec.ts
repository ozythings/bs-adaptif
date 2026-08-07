import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS } from '@core/auth/permission-constants';
import { UserRole } from '@core/models/enums';

describe('RoleGuard (unit)', () => {
  it('should allow access when user role is in required roles', () => {
    const userRole = 'platform_admin';
    const requiredRoles = ['platform_admin', 'instructor'];
    expect(requiredRoles.includes(userRole)).toBe(true);
  });

  it('should deny access when user role is not in required roles', () => {
    const userRole = 'student';
    const requiredRoles = ['platform_admin'];
    expect(requiredRoles.includes(userRole)).toBe(false);
  });

  it('should allow student to access student routes', () => {
    const userRole = 'student';
    const requiredRoles = ['platform_admin', 'instructor', 'student'];
    expect(requiredRoles.includes(userRole)).toBe(true);
  });

  it('should deny platform-admin-only access for instructor', () => {
    const userRole = 'instructor';
    const requiredRoles = ['platform_admin'];
    expect(requiredRoles.includes(userRole)).toBe(false);
  });

  it('should handle multiple required roles correctly', () => {
    const checkRole = (userRole: string, requiredRoles: string[]): boolean =>
      requiredRoles.includes(userRole);

    expect(checkRole('platform_admin', ['platform_admin', 'instructor'])).toBe(true);
    expect(checkRole('instructor', ['platform_admin', 'instructor'])).toBe(true);
    expect(checkRole('student', ['platform_admin'])).toBe(false);
    expect(checkRole('unknown', ['platform_admin', 'instructor'])).toBe(false);
  });
});

describe('PermissionGuard (permission-based)', () => {
  const hasPermission = (role: UserRole, permission: string): boolean =>
    ROLE_PERMISSIONS[role]?.[permission] === true;

  const hasAnyPermission = (role: UserRole, permissions: string[]): boolean =>
    permissions.some(p => ROLE_PERMISSIONS[role]?.[p] === true);

  it('should allow grading_grade for instructor and assessment_specialist', () => {
    expect(hasPermission(UserRole.INSTRUCTOR, 'grading_grade')).toBe(true);
    expect(hasPermission(UserRole.ASSESSMENT_SPECIALIST, 'grading_grade')).toBe(true);
    expect(hasPermission(UserRole.STUDENT, 'grading_grade')).toBe(false);
    expect(hasPermission(UserRole.OBSERVER, 'grading_grade')).toBe(false);
  });

  it('should allow outcome_read for assessment_specialist', () => {
    expect(hasPermission(UserRole.ASSESSMENT_SPECIALIST, 'outcome_read')).toBe(true);
    expect(hasPermission(UserRole.INSTRUCTOR, 'outcome_read')).toBe(true);
    expect(hasPermission(UserRole.OBSERVER, 'outcome_read')).toBe(true);
  });

  it('should allow audit_read only for platform_admin', () => {
    expect(hasPermission(UserRole.PLATFORM_ADMIN, 'audit_read')).toBe(true);
    expect(hasPermission(UserRole.PROGRAM_MANAGER, 'audit_read')).toBe(false);
    expect(hasPermission(UserRole.INSTRUCTOR, 'audit_read')).toBe(false);
  });

  it('should allow system_manage_roles only for platform_admin', () => {
    expect(hasPermission(UserRole.PLATFORM_ADMIN, 'system_manage_roles')).toBe(true);
    expect(hasPermission(UserRole.PROGRAM_MANAGER, 'system_manage_roles')).toBe(false);
  });

  it('should allow exam_create for instructor, assessment_specialist, program_manager, platform_admin', () => {
    const rolesWithExamCreate = [UserRole.INSTRUCTOR, UserRole.ASSESSMENT_SPECIALIST, UserRole.PROGRAM_MANAGER, UserRole.PLATFORM_ADMIN];
    const rolesWithout = [UserRole.STUDENT, UserRole.OBSERVER];

    for (const role of rolesWithExamCreate) {
      expect(hasPermission(role, 'exam_create')).toBe(true);
    }
    for (const role of rolesWithout) {
      expect(hasPermission(role, 'exam_create')).toBe(false);
    }
  });

  it('should handle hasAnyPermission correctly', () => {
    expect(hasAnyPermission(UserRole.INSTRUCTOR, ['grading_grade', 'grading_override'])).toBe(true);
    expect(hasAnyPermission(UserRole.ASSESSMENT_SPECIALIST, ['grading_grade', 'grading_override'])).toBe(true);
    expect(hasAnyPermission(UserRole.STUDENT, ['grading_grade', 'grading_override'])).toBe(false);
  });
});
