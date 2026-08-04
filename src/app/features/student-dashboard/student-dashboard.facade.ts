import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MockApiService } from '@core/api/mock-api.service';
import { CurrentUserService } from '@core/auth/current-user.service';
import { AuditService } from '@core/observability/audit.service';
import { ExamSession } from '@core/models/exam-session.model';
import { AuditLogEntry } from '@core/models/audit-log-entry.model';
import { SessionFacade } from '../exam-session/data-access/session.facade';
import { ExamStatus, AuditAction } from '@core/models/enums';
import { COURSES_SEED, ENROLLMENTS_SEED, CONTENTS_SEED, OUTCOMES_SEED, MASTERY_SEED, CONTENT_COMPLETIONS_SEED, ATTEMPTS_SEED, EXAMS_SEED, INSTRUCTORS_SEED, PARTICIPANTS_SEED } from '@core/data';
import { generateRecommendations, generateStudySequence } from '@core/engine';
import { isExamAvailable } from '../exams/data-access/exams.facade';
import { isWeak, isStrong, getOverallMastery } from '@shared/utils/mastery-helpers';
import type {
  StudentDashboardData,
  CourseProgress,
  CourseMasterySummary,
  UpcomingExam,
  ScheduledTask,
  ActiveSessionInfo,
} from './student-dashboard.model';

export class StudentDashboardFacade {
  private mockApi = inject(MockApiService);
  private currentUser = inject(CurrentUserService);
  private audit = inject(AuditService);
  private sessionFacade = inject(SessionFacade);

  private getStudentId(): number {
    const user = this.currentUser.getUser();
    return user.studentId ?? user.id;
  }

  getDashboard(studentId?: number): Observable<StudentDashboardData> {
    const resolvedId = studentId ?? this.getStudentId();

    this.audit.log({
      action: AuditAction.VIEW,
      entity: 'StudentDashboard',
      entityId: resolvedId,
      description: 'Öğrenci dashboard verileri görüntülendi',
    });

    const masteryScores = MASTERY_SEED.filter(m => m.studentId === resolvedId);
    const outcomes = [...OUTCOMES_SEED];
    const overallMastery = getOverallMastery(masteryScores);
    const weakOutcomes = outcomes.filter(o => masteryScores.some(m => m.outcomeId === o.id && isWeak(m.score)));
    const strongOutcomes = outcomes.filter(o => masteryScores.some(m => m.outcomeId === o.id && isStrong(m.score)));

    const completedContentIds = new Set(
      CONTENT_COMPLETIONS_SEED.filter(c => c.studentId === resolvedId).map(c => c.contentId)
    );
    const lockedContentIds = CONTENTS_SEED.filter(c => c.isLocked).map(c => c.id);

    const enrolledCourseIds = ENROLLMENTS_SEED
      .filter(e => e.participantId === resolvedId && !e.deletedAt)
      .map(e => e.courseId);

    const enrolledCourses = COURSES_SEED.filter(c => enrolledCourseIds.includes(c.id));

    const courseProgress: CourseProgress[] = enrolledCourseIds.map(courseId => {
      const course = COURSES_SEED.find(c => c.id === courseId);
      const instructor = INSTRUCTORS_SEED.find(i => i.id === course?.instructorId);
      const total = CONTENTS_SEED.filter(c => c.courseId === courseId).length;
      const completed = CONTENT_COMPLETIONS_SEED.filter(
        c => c.studentId === resolvedId && c.courseId === courseId
      ).length;
      const enrollment = ENROLLMENTS_SEED.find(
        e => e.courseId === courseId && e.participantId === resolvedId && !e.deletedAt
      );
      return {
        courseId,
        courseTitle: course?.title ?? `Kurs #${courseId}`,
        instructorName: instructor ? `${instructor.firstName} ${instructor.lastName}` : '',
        totalContents: total,
        completedContents: completed,
        progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
        status: enrollment?.status ?? 'unknown',
      };
    });

    const courseMastery: CourseMasterySummary[] = enrolledCourses.map(course => {
      const courseOutcomes = OUTCOMES_SEED.filter(o => o.courseId === course.id);
      const courseMasteryScores = masteryScores.filter(m =>
        courseOutcomes.some(o => o.id === m.outcomeId)
      );
      const avg = courseMasteryScores.length > 0
        ? Math.round(courseMasteryScores.reduce((s, m) => s + m.score, 0) / courseMasteryScores.length)
        : 0;
      return {
        courseId: course.id,
        courseTitle: course.title,
        totalOutcomes: courseOutcomes.length,
        masteredOutcomes: courseMasteryScores.filter(m => !isWeak(m.score)).length,
        avgMastery: avg,
        weakOutcomeCount: courseMasteryScores.filter(m => isWeak(m.score)).length,
      };
    });

    const userAttempts = ATTEMPTS_SEED.filter(a => a.studentId === resolvedId);
    const totalAttempts = userAttempts.length;
    const avgExamScore = totalAttempts > 0
      ? Math.round(userAttempts.reduce((s, a) => s + a.scorePercentage, 0) / totalAttempts)
      : 0;

    const attemptedExamIds = new Set(userAttempts.map(a => a.examId));
    const upcomingExams: UpcomingExam[] = EXAMS_SEED
      .filter(e =>
        e.status === ExamStatus.PUBLISHED &&
        enrolledCourseIds.includes(e.courseId) &&
        !attemptedExamIds.has(e.id) &&
        isExamAvailable(e) !== 'expired'
      )
      .map(e => {
        const course = COURSES_SEED.find(c => c.id === e.courseId);
        return {
          examId: e.id,
          title: e.title,
          courseTitle: course?.title ?? `Kurs #${e.courseId}`,
          questionCount: e.questionCount,
          duration: e.duration,
          passingScore: e.passingScore,
          startDate: e.startDate ?? null,
          endDate: e.endDate ?? null,
          availability: isExamAvailable(e),
        };
      });

    const contents = CONTENTS_SEED.filter(c => enrolledCourseIds.includes(c.courseId));
    const sequence = generateStudySequence({
      masteryScores,
      contents,
      completedContentIds: [...completedContentIds],
      lockedContentIds,
    });

    const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
    const tasksToSchedule = sequence
      .filter(s => s.isWeak && !s.isMastered)
      .slice(0, 10);

    const scheduledTasks: ScheduledTask[] = tasksToSchedule.map((s, i) => {
      const outcome = OUTCOMES_SEED.find(o => o.id === s.content.outcomeIds[0]);
      const course = COURSES_SEED.find(c => c.id === outcome?.courseId);
      return {
        day: days[i % days.length],
        dayIndex: i % days.length,
        contentId: s.content.id,
        contentTitle: s.content.title,
        courseTitle: course?.title ?? '',
        outcomeName: outcome?.code ?? `Kazanım #${s.content.outcomeIds[0]}`,
        priority: s.priority === 'critical' ? 'critical'
          : s.priority === 'high' ? 'high'
          : s.priority === 'medium' ? 'medium'
          : 'low',
        durationMinutes: s.content.durationMinutes,
        masteryScore: s.masteryScore,
      };
    });

    const now = new Date().toISOString();
    const recommendations = generateRecommendations({
      masteryScores,
      contents,
      completedContentIds: [...completedContentIds],
      lockedContentIds,
    }, resolvedId).map((r, i) => ({
      ...r,
      id: i + 1,
      version: 1,
      isApplied: false,
      isDismissed: false,
      createdAt: now,
      updatedAt: now,
    }));

    const totalContents = contents.length;
    const completedContents = completedContentIds.size;
    const weeklyProgress = totalContents > 0 ? Math.round((completedContents / totalContents) * 100) : 0;
    const studyHours = scheduledTasks.reduce((s, t) => s + t.durationMinutes, 0) / 60;

    const student = PARTICIPANTS_SEED.find(p => p.id === resolvedId);

    return this.mockApi.get<StudentDashboardData>({
      student,
      overallMastery,
      completedContents,
      totalContents,
      courseProgress,
      courseMastery,
      masteryScores,
      outcomes,
      examAttempts: userAttempts,
      upcomingExams,
      scheduledTasks,
      recommendations,
      weakOutcomes,
      strongOutcomes,
      totalAttempts,
      avgExamScore,
      weeklyProgress,
      studyHours,
    });
  }

