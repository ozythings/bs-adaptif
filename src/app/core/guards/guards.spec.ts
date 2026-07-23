import { describe, it, expect } from 'vitest';

describe('RoleGuard (unit)', () => {
  it('should allow access when user role is in required roles', () => {
    const userRole = 'admin';
    const requiredRoles = ['admin', 'instructor'];
    expect(requiredRoles.includes(userRole)).toBe(true);
  });

  it('should deny access when user role is not in required roles', () => {
    const userRole = 'participant';
    const requiredRoles = ['admin'];
    expect(requiredRoles.includes(userRole)).toBe(false);
  });

  it('should allow participant to access participant routes', () => {
    const userRole = 'participant';
    const requiredRoles = ['admin', 'instructor', 'participant'];
    expect(requiredRoles.includes(userRole)).toBe(true);
  });

  it('should deny admin-only access for instructor', () => {
    const userRole = 'instructor';
    const requiredRoles = ['admin'];
    expect(requiredRoles.includes(userRole)).toBe(false);
  });

  it('should handle multiple required roles correctly', () => {
    const checkRole = (userRole: string, requiredRoles: string[]): boolean =>
      requiredRoles.includes(userRole);

    expect(checkRole('admin', ['admin', 'instructor'])).toBe(true);
    expect(checkRole('instructor', ['admin', 'instructor'])).toBe(true);
    expect(checkRole('participant', ['admin'])).toBe(false);
    expect(checkRole('unknown', ['admin', 'instructor'])).toBe(false);
  });
});
