import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { MockApiService } from '@core/api/mock-api.service';
import { NotificationService } from '@core/observability/notification.service';
import { AuditService } from '@core/observability/audit.service';
import { CurrentUserService } from '@core/auth/current-user.service';
import { PermissionService } from '@core/auth/permission.service';
import { DataScopeService } from '@core/auth/data-scope.service';
import { EntityStore } from '@core/state/entity.store';
import { SessionFacade } from '../../exam-session/data-access/session.facade';
import { COURSES_SEED, ATTEMPTS_SEED, ENROLLMENTS_SEED } from '@core/data';
import { Exam } from '@core/models/exam.model';
import { ExamBlueprint } from '@core/models/exam-blueprint.model';
import { AuditAction, ExamStatus, ResultStatus, UserRole, EnrollmentStatus, BlueprintStatus } from '@core/models/enums';

export type ExamAvailability = 'upcoming' | 'active' | 'expired';

export function isExamAvailable(exam: Exam, now = new Date()): ExamAvailability {
  const nowMs = now.getTime();
  if (exam.startDate && nowMs < Date.parse(exam.startDate)) return 'upcoming';
  if (exam.endDate && nowMs > Date.parse(exam.endDate)) return 'expired';
  return 'active';
}

export interface ExamListItem {
  exam: Exam;
  courseName: string;
  hasActiveSession: boolean;
  activeSessionToken: string | null;
  completedAttempt: { scorePercentage: number; totalScore: number; maxScore: number } | null;
}

export interface ExamFilter {
  search?: string;
  status?: ExamStatus;
  courseId?: number;
  page: number;
  pageSize: number;
}
export class ExamsFacade {
  private mockApi = inject(MockApiService);
  private notification = inject(NotificationService);
  private audit = inject(AuditService);
  private currentUser = inject(CurrentUserService);
  private permission = inject(PermissionService);
  private dataScope = inject(DataScopeService);
  private store = inject(EntityStore);
  private sessionFacade = inject(SessionFacade);
  private router = inject(Router);

  getExams(filter: ExamFilter): Observable<{ items: ExamListItem[]; total: number }> {
    const userId = this.currentUser.getUser().id;
    const studentId = this.currentUser.getUser().studentId ?? userId;
    const scope = this.dataScope.getScope();
    const isInstructor = this.currentUser.getUser().role === UserRole.INSTRUCTOR;

    let exams = this.store.exams().filter(e => !e.deletedAt);
    if (isInstructor && scope.allowedCourseIds) {
      exams = exams.filter(e => scope.allowedCourseIds!.includes(e.courseId));
    }
    const isStudent = this.currentUser.getUser().role === UserRole.STUDENT;
    if (isStudent) {
      const enrolledIds = ENROLLMENTS_SEED
        .filter(e => e.participantId === studentId && !e.deletedAt)
        .map(e => e.courseId);
      exams = exams.filter(e => enrolledIds.includes(e.courseId));
    }

    let items = exams.map(exam => {
        const completedAttempt = ATTEMPTS_SEED.find(
          a => a.examId === exam.id && a.studentId === studentId && a.status === ResultStatus.FINALIZED
        );
        return {
          exam,
          courseName: this.getCourseName(exam.courseId),
          hasActiveSession: !!this.sessionFacade.getActiveSessionForExam(exam.id, userId),
          activeSessionToken: this.sessionFacade.getActiveSessionForExam(exam.id, userId)?.token ?? null,
          completedAttempt: completedAttempt
            ? { scorePercentage: completedAttempt.scorePercentage, totalScore: completedAttempt.totalScore, maxScore: completedAttempt.maxScore }
            : null,
        };
      });

    if (filter.search) {
      const s = filter.search.toLowerCase();
      items = items.filter(i => i.exam.title.toLowerCase().includes(s) || i.courseName.toLowerCase().includes(s));
    }
    if (filter.status) {
      items = items.filter(i => i.exam.status === filter.status);
    }
    if (filter.courseId) {
      items = items.filter(i => i.exam.courseId === filter.courseId);
    }

    const total = items.length;
    const start = filter.page * filter.pageSize;
    const paged = items.slice(start, start + filter.pageSize);

    return this.mockApi.get({ items: paged, total });
  }

  getCourseName(courseId: number): string {
    return COURSES_SEED.find(c => c.id === courseId)?.title ?? `Kurs #${courseId}`;
  }

  getAllCourses(): { id: number; title: string }[] {
    return COURSES_SEED.map(c => ({ id: c.id, title: c.title }));
  }

  getExam(id: number): Exam | undefined {
    return this.store.exams().find(e => e.id === id);
  }