  getActiveSessions(): ExamSession[] {
    return this.sessionFacade.getActiveSessionsForUser(this.currentUser.getUser().id);
  }

  getAllActiveSessions(): ActiveSessionInfo[] {
    const demoUsers = this.currentUser.getAvailableUsers();
    return this.sessionFacade.getAllActiveSessions().map(s => {
      const exam = EXAMS_SEED.find(e => e.id === s.examId);
      const user = demoUsers.find(u => u.id === s.userId);
      const participantId = user?.studentId ?? s.userId;
      const participant = PARTICIPANTS_SEED.find(p => p.id === participantId);
      return {
        token: s.token,
        examId: s.examId,
        examTitle: exam?.title ?? `Sınav #${s.examId}`,
        studentName: participant ? `${participant.firstName} ${participant.lastName}` : `Öğrenci #${s.userId}`,
        timeRemainingSeconds: s.timeRemainingSeconds,
        serverTimeReference: s.serverTimeReference,
        durationMinutes: s.durationMinutes,
      };
    });
  }

  getRecentAuditLogs(limit = 10): AuditLogEntry[] {
    return this.audit.getLogs().slice(0, limit);
  }

  getOutcomeName(outcomeId: number): string {
    return OUTCOMES_SEED.find(o => o.id === outcomeId)?.name ?? `Kazanım #${outcomeId}`;
  }

  getCourseNameByOutcome(outcomeId: number): string {
    const outcome = OUTCOMES_SEED.find(o => o.id === outcomeId);
    if (!outcome) return 'Bilinmeyen Kurs';
    const course = COURSES_SEED.find(c => c.id === outcome.courseId);
    return course?.title ?? `Kurs #${outcome.courseId}`;
  }
}
