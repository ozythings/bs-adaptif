import { Routes } from '@angular/router';

export const COURSES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./course-list').then(m => m.CourseListPage)
  },
  {
    path: ':id/path',
    loadComponent: () => import('./learning-path').then(m => m.LearningPathPage)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./course-edit/course-edit.page').then(m => m.CourseEditPage)
  },
  {
    path: ':id/details',
    loadComponent: () => import('./course-detail/course-detail.page').then(m => m.CourseDetailPage)
  }
];
