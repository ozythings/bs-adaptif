import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { UserRole } from '@core/models/enums';
import { PERMISSION_CATEGORIES, ROLE_LABELS, ROLE_PERMISSIONS } from '@core/auth/permission-constants';

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  [UserRole.PLATFORM_ADMIN]: 'bg-red-100 text-red-700',
  [UserRole.PROGRAM_MANAGER]: 'bg-amber-100 text-amber-700',
  [UserRole.INSTRUCTOR]: 'bg-blue-100 text-blue-700',
  [UserRole.ASSESSMENT_SPECIALIST]: 'bg-purple-100 text-purple-700',
  [UserRole.OBSERVER]: 'bg-gray-100 text-gray-700',
  [UserRole.STUDENT]: 'bg-green-100 text-green-700',
};

const CATEGORY_BORDER_COLORS: Record<string, string> = {
  course: 'border-blue-300',
  exam: 'border-orange-300',
  question: 'border-indigo-300',
  grading: 'border-amber-300',
  analytics: 'border-teal-300',
  cohort: 'border-purple-300',
  outcome: 'border-emerald-300',
  audit: 'border-red-300',
  system: 'border-slate-300',
  student: 'border-cyan-300',
};

const FLAT_PERMISSIONS = PERMISSION_CATEGORIES.flatMap(cat =>
  cat.permissions.map(p => ({
    ...p,
    categoryKey: cat.key,
    categoryLabel: cat.label,
    categoryBorder: CATEGORY_BORDER_COLORS[cat.key] || 'border-gray-300',
  }))
);

const ROLE_PERMISSIONS_TABLE = (Object.keys(ROLE_PERMISSIONS) as UserRole[]).map(role => ({
  role,
  label: ROLE_LABELS[role],
  badgeClass: ROLE_BADGE_CLASSES[role] || 'bg-gray-100 text-gray-700',
  permissions: ROLE_PERMISSIONS[role],
}));

const CATEGORY_START_KEYS = new Set(
  PERMISSION_CATEGORIES.map(cat => cat.permissions[0]?.key).filter(Boolean)
);

@Component({
  selector: 'app-role-permission-list',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-bold text-gray-900">Roller ve İzinler</h1>

      <div class="bg-white rounded-xl shadow-sm border-l-4 border-blue-500 hover:shadow-md transition-shadow">
        <div class="p-4 overflow-x-auto">
          <table class="w-full text-sm border-separate border-spacing-0 min-w-[800px]">
            <thead>
              <tr>
                <th class="text-left py-2.5 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wide relative md:sticky md:left-0 md:z-20 border-r border-gray-200 min-w-[160px] md:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]"
                    style="background-color: #f9fafb;">
                  Rol
                </th>
                @for (perm of flatPermissions; track perm.key) {
                  <th class="text-center py-2.5 px-2 font-semibold text-xs uppercase tracking-wide bg-gray-50 whitespace-nowrap"
                    [class]="perm.categoryBorder"
                    [class.border-l-2]="isCategoryStart(perm)">
                    <span class="block text-[10px] text-gray-400 font-normal mb-0.5">{{ perm.categoryLabel }}</span>
                    <span class="font-medium text-gray-600">{{ perm.label }}</span>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (rp of rolePermissions; track rp.role; let odd = $odd) {
                <tr [class.bg-gray-50/30]="odd" class="border-t border-gray-100">
                  <td class="py-2.5 px-3 whitespace-nowrap relative md:sticky md:left-0 md:z-10 border-r border-gray-100 md:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]"
                      [style.background-color]="odd ? '#f9fafb' : '#ffffff'">
                    <span class="inline-block px-2 py-0.5 rounded text-xs font-medium" [class]="rp.badgeClass">
                      {{ rp.label }}
                    </span>
                  </td>
                  @for (perm of flatPermissions; track perm.key) {
                    <td class="py-2.5 px-2 text-center transition-colors hover:bg-blue-50/50"
                      [class]="perm.categoryBorder"
                      [class.border-l-2]="isCategoryStart(perm)">
                      @if (rp.permissions[perm.key]) {
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-50">
                          <mat-icon class="text-base leading-none" style="color: #16a34a">check_circle</mat-icon>
                        </span>
                      } @else {
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-50">
                          <mat-icon class="text-base leading-none" style="color: #d1d5db">cancel</mat-icon>
                        </span>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-6 text-sm">
        <span class="font-medium text-gray-700">Gösterge:</span>
        <div class="flex items-center gap-1.5">
          <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-50">
            <mat-icon class="text-sm leading-none" style="color: #16a34a">check_circle</mat-icon>
          </span>
          <span class="text-gray-600">İzin Var</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-50">
            <mat-icon class="text-sm leading-none" style="color: #d1d5db">cancel</mat-icon>
          </span>
          <span class="text-gray-600">İzin Yok</span>
        </div>
        <div class="h-4 w-px bg-gray-200"></div>
        @for (rp of rolePermissions; track rp.role) {
          <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium" [class]="rp.badgeClass">
            {{ rp.label }}
          </span>
        }
      </div>
    </div>
  `
})
export class RolePermissionListComponent {
  rolePermissions = ROLE_PERMISSIONS_TABLE;
  flatPermissions = FLAT_PERMISSIONS;

  isCategoryStart(perm: { key: string }): boolean {
    return CATEGORY_START_KEYS.has(perm.key);
  }
}
