import { inject,  signal } from '@angular/core';
import { Observable } from 'rxjs';
import { MockApiService } from '@core/api/mock-api.service';
import { CurrentUserService } from '@core/auth/current-user.service';
import { DataScopeService } from '@core/auth/data-scope.service';
import { NotificationService } from '@core/observability/notification.service';
import { AuditService } from '@core/observability/audit.service';
import { calculateMastery, generateRecommendations, generateStudySequence } from '@core/engine';
import { COURSES_SEED, INSTRUCTORS_SEED, ENROLLMENTS_SEED, PARTICIPANTS_SEED, CONTENTS_SEED, OUTCOMES_SEED, MASTERY_SEED, CONTENT_COMPLETIONS_SEED } from '@core/data';
import { Course } from '@core/models/course.model';
import { Enrollment } from '@core/models/enrollment.model';
import { ContentCompletion } from '@core/models/content-completion.model';
import { ContentItem } from '@core/models/content-item.model';
import { LearningOutcome } from '@core/models/learning-outcome.model';
import { MasteryScore } from '@core/models/mastery-score.model';
import { Recommendation } from '@core/models/recommendation.model';
import { CourseStatus, ContentStatus, ContentFormat, EnrollmentStatus, RecommendationStatus, UserRole, MasteryLevel, AuditAction } from '@core/models/enums';

export interface CourseListItem {
  course: Course;
  instructorName: string;
  enrollmentCount: number;
  pendingCount?: number;
  enrollmentStatus?: EnrollmentStatus;
}

export interface LearningPathData {
  course: Course;
  contents: ContentItem[];
  masteryScores: MasteryScore[];
  completedContentIds: Set<number>;
  studyCounts: Map<number, number>;
  recommendations: Map<number, Recommendation>;
  courseMasteryScores: MasteryScore[];
  isEnrolled: boolean;
  enrollmentStatus?: EnrollmentStatus;
}
export class CoursesFacade {
  private mockApi = inject(MockApiService);
  private currentUser = inject(CurrentUserService);
  private notification = inject(NotificationService);
  private dataScope = inject(DataScopeService);
  private audit = inject(AuditService);

  private courses = signal<Course[]>(COURSES_SEED.filter(c => !c.deletedAt));

  getCourses(): Observable<CourseListItem[]> {
    const user = this.currentUser.user();
    const scope = this.dataScope.getScope();
    let available = this.courses();
    if (user.role === UserRole.INSTRUCTOR && scope.allowedCourseIds) {
      available = available.filter(c => scope.allowedCourseIds!.includes(c.id));
    }
    const items = available.map(course => {
      const enrollment = ENROLLMENTS_SEED.find(
        e => e.courseId === course.id && e.participantId === (user.studentId ?? user.id) && !e.deletedAt
      );
      return {
        course,
        instructorName: this.getInstructorName(course.instructorId),
        enrollmentCount: ENROLLMENTS_SEED.filter(e => e.courseId === course.id && e.status === EnrollmentStatus.APPROVED && !e.deletedAt).length,
        pendingCount: ENROLLMENTS_SEED.filter(e => e.courseId === course.id && e.status === EnrollmentStatus.PENDING && !e.deletedAt).length,
        enrollmentStatus: enrollment?.status,
      };
    });
    return this.mockApi.get(items);
  }

