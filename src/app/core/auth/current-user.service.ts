import { inject,  signal } from '@angular/core';
import { UserRole } from '@core/models/enums';
import { StorageService } from '@core/storage/storage.service';

export interface UserInfo {
  id: number;
  name: string;
  role: UserRole;
  instructorId?: number;
  studentId?: number;
  assessmentSpecialistId?: number;
  observerCohortIds?: number[];
}

export const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole.PLATFORM_ADMIN]: [UserRole.PROGRAM_MANAGER, UserRole.INSTRUCTOR, UserRole.ASSESSMENT_SPECIALIST, UserRole.OBSERVER, UserRole.STUDENT, UserRole.PLATFORM_ADMIN],
  [UserRole.PROGRAM_MANAGER]: [UserRole.OBSERVER, UserRole.STUDENT, UserRole.PROGRAM_MANAGER],
  [UserRole.INSTRUCTOR]: [UserRole.INSTRUCTOR, UserRole.STUDENT],
  [UserRole.ASSESSMENT_SPECIALIST]: [UserRole.ASSESSMENT_SPECIALIST],
  [UserRole.OBSERVER]: [UserRole.OBSERVER],
  [UserRole.STUDENT]: [UserRole.STUDENT]
};

const DEMO_USERS: UserInfo[] = [
  { id: 1, name: 'Platform Yöneticisi', role: UserRole.PLATFORM_ADMIN },
  { id: 2, name: 'Ahmet Yılmaz', role: UserRole.INSTRUCTOR, instructorId: 1 },
  { id: 3, name: 'Ayşe Demir', role: UserRole.INSTRUCTOR, instructorId: 2 },
  { id: 4, name: 'Ali Korkmaz', role: UserRole.STUDENT, studentId: 1 },
  { id: 5, name: 'Zeynep Arslan', role: UserRole.STUDENT, studentId: 2 },
  { id: 6, name: 'Dr. Mehmet Can', role: UserRole.ASSESSMENT_SPECIALIST, assessmentSpecialistId: 1 },
  { id: 7, name: 'Elif Yıldız', role: UserRole.PROGRAM_MANAGER },
  { id: 8, name: 'Ali Rıza', role: UserRole.OBSERVER, observerCohortIds: [100, 101, 102] },
  { id: 9, name: 'Mehmet Kaya', role: UserRole.INSTRUCTOR, instructorId: 3 },
  { id: 10, name: 'Fatma Öztürk', role: UserRole.INSTRUCTOR, instructorId: 4 },
];
export class CurrentUserService {
  private readonly STORAGE_KEY = 'current_user';
  private storage = inject(StorageService);
  private userSignal = signal<UserInfo>(this.loadUser());

  readonly user = this.userSignal.asReadonly();

  private loadUser(): UserInfo {
    return this.storage.get<UserInfo>(this.STORAGE_KEY) || DEMO_USERS[0];
  }

  isAuthenticated(): boolean {
    return this.userSignal().id > 0;
  }

  getUser(): UserInfo {
    return this.userSignal();
  }

  setUser(user: UserInfo): void {
    this.userSignal.set(user);
    this.storage.set(this.STORAGE_KEY, user);
  }

  switchUser(userId: number): void {
    const user = DEMO_USERS.find(u => u.id === userId);
    if (user) {
      this.setUser(user);
    }
  }

  getAvailableUsers(): UserInfo[] {
    return DEMO_USERS;
  }

  /** @deprecated Use PermissionService.hasPermission() instead */
  hasRole(role: UserRole): boolean {
    const effective = ROLE_HIERARCHY[this.userSignal().role] || [this.userSignal().role];
    return effective.includes(role);
  }

  /** @deprecated Use PermissionService.hasAnyPermission() instead */
  hasAnyRole(roles: UserRole[]): boolean {
    const effective = ROLE_HIERARCHY[this.userSignal().role] || [this.userSignal().role];
    return roles.some(r => effective.includes(r));
  }

  isInstructor(): boolean {
    return this.userSignal().role === UserRole.INSTRUCTOR;
  }

  isStudent(): boolean {
    return this.userSignal().role === UserRole.STUDENT;
  }
}