  startExam(examId: number): void {
    const exam = this.store.exams().find(e => e.id === examId);
    if (!exam) {
      this.notification.show('Sınav bulunamadı', 'error');
      return;
    }
    if (exam.status !== ExamStatus.PUBLISHED) {
      this.notification.show('Bu sınav henüz yayınlanmamış', 'error');
      return;
    }

    const availability = isExamAvailable(exam);
    if (availability === 'upcoming') {
      this.notification.show('Bu sınav henüz başlamadı', 'warning');
      return;
    }
    if (availability === 'expired') {
      this.notification.show('Bu sınavın süresi dolmuş', 'error');
      return;
    }

    const userId = this.currentUser.getUser().id;
    const studentId = this.currentUser.getUser().studentId ?? userId;
    const completedAttempt = ATTEMPTS_SEED.find(
      a => a.examId === examId && a.studentId === studentId && a.status === ResultStatus.FINALIZED
    );
    if (completedAttempt) {
      this.notification.show('Bu sınavı zaten tamamladınız. Tekrar giremezsiniz.', 'error');
      return;
    }

    const activeSession = this.sessionFacade.getActiveSessionForExam(examId, userId);
    if (activeSession) {
      this.router.navigate(['/exam-session', activeSession.token]);
      return;
    }

    this.sessionFacade.startExamSession(exam, userId).subscribe(session => {
      this.router.navigate(['/exam-session', session.token]);
    });
  }

  updateExam(id: number, patch: Partial<Exam>): Observable<Exam> {
    if (!this.canManage()) {
      this.notification.show('Bu işlem için yetkiniz bulunmamaktadır', 'error');
      return this.mockApi.put(undefined as any);
    }
    const exam = this.store.exams().find(e => e.id === id);
    if (!exam) {
      this.notification.show('Sınav bulunamadı', 'error');
      return this.mockApi.put(undefined as any);
    }
    if (exam.status === ExamStatus.PUBLISHED && (patch.title || patch.duration || patch.passingScore || patch.courseId)) {
      this.notification.show('Yayınlanmış sınavda tarih dışında alanlar değiştirilemez. Arşivleyip yeni sınav oluşturun.', 'error');
      return this.mockApi.put(undefined as any);
    }
    this.store.updateExam(id, patch);
    this.audit.log({ action: AuditAction.UPDATE, entity: 'Exam', entityId: id, description: `Sınav güncellendi`, oldValue: exam, newValue: { ...exam, ...patch } });
    this.notification.show('Sınav güncellendi', 'success');
    return this.mockApi.put({ ...exam, ...patch });
  }

  createExam(title: string, courseId: number, duration: number, passingScore: number, startDate?: string | null, endDate?: string | null): Observable<Exam> {
    if (!this.canManage()) {
      this.notification.show('Bu işlem için yetkiniz bulunmamaktadır', 'error');
      return this.mockApi.post(undefined as any);
    }
    const maxId = Math.max(...this.store.exams().map(e => e.id), 0);
    const exam: Exam = {
      id: maxId + 1,
      courseId,
      title,
      questionCount: 0,
      passingScore,
      duration,
      wrongAnswerPenalty: 4,
      status: ExamStatus.DRAFT,
      version: 1,
      questionVersionIds: null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.store.addExam(exam);

    const maxBpId = Math.max(...this.store.blueprints().map(b => b.id), 0);
    const blueprint: ExamBlueprint = {
      id: maxBpId + 1,
      name: `${title} Blueprint`,
      examId: exam.id,
      constraints: [],
      status: BlueprintStatus.DRAFT,
      summary: { totalQuestions: 0, totalPoints: 0, coverage: [], violations: [] },
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.store.addBlueprint(blueprint);

    this.audit.log({ action: AuditAction.CREATE, entity: 'Exam', entityId: exam.id, description: `Sınav oluşturuldu: ${title}` });
    this.audit.log({ action: AuditAction.CREATE, entity: 'ExamBlueprint', entityId: blueprint.id, description: `Blueprint oluşturuldu: ${blueprint.name}` });
    this.notification.show('Sınav ve blueprint oluşturuldu', 'success');
    return this.mockApi.post(exam);
  }

  validatePublishPrerequisites(examId: number): { valid: boolean; violations: string[] } {
    const blueprint = this.store.blueprints().find(b => b.examId === examId);
    if (!blueprint) {
      const exam = this.store.exams().find(e => e.id === examId);
      if (exam && (exam.questionCount ?? 0) === 0) {
        return { valid: false, violations: ['Bu sınavda hiç soru bulunmuyor. Önce blueprint oluşturun.'] };
      }
      return { valid: true, violations: [] };
    }
    return {
      valid: blueprint.summary.violations.length === 0,
      violations: blueprint.summary.violations,
    };
  }

  private canManage(): boolean {
    return this.permission.hasAnyPermission(['exam_create', 'exam_update', 'exam_delete']);
  }
}
