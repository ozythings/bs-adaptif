import { Routes } from '@angular/router';
import { roleGuard } from '@core/guards/role.guard';
import { studentRedirectGuard } from '@core/guards/role.guard';
import { UserRole } from '@core/models/enums';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'learning/dashboard',
    pathMatch: 'full'
  },
  {
    path: '403',
    loadComponent: () => import('./features/access-denied').then(m => m.AccessDeniedPage)
  },
  {
    path: 'learning/dashboard',
    loadChildren: () => import('./features/learning/dashboard.routes').then(m => m.LEARNING_ROUTES),
    canActivate: [roleGuard],
    data: { permissions: ['course_read'] }
  },
  {
    path: 'courses',
    loadChildren: () => import('./features/courses/courses.routes').then(m => m.COURSES_ROUTES),
    canActivate: [roleGuard],
    data: { permissions: ['course_read'] }
  },
  {
    path: 'outcomes',
    loadChildren: () => import('./features/outcomes/outcomes.routes').then(m => m.OUTCOMES_ROUTES),
    canActivate: [roleGuard],
    data: { roles: [UserRole.PLATFORM_ADMIN, UserRole.PROGRAM_MANAGER, UserRole.INSTRUCTOR] }
  },
  {
    path: 'question-bank',
    loadChildren: () => import('./features/questions/questions.routes').then(m => m.QUESTIONS_ROUTES),
    canActivate: [roleGuard],
    data: { permissions: ['question_create', 'question_read'] }
  },
  {
    path: 'questions/:id',
    loadComponent: () => import('./features/questions/question-detail.page').then(m => m.QuestionDetailPage),
    canActivate: [roleGuard],
    data: { roles: [UserRole.INSTRUCTOR, UserRole.ASSESSMENT_SPECIALIST] }
  },
  {
    path: 'exam-builder',
    loadChildren: () => import('./features/exam-builder/exam-builder.routes').then(m => m.EXAM_BUILDER_ROUTES),
    canActivate: [roleGuard],
    data: { permissions: ['exam_create', 'exam_update'] }
  },
  {
    path: 'exams',
    loadChildren: () => import('./features/exams/exams.routes').then(m => m.EXAMS_ROUTES),
    canActivate: [roleGuard],
    data: { roles: [UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR, UserRole.STUDENT, UserRole.ASSESSMENT_SPECIALIST, UserRole.PROGRAM_MANAGER] }
  },
  {
    path: 'exam-session/:token',
    loadChildren: () => import('./features/exam-session/exam-session.routes').then(m => m.EXAM_SESSION_ROUTES),
    canActivate: [roleGuard],
    data: { permissions: ['student_plan'] }
  },
  {
    path: 'grading',
    loadChildren: () => import('./features/grading/grading.routes').then(m => m.GRADING_ROUTES),
    canActivate: [roleGuard],
    data: { roles: [UserRole.INSTRUCTOR] }
  },
  {
    path: 'student/:id/analytics',
    loadChildren: () => import('./features/student-analytics/student-analytics.routes').then(m => m.STUDENT_ANALYTICS_ROUTES),
    canActivate: [roleGuard],
    data: { roles: [UserRole.INSTRUCTOR, UserRole.STUDENT, UserRole.PROGRAM_MANAGER, UserRole.OBSERVER] }
  },
  {
    path: 'participant/:id/edit',
    loadChildren: () => import('./features/participant-edit/participant-edit.routes').then(m => m.PARTICIPANT_EDIT_ROUTES),
    canActivate: [roleGuard],
    data: { roles: [UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR, UserRole.STUDENT, UserRole.PROGRAM_MANAGER] }
  },
  {
    path: 'item-analysis',
    loadChildren: () => import('./features/item-analysis/item-analysis.routes').then(m => m.ITEM_ANALYSIS_ROUTES),
    canActivate: [roleGuard],
    data: { permissions: ['grading_override'] }
  },
  {
    path: 'audit-log',
    loadChildren: () => import('./features/audit-log/audit-log.routes').then(m => m.AUDIT_LOG_ROUTES),
    canActivate: [roleGuard],
    data: { permissions: ['audit_read'] }
  },
  {
    path: 'my-plan',
    loadComponent: () => import('./features/adaptive-plan/adaptive-plan.component').then(m => m.AdaptivePlanPage),
    canActivate: [roleGuard],
    data: { permissions: ['student_plan'] }
  },
  {
    path: 'cohorts',
    loadChildren: () => import('./features/cohort-management/cohorts.routes').then(m => m.COHORT_ROUTES),
    canActivate: [roleGuard],
    data: { roles: [UserRole.PLATFORM_ADMIN, UserRole.PROGRAM_MANAGER, UserRole.OBSERVER] }
  },
  {
    path: 'admin/roles',
    loadComponent: () => import('./features/admin/role-permission/role-permission-list.component').then(m => m.RolePermissionListComponent),
    canActivate: [roleGuard],
    data: { permissions: ['system_manage_roles'] }
  },
  {
    path: 'admin/terms',
    loadChildren: () => import('./features/admin/term-management/terms.routes').then(m => m.TERMS_ROUTES),
    canActivate: [roleGuard],
    data: { permissions: ['system_manage_terms'] }
  },
  {
    path: 'admin/students',
    loadComponent: () => import('./features/admin/student-management/student-list.component').then(m => m.StudentListComponent),
    canActivate: [studentRedirectGuard, roleGuard],
    data: { permissions: ['system_manage_students'] }
  },
  {
    path: 'switch-role',
    loadComponent: () => import('./features/role-switch/role-switch.component').then(m => m.RoleSwitchComponent)
  },
  {
    path: '**',
    redirectTo: 'learning/dashboard'
  }
];