  enroll(courseId: number): Observable<Enrollment> {
    const user = this.currentUser.user();
    const participantId = user.studentId ?? user.id;
    const existing = ENROLLMENTS_SEED.find(
      e => e.courseId === courseId && e.participantId === participantId && !e.deletedAt
    );
    if (existing) {
      existing.status = EnrollmentStatus.PENDING;
      existing.enrollmentDate = new Date().toISOString();
      existing.updatedAt = new Date().toISOString();
      this.audit.log({ action: AuditAction.CREATE, entity: 'Enrollment', entityId: existing.id, description: `Kayıt talebi gönderildi (kurs ${courseId})` });
      this.notification.show('Kayıt talebi gönderildi. Yönetici onayı bekleniyor.', 'info');
      return this.mockApi.get(existing);
    }
    const newEnrollment: Enrollment = {
      id: Math.max(0, ...ENROLLMENTS_SEED.map(e => e.id)) + 1,
      courseId,
      participantId,
      enrollmentDate: new Date().toISOString(),
      status: EnrollmentStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    ENROLLMENTS_SEED.push(newEnrollment);
    this.audit.log({ action: AuditAction.CREATE, entity: 'Enrollment', entityId: newEnrollment.id, description: `Kayıt talebi gönderildi (kurs ${courseId})` });
    this.notification.show('Kayıt talebi gönderildi. Yönetici onayı bekleniyor.', 'info');
    return this.mockApi.get(newEnrollment);
  }

  getPendingEnrollments(): Observable<{ id: number; courseId: number; courseName: string; participantId: number; participantName: string }[]> {
    const items = ENROLLMENTS_SEED
      .filter(e => e.status === EnrollmentStatus.PENDING && !e.deletedAt)
      .map(e => ({
        id: e.id,
        courseId: e.courseId,
        courseName: this.courses().find(c => c.id === e.courseId)?.title ?? `Kurs #${e.courseId}`,
        participantId: e.participantId,
        participantName: this.getParticipantName(e.participantId),
      }));
    return this.mockApi.get(items);
  }

  approveEnrollment(enrollmentId: number): Observable<Enrollment | undefined> {
    const enrollment = ENROLLMENTS_SEED.find(e => e.id === enrollmentId && !e.deletedAt);
    if (!enrollment) {
      this.notification.show('Kayıt bulunamadı', 'error');
      return this.mockApi.get(undefined);
    }
    enrollment.status = EnrollmentStatus.APPROVED;
    enrollment.updatedAt = new Date().toISOString();
    this.audit.log({
      action: AuditAction.APPROVE, entity: 'Enrollment', entityId: enrollmentId,
      description: `Kayıt onaylandı: ${this.getParticipantName(enrollment.participantId)} -> ${this.courses().find(c => c.id === enrollment.courseId)?.title ?? enrollment.courseId}`,
    });
    this.notification.show('Kayıt onaylandı', 'success');
    return this.mockApi.get(enrollment);
  }

  rejectEnrollment(enrollmentId: number): Observable<Enrollment | undefined> {
    const enrollment = ENROLLMENTS_SEED.find(e => e.id === enrollmentId && !e.deletedAt);
    if (!enrollment) {
      this.notification.show('Kayıt bulunamadı', 'error');
      return this.mockApi.get(undefined);
    }
    enrollment.status = EnrollmentStatus.REJECTED;
    enrollment.updatedAt = new Date().toISOString();
    this.audit.log({
      action: AuditAction.REJECT, entity: 'Enrollment', entityId: enrollmentId,
      description: `Kayıt reddedildi: ${this.getParticipantName(enrollment.participantId)} -> ${this.courses().find(c => c.id === enrollment.courseId)?.title ?? enrollment.courseId}`,
    });
    this.notification.show('Kayıt reddedildi', 'error');
    return this.mockApi.get(enrollment);
  }

  getParticipantName(participantId: number): string {
    const p = PARTICIPANTS_SEED.find(x => x.id === participantId);
    return p ? `${p.firstName} ${p.lastName}` : `Öğrenci #${participantId}`;
  }

  createCourse(data: { title: string; description: string; instructorId: number; maxParticipants: number }): Observable<Course> {
    if (!this.canManage()) {
      this.notification.show('Bu işlem için yetkiniz bulunmamaktadır', 'error');
      return this.mockApi.simulateError();
    }
    const now = new Date().toISOString();
    const newCourse: Course = {
      id: Math.max(0, ...COURSES_SEED.map(c => c.id)) + 1,
      title: data.title,
      description: data.description,
      instructorId: data.instructorId,
      startDate: now,
      endDate: now,
      maxParticipants: data.maxParticipants,
      status: CourseStatus.ACTIVE,
      passingScore: 70,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    COURSES_SEED.push(newCourse);
    this.courses.update(list => [...list, newCourse]);
    return this.mockApi.get(newCourse);
  }

  unenroll(courseId: number): Observable<void> {
    const user = this.currentUser.user();
    const participantId = user.studentId ?? user.id;
    const enrollment = ENROLLMENTS_SEED.find(
      e => e.courseId === courseId && e.participantId === participantId && !e.deletedAt
    );
    if (enrollment) {
      enrollment.deletedAt = new Date().toISOString();
      enrollment.updatedAt = new Date().toISOString();
    }
    return this.mockApi.get(undefined);
  }

  toggleCourseStatus(courseId: number): Observable<Course | undefined> {
    if (!this.canManage()) {
      this.notification.show('Bu işlem için yetkiniz bulunmamaktadır', 'error');
      return this.mockApi.simulateError();
    }
    const course = this.courses().find(c => c.id === courseId);
    if (course) {
      course.status = course.status === CourseStatus.ACTIVE
        ? CourseStatus.INACTIVE
        : CourseStatus.ACTIVE;
      course.updatedAt = new Date().toISOString();
    }
    return this.mockApi.get(course);
  }

  getCourse(id: number): Observable<Course | undefined> {
    return this.mockApi.get(this.courses().find(c => c.id === id));
  }

  getInstructorName(instructorId: number): string {
    const instructor = INSTRUCTORS_SEED.find(i => i.id === instructorId);
    return instructor ? `${instructor.firstName} ${instructor.lastName}` : `Eğitmen #${instructorId}`;
  }

  getInstructors(): { id: number; firstName: string; lastName: string }[] {
    const ids = new Set(this.courses().map(c => c.instructorId));
    return INSTRUCTORS_SEED.filter(i => ids.has(i.id)).map(i => ({
      id: i.id, firstName: i.firstName, lastName: i.lastName
    }));
  }

  getOutcomeName(outcomeId: number): string {
    return OUTCOMES_SEED.find(o => o.id === outcomeId)?.name || `Kazanım #${outcomeId}`;
  }

  getLearningPath(courseId: number): Observable<LearningPathData | null> {
    const course = this.courses().find(c => c.id === courseId);
    if (!course) {
      return this.mockApi.get(null);
    }

    const user = this.currentUser.user();
    const courseContents = CONTENTS_SEED
      .filter(c => c.courseId === courseId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (user.role !== UserRole.STUDENT) {
      return this.mockApi.get({
        course,
        contents: courseContents,
        masteryScores: [],
        completedContentIds: new Set<number>(),
        studyCounts: new Map<number, number>(),
        recommendations: new Map<number, Recommendation>(),
        courseMasteryScores: [],
        isEnrolled: false,
        enrollmentStatus: undefined,
      });
    }

    const studentId = user.studentId ?? user.id;
    const masteryScores = MASTERY_SEED.filter(m => m.studentId === studentId);

    const masteryCompleted = new Set<number>();
    for (const content of courseContents) {
      const scores = content.outcomeIds
        .map(oid => masteryScores.find(m => m.outcomeId === oid))
        .filter((s): s is MasteryScore => !!s);
      if (scores.length > 0 && scores.every(s => s.score >= 60)) {
        masteryCompleted.add(content.id);
      }
    }

    const manualCompletions = CONTENT_COMPLETIONS_SEED.filter(
      c => c.studentId === studentId && c.courseId === courseId && c.completedAt
    );
    const manualCompletedIds = new Set(manualCompletions.map(c => c.contentId));
    const studyCounts = new Map<number, number>();
    for (const c of manualCompletions) {
      studyCounts.set(c.contentId, c.studyCount);
    }

    const completedContentIds = new Set<number>([...masteryCompleted, ...manualCompletedIds]);

    const enrollment = ENROLLMENTS_SEED.find(
      e => e.courseId === courseId && e.participantId === studentId && !e.deletedAt
    );

    const lockedContentIds = courseContents
      .filter(c => c.isLocked || c.status !== ContentStatus.ACTIVE)
      .map(c => c.id);

    const sequence = generateStudySequence({
      masteryScores,
      contents: courseContents,
      completedContentIds: [...completedContentIds],
      lockedContentIds,
    });

    const sequenceOrder = new Map<number, number>();
    const masteredIds = new Set<number>();
    sequence.forEach((s, i) => {
      sequenceOrder.set(s.content.id, i);
      if (s.isMastered) masteredIds.add(s.content.id);
    });

    const contents = [...courseContents].sort((a, b) => {
      const aMastered = masteredIds.has(a.id);
      const bMastered = masteredIds.has(b.id);
      if (aMastered && !bMastered) return 1;
      if (!aMastered && bMastered) return -1;
      const aOrder = sequenceOrder.get(a.id);
      const bOrder = sequenceOrder.get(b.id);
      if (aOrder != null && bOrder != null) return aOrder - bOrder;
      if (aOrder != null) return -1;
      if (bOrder != null) return 1;
      return a.sortOrder - b.sortOrder;
    });

    const engineRecs = generateRecommendations({
      masteryScores,
      contents: courseContents,
      completedContentIds: [...completedContentIds],
      lockedContentIds,
    }, studentId);

    const courseMasteryScores = this.getCourseMasteryScores(courseId, studentId);

    const recommendations = new Map<number, Recommendation>();
    const now = new Date().toISOString();
    let recId = Math.max(0, ...engineRecs.map((_, i) => i)) + 1;
    for (const rec of engineRecs) {
      recommendations.set(rec.contentId, {
        ...rec,
        id: recId++,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    return this.mockApi.get({
      course,
      contents,
      masteryScores,
      completedContentIds,
      studyCounts,
      recommendations,
      courseMasteryScores,
      isEnrolled: !!enrollment,
      enrollmentStatus: enrollment?.status,
    });
  }

  getCourseMasteryScores(courseId: number, studentId?: number): MasteryScore[] {
    const user = this.currentUser.user();
    const sid = studentId ?? user.studentId ?? user.id;
    const masteryScores = MASTERY_SEED.filter(m => m.studentId === sid);
    const courseOutcomeIds = new Set(OUTCOMES_SEED.filter(o => o.courseId === courseId).map(o => o.id));
    return [...courseOutcomeIds].map(outcomeId => {
      const existing = masteryScores.find(m => m.outcomeId === outcomeId);
      return existing ?? {
        id: 0, studentId: sid, outcomeId,
        masteryLevel: MasteryLevel.NOSTUDYYET, score: 0,
        recentAnswers: [], difficultyWeightedAverage: 0, repeatCount: 0,
        history: [], lastAssessedAt: '', calculatedAt: '', version: 0,
        createdAt: '', updatedAt: '',
      };
    });
  }

  markContentStudied(courseId: number, contentId: number): Observable<ContentCompletion> {
    const user = this.currentUser.user();
    if (user.role !== UserRole.STUDENT) {
      return this.mockApi.simulateError();
    }
    const studentId = user.studentId ?? user.id;
    const now = new Date().toISOString();
    const existing = CONTENT_COMPLETIONS_SEED.find(
      c => c.studentId === studentId && c.contentId === contentId && c.courseId === courseId
    );
    if (existing) {
      existing.studyCount += 1;
      existing.completedAt = now;
      existing.updatedAt = now;
      this.applyOutcomeMastery(studentId, contentId);
      return this.mockApi.get(existing);
    }
    const newCompletion: ContentCompletion = {
      id: Math.max(0, ...CONTENT_COMPLETIONS_SEED.map(c => c.id)) + 1,
      studentId,
      contentId,
      courseId,
      studyCount: 1,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    CONTENT_COMPLETIONS_SEED.push(newCompletion);

    this.applyOutcomeMastery(studentId, contentId);

    return this.mockApi.get(newCompletion);
  }

  private applyOutcomeMastery(studentId: number, contentId: number): void {
    const content = CONTENTS_SEED.find(c => c.id === contentId);
    if (content) {
      for (const outcomeId of content.outcomeIds) {
        this.updateMasteryScore(studentId, outcomeId);
      }
    }
  }

  private updateMasteryScore(studentId: number, outcomeId: number, questionDifficulty?: number): void {
    const now = new Date().toISOString();
    const existing = MASTERY_SEED.find(m => m.studentId === studentId && m.outcomeId === outcomeId);

    const recentAnswers = existing ? [...existing.recentAnswers, 1] : [1];
    const avgDifficulty = existing?.difficultyWeightedAverage ?? 0.5;
    const repeatCount = existing ? existing.repeatCount + 1 : 1;

    const result = calculateMastery({ recentAnswers, avgDifficulty, repeatCount, questionDifficulty });

    if (existing) {
      existing.score = result.score;
      existing.masteryLevel = result.level;
      existing.recentAnswers = recentAnswers;
      existing.difficultyWeightedAverage = result.difficultyWeightedAverage;
      const hasBreakdown = result.difficultyBreakdown.easy.total + result.difficultyBreakdown.medium.total + result.difficultyBreakdown.hard.total > 0;
      if (hasBreakdown) {
        existing.difficultyBreakdown = result.difficultyBreakdown;
      }
      existing.repeatCount = repeatCount;
      existing.lastAssessedAt = now;
      existing.calculatedAt = now;
      existing.history = [...(existing.history ?? []), { score: result.score, date: now }];
      existing.updatedAt = now;
    } else {
      const newMastery: MasteryScore = {
        id: Math.max(0, ...MASTERY_SEED.map(m => m.id)) + 1,
        studentId,
        outcomeId,
        masteryLevel: result.level,
        score: result.score,
        recentAnswers,
        difficultyWeightedAverage: result.difficultyWeightedAverage,
        repeatCount,
        lastAssessedAt: now,
        calculatedAt: now,
        history: [{ score: result.score, date: now }],
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      MASTERY_SEED.push(newMastery);
    }
  }

  finishCourse(courseId: number): Observable<Course> {
    const user = this.currentUser.user();
    if (user.role !== UserRole.STUDENT) {
      return this.mockApi.simulateError();
    }
    const studentId = user.studentId ?? user.id;
    const course = this.courses().find(c => c.id === courseId);
    const enrollment = ENROLLMENTS_SEED.find(
      e => e.courseId === courseId && e.participantId === studentId && !e.deletedAt
    );
    if (enrollment) {
      enrollment.status = EnrollmentStatus.COMPLETED;
      enrollment.updatedAt = new Date().toISOString();
    }
    if (course) {
      course.updatedAt = new Date().toISOString();
    }
    return this.mockApi.get(course!);
  }

  getOutcomesByCourse(courseId: number): LearningOutcome[] {
    return OUTCOMES_SEED.filter(o => o.courseId === courseId);
  }

  getContentsByCourse(courseId: number): ContentItem[] {
    return CONTENTS_SEED.filter(c => c.courseId === courseId && !c.deletedAt);
  }

  getEnrollmentsByCourse(courseId: number): Observable<{ participant: { id: number; firstName: string; lastName: string; schoolNumber: string; email: string }; enrollment: Enrollment }[]> {
    const items = ENROLLMENTS_SEED
      .filter(e => e.courseId === courseId && !e.deletedAt)
      .map(e => {
        const p = PARTICIPANTS_SEED.find(x => x.id === e.participantId);
        return p ? { participant: { id: p.id, firstName: p.firstName, lastName: p.lastName, schoolNumber: p.schoolNumber, email: p.email }, enrollment: e } : null;
      })
      .filter((e): e is { participant: { id: number; firstName: string; lastName: string; schoolNumber: string; email: string }; enrollment: Enrollment } => !!e);
    return this.mockApi.get(items);
  }

  addContent(courseId: number, data: Partial<ContentItem>): Observable<ContentItem> {
    if (!this.canManage()) {
      this.notification.show('Bu işlem için yetkiniz bulunmamaktadır', 'error');
      return this.mockApi.simulateError();
    }
    const newContent: ContentItem = {
      id: Math.max(0, ...CONTENTS_SEED.map(c => c.id)) + 1,
      title: data.title || '',
      description: data.description || '',
      format: data.format || ContentFormat.TEXT,
      difficulty: data.difficulty,
      durationMinutes: data.durationMinutes || 10,
      outcomeIds: data.outcomeIds || [],
      courseId,
      prerequisiteContentIds: data.prerequisiteContentIds || [],
      status: data.status || ContentStatus.ACTIVE,
      isLocked: data.isLocked ?? false,
      isRequired: data.isRequired ?? false,
      sortOrder: data.sortOrder || 1,
      url: data.url,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    CONTENTS_SEED.push(newContent);
    return this.mockApi.get(newContent);
  }

  deleteContent(courseId: number, contentId: number): Observable<void> {
    if (!this.canManage()) {
      this.notification.show('Bu işlem için yetkiniz bulunmamaktadır', 'error');
      return this.mockApi.simulateError();
    }
    const content = CONTENTS_SEED.find(c => c.id === contentId && c.courseId === courseId);
    if (content) {
      content.deletedAt = new Date().toISOString();
      content.updatedAt = new Date().toISOString();
    }
    return this.mockApi.get(undefined);
  }

  private canManage(): boolean {
    return this.currentUser.hasAnyRole([UserRole.INSTRUCTOR, UserRole.PROGRAM_MANAGER, UserRole.PLATFORM_ADMIN]);
  }
}
