import { UserRole } from '@core/models/enums';

export interface PermissionCategory {
  key: string;
  label: string;
  permissions: { key: string; label: string }[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
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
    label: 'Cohort',
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
    ],
  },
  {
    key: 'student',
    label: 'Öğrenci',
    permissions: [
      { key: 'student_plan', label: 'Çalışma Planı' },
      { key: 'student_profile', label: 'Profilim' },
    ],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_CATEGORIES.flatMap(
  cat => cat.permissions.map(p => p.key)
);

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.PLATFORM_ADMIN]: 'Platform Yöneticisi',
  [UserRole.PROGRAM_MANAGER]: 'Program Yöneticisi',
  [UserRole.INSTRUCTOR]: 'Eğitmen',
  [UserRole.ASSESSMENT_SPECIALIST]: 'Ölçme Uzmanı',
  [UserRole.OBSERVER]: 'Gözlemci',
  [UserRole.STUDENT]: 'Öğrenci',
};

export const ROLE_PERMISSIONS: Record<UserRole, Record<string, boolean>> = {
  [UserRole.PLATFORM_ADMIN]: {
    course_create: true, course_read: true, course_update: true, course_delete: true, course_publish: true,
    exam_create: true, exam_read: true, exam_update: true, exam_delete: true, exam_publish: true,
    question_create: true, question_read: true, question_update: true, question_delete: true, question_publish: true,
    grading_read: true, grading_grade: true, grading_override: true,
    analytics_read: true,
    cohort_create: true, cohort_read: true, cohort_update: true, cohort_delete: true,
    outcome_create: true, outcome_read: true, outcome_update: true, outcome_delete: true,
    audit_read: true,
    system_manage_roles: true, system_manage_terms: true,
    student_plan: false, student_profile: false,
  },
  [UserRole.PROGRAM_MANAGER]: {
    course_create: true, course_read: true, course_update: true, course_delete: false, course_publish: true,
    exam_create: true, exam_read: true, exam_update: true, exam_delete: false, exam_publish: true,
    question_create: false, question_read: true, question_update: false, question_delete: false, question_publish: false,
    grading_read: true, grading_grade: false, grading_override: false,
    analytics_read: true,
    cohort_create: true, cohort_read: true, cohort_update: true, cohort_delete: true,
    outcome_create: true, outcome_read: true, outcome_update: true, outcome_delete: true,
    audit_read: false,
    system_manage_roles: false, system_manage_terms: false,
    student_plan: false, student_profile: false,
  },
  [UserRole.INSTRUCTOR]: {
    course_create: false, course_read: true, course_update: true, course_delete: false, course_publish: false,
    exam_create: true, exam_read: true, exam_update: true, exam_delete: false, exam_publish: true,
    question_create: true, question_read: true, question_update: true, question_delete: false, question_publish: true,
    grading_read: true, grading_grade: true, grading_override: false,
    analytics_read: true,
    cohort_create: false, cohort_read: true, cohort_update: false, cohort_delete: false,
    outcome_create: false, outcome_read: true, outcome_update: false, outcome_delete: false,
    audit_read: false,
    system_manage_roles: false, system_manage_terms: false,
    student_plan: false, student_profile: false,
  },
  [UserRole.ASSESSMENT_SPECIALIST]: {
    course_create: false, course_read: true, course_update: false, course_delete: false, course_publish: false,
    exam_create: true, exam_read: true, exam_update: true, exam_delete: false, exam_publish: true,
    question_create: true, question_read: true, question_update: true, question_delete: false, question_publish: true,
    grading_read: true, grading_grade: true, grading_override: true,
    analytics_read: true,
    cohort_create: false, cohort_read: true, cohort_update: false, cohort_delete: false,
    outcome_create: false, outcome_read: true, outcome_update: false, outcome_delete: false,
    audit_read: false,
    system_manage_roles: false, system_manage_terms: false,
    student_plan: false, student_profile: false,
  },
  [UserRole.OBSERVER]: {
    course_create: false, course_read: true, course_update: false, course_delete: false, course_publish: false,
    exam_create: false, exam_read: true, exam_update: false, exam_delete: false, exam_publish: false,
    question_create: false, question_read: true, question_update: false, question_delete: false, question_publish: false,
    grading_read: true, grading_grade: false, grading_override: false,
    analytics_read: true,
    cohort_create: false, cohort_read: true, cohort_update: false, cohort_delete: false,
    outcome_create: false, outcome_read: true, outcome_update: false, outcome_delete: false,
    audit_read: false,
    system_manage_roles: false, system_manage_terms: false,
    student_plan: false, student_profile: false,
  },
  [UserRole.STUDENT]: {
    course_create: false, course_read: true, course_update: false, course_delete: false, course_publish: false,
    exam_create: false, exam_read: true, exam_update: false, exam_delete: false, exam_publish: false,
    question_create: false, question_read: false, question_update: false, question_delete: false, question_publish: false,
    grading_read: false, grading_grade: false, grading_override: false,
    analytics_read: false,
    cohort_create: false, cohort_read: false, cohort_update: false, cohort_delete: false,
    outcome_create: false, outcome_read: false, outcome_update: false, outcome_delete: false,
    audit_read: false,
    system_manage_roles: false, system_manage_terms: false,
    student_plan: true, student_profile: true,
  },
};
