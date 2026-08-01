import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { UserRole } from '@core/models/enums';

interface PermissionCategory {
  key: string;
  label: string;
  permissions: { key: string; label: string }[];
}

interface RolePermission {
  role: UserRole;
  label: string;
  permissions: Record<string, boolean>;
}

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    key: 'course',
    label: 'Kurs',
    permissions: [
      { key: 'course_create', label: 'Oluştur' },
      { key: 'course_read', label: 'Görüntüle' },
      { key: 'course_update', label: 'Güncelle' },
      { key: 'course_delete', label: 'Sil' },
      { key: 'course_publish', label: 'Yayınla' },
    ],
  },
  {
    key: 'exam',
    label: 'Sınav',
    permissions: [
      { key: 'exam_create', label: 'Oluştur' },
      { key: 'exam_read', label: 'Görüntüle' },
      { key: 'exam_update', label: 'Güncelle' },
      { key: 'exam_delete', label: 'Sil' },
      { key: 'exam_publish', label: 'Yayınla' },
    ],
  },
  {
    key: 'question',
    label: 'Soru',
    permissions: [
      { key: 'question_create', label: 'Oluştur' },
      { key: 'question_read', label: 'Görüntüle' },
      { key: 'question_update', label: 'Güncelle' },
      { key: 'question_delete', label: 'Sil' },
      { key: 'question_publish', label: 'Yayınla' },
    ],
  },
  {
    key: 'grading',
    label: 'Notlandırma',
    permissions: [
      { key: 'grading_read', label: 'Görüntüle' },
      { key: 'grading_grade', label: 'Not Ver' },
      { key: 'grading_override', label: 'Geçersiz Kıl' },
    ],
  },
  {
    key: 'analytics',
    label: 'Analitik',
    permissions: [{ key: 'analytics_read', label: 'Görüntüle' }],
  },
  {
    key: 'cohort',
    label: 'Kohort',
    permissions: [
      { key: 'cohort_create', label: 'Oluştur' },
      { key: 'cohort_read', label: 'Görüntüle' },
      { key: 'cohort_update', label: 'Güncelle' },
      { key: 'cohort_delete', label: 'Sil' },
    ],
  },
  {
    key: 'outcome',
    label: 'Kazanım',
    permissions: [
      { key: 'outcome_create', label: 'Oluştur' },
      { key: 'outcome_read', label: 'Görüntüle' },
      { key: 'outcome_update', label: 'Güncelle' },
      { key: 'outcome_delete', label: 'Sil' },
    ],
  },
  {
    key: 'audit',
    label: 'Denetim',
    permissions: [{ key: 'audit_read', label: 'Görüntüle' }],
  },
  {
    key: 'system',
    label: 'Sistem',
    permissions: [
      { key: 'system_manage_roles', label: 'Rolleri Yönet' },
      { key: 'system_manage_terms', label: 'Dönemleri Yönet' },
      { key: 'system_manage_parameters', label: 'Parametreleri Yönet' },
    ],
  },
];

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.PLATFORM_ADMIN]: 'Platform Yöneticisi',
  [UserRole.PROGRAM_MANAGER]: 'Program Yöneticisi',
  [UserRole.INSTRUCTOR]: 'Eğitmen',
  [UserRole.ASSESSMENT_SPECIALIST]: 'Ölçme Uzmanı',
  [UserRole.OBSERVER]: 'Gözlemci',
  [UserRole.STUDENT]: 'Öğrenci',
};

const ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: UserRole.PLATFORM_ADMIN,
    label: 'Platform Yöneticisi',
    permissions: {
      course_create: true, course_read: true, course_update: true, course_delete: true, course_publish: true,
      exam_create: true, exam_read: true, exam_update: true, exam_delete: true, exam_publish: true,
      question_create: true, question_read: true, question_update: true, question_delete: true, question_publish: true,
      grading_read: true, grading_grade: true, grading_override: true,
      analytics_read: true,
      cohort_create: true, cohort_read: true, cohort_update: true, cohort_delete: true,
      outcome_create: true, outcome_read: true, outcome_update: true, outcome_delete: true,
      audit_read: true,
      system_manage_roles: true, system_manage_terms: true, system_manage_parameters: true,
    },
  },
  {
    role: UserRole.PROGRAM_MANAGER,
    label: 'Program Yöneticisi',
    permissions: {
      course_create: true, course_read: true, course_update: true, course_delete: false, course_publish: true,
      exam_create: true, exam_read: true, exam_update: true, exam_delete: false, exam_publish: true,
      question_create: false, question_read: true, question_update: false, question_delete: false, question_publish: false,
      grading_read: true, grading_grade: false, grading_override: false,
      analytics_read: true,
      cohort_create: true, cohort_read: true, cohort_update: true, cohort_delete: true,
      outcome_create: true, outcome_read: true, outcome_update: true, outcome_delete: true,
      audit_read: false,
      system_manage_roles: false, system_manage_terms: false, system_manage_parameters: false,
    },
  },
  {
    role: UserRole.INSTRUCTOR,
    label: 'Eğitmen',
    permissions: {
      course_create: false, course_read: true, course_update: true, course_delete: false, course_publish: false,
      exam_create: true, exam_read: true, exam_update: true, exam_delete: false, exam_publish: true,
      question_create: true, question_read: true, question_update: true, question_delete: false, question_publish: true,
      grading_read: true, grading_grade: true, grading_override: false,
      analytics_read: true,
      cohort_create: false, cohort_read: true, cohort_update: false, cohort_delete: false,
      outcome_create: false, outcome_read: true, outcome_update: false, outcome_delete: false,
      audit_read: false,
      system_manage_roles: false, system_manage_terms: false, system_manage_parameters: false,
    },
  },
  {
    role: UserRole.ASSESSMENT_SPECIALIST,
    label: 'Ölçme Uzmanı',
    permissions: {
      course_create: false, course_read: true, course_update: false, course_delete: false, course_publish: false,
      exam_create: true, exam_read: true, exam_update: true, exam_delete: false, exam_publish: true,
      question_create: true, question_read: true, question_update: true, question_delete: false, question_publish: true,
      grading_read: true, grading_grade: true, grading_override: true,
      analytics_read: true,
      cohort_create: false, cohort_read: true, cohort_update: false, cohort_delete: false,
      outcome_create: false, outcome_read: true, outcome_update: false, outcome_delete: false,
      audit_read: false,
      system_manage_roles: false, system_manage_terms: false, system_manage_parameters: false,
    },
  },
  {
    role: UserRole.OBSERVER,
    label: 'Gözlemci',
    permissions: {
      course_create: false, course_read: true, course_update: false, course_delete: false, course_publish: false,
      exam_create: false, exam_read: true, exam_update: false, exam_delete: false, exam_publish: false,
      question_create: false, question_read: true, question_update: false, question_delete: false, question_publish: false,
      grading_read: true, grading_grade: false, grading_override: false,
      analytics_read: true,
      cohort_create: false, cohort_read: true, cohort_update: false, cohort_delete: false,
      outcome_create: false, outcome_read: true, outcome_update: false, outcome_delete: false,
      audit_read: false,
      system_manage_roles: false, system_manage_terms: false, system_manage_parameters: false,
    },
  },
  {
    role: UserRole.STUDENT,
    label: 'Öğrenci',
    permissions: {
      course_create: false, course_read: true, course_update: false, course_delete: false, course_publish: false,
      exam_create: false, exam_read: true, exam_update: false, exam_delete: false, exam_publish: false,
      question_create: false, question_read: false, question_update: false, question_delete: false, question_publish: false,
      grading_read: false, grading_grade: false, grading_override: false,
      analytics_read: false,
      cohort_create: false, cohort_read: false, cohort_update: false, cohort_delete: false,
      outcome_create: false, outcome_read: false, outcome_update: false, outcome_delete: false,
      audit_read: false,
      system_manage_roles: false, system_manage_terms: false, system_manage_parameters: false,
    },
  },
];

const FLAT_PERMISSIONS = PERMISSION_CATEGORIES.flatMap(cat =>
  cat.permissions.map(p => ({ ...p, categoryKey: cat.key, categoryLabel: () => cat.label }))
);

const DISPLAYED_COLUMNS = ['role', ...FLAT_PERMISSIONS.map(p => p.key)];

@Component({
  selector: 'app-role-permission-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-bold text-gray-900">Roller ve İzinler</h1>

      <mat-card class="overflow-x-auto">
        <div class="p-4">
          <table mat-table [dataSource]="rolePermissions" class="w-full">
            <ng-container matColumnDef="role">
              <th mat-header-cell *matHeaderCellDef class="bg-gray-50 font-semibold whitespace-nowrap sticky left-0 z-10 bg-gray-50">Rol</th>
              <td mat-cell *matCellDef="let rp" class="font-medium whitespace-nowrap sticky left-0 bg-white z-10">{{ rp.label }}</td>
            </ng-container>

            @for (perm of flatPermissions; track perm.key) {
              <ng-container [matColumnDef]="perm.key">
                <th mat-header-cell *matHeaderCellDef class="text-center bg-gray-50 whitespace-nowrap text-xs"
                  [class.border-l-2]="isCategoryStart(perm)">
                  <span class="block text-[10px] text-gray-400 font-normal">{{ perm.categoryLabel() }}</span>
                  {{ perm.label }}
                </th>
                <td mat-cell *matCellDef="let rp" class="text-center"
                  [class.border-l-2]="isCategoryStart(perm)">
                  @if (rp.permissions[perm.key]) {
                    <mat-icon class="text-green-600">check_circle</mat-icon>
                  } @else {
                    <mat-icon class="text-gray-300">cancel</mat-icon>
                  }
                </td>
              </ng-container>
            }

            <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </mat-card>

      <mat-card class="p-4">
        <div class="flex items-center gap-6 text-sm text-gray-500">
          <div class="flex items-center gap-1.5">
            <mat-icon class="text-green-600 text-base">check_circle</mat-icon>
            <span>İzin Var</span>
          </div>
          <div class="flex items-center gap-1.5">
            <mat-icon class="text-gray-300 text-base">cancel</mat-icon>
            <span>İzin Yok</span>
          </div>
        </div>
      </mat-card>
    </div>
  `
})
export class RolePermissionListComponent {
  rolePermissions = ROLE_PERMISSIONS;
  flatPermissions = FLAT_PERMISSIONS;
  displayedColumns = DISPLAYED_COLUMNS;

  lastCategoryKeys = new Set<string>();

  constructor() {
    const cats = PERMISSION_CATEGORIES;
    this.lastCategoryKeys = new Set(
      cats.map(c => c.permissions[c.permissions.length - 1].key)
    );
  }

  isCategoryStart(perm: { key: string; categoryKey: string }): boolean {
    const cat = PERMISSION_CATEGORIES.find(c => c.key === perm.categoryKey);
    return cat ? cat.permissions[0].key === perm.key : false;
  }
}
