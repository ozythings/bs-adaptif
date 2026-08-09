import { MockApiService } from './core/api/mock-api.service';
import { CurrentUserService } from './core/auth/current-user.service';
import { DataScopeService } from './core/auth/data-scope.service';
import { PermissionService } from './core/auth/permission.service';
import { SessionService } from './core/auth/session.service';
import { AuditService } from './core/observability/audit.service';
import { NotificationService } from './core/observability/notification.service';
import { OptimisticService } from './core/optimistic/optimistic.service';
import { EntityStore } from './core/state/entity.store';
import { EventBusService } from './core/state/event-bus.service';
import { ConflictResolverService } from './core/storage/conflict-resolver.service';
import { DraftStore } from './core/storage/draft-store.service';
import { OfflineQueueService } from './core/storage/offline-queue.service';
import { StorageService } from './core/storage/storage.service';
import { AuditLogService } from './features/audit-log/data-access/audit-log.facade';
import { CohortAnalyticsFacade } from './features/cohort-analytics/data-access/cohort-analytics.facade';
import { CohortManagementFacade } from './features/cohort-management/cohort-management.facade';
import { CoursesFacade } from './features/courses/data-access/courses.facade';
import { ExamBuilderFacade } from './features/exam-builder/data-access/exam-builder.facade';
import { SessionFacade } from './features/exam-session/data-access/session.facade';
import { ExamsFacade } from './features/exams/data-access/exams.facade';
import { GradingFacade } from './features/grading/data-access/grading.facade';
import { ItemAnalysisFacade } from './features/item-analysis/data-access/item-analysis.facade';
import { OutcomesFacade } from './features/outcomes/data-access/outcomes.facade';
import { ParticipantFacade } from './features/participant-edit/data-access/participant.facade';
import { QuestionBankFacade } from './features/questions/data-access/question-bank.facade';
import { StudentDashboardFacade } from './features/student-dashboard/student-dashboard.facade';

export const APP_SERVICES = [
  MockApiService,
  CurrentUserService,
  DataScopeService,
  PermissionService,
  SessionService,
  AuditService,
  NotificationService,
  OptimisticService,
  EntityStore,
  EventBusService,
  ConflictResolverService,
  DraftStore,
  OfflineQueueService,
  StorageService,
  AuditLogService,
  CohortAnalyticsFacade,
  CohortManagementFacade,
  CoursesFacade,
  ExamBuilderFacade,
  SessionFacade,
  ExamsFacade,
  GradingFacade,
  ItemAnalysisFacade,
  OutcomesFacade,
  ParticipantFacade,
  QuestionBankFacade,
  StudentDashboardFacade,
];
