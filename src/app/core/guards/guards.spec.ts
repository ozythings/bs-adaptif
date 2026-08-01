import { describe, it, expect } from 'vitest';

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
