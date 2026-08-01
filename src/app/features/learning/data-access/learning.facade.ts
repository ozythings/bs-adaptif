import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MockApiService } from '@core/api/mock-api.service';
import { CurrentUserService } from '@core/auth/current-user.service';
import { UserRole } from '@core/models/enums';
import { ActivityStreamService, ActivityEvent } from '@core/realtime/activity-stream.service';
import { SessionFacade } from '../../exam-session/data-access/session.facade';
import { COURSES_SEED, ENROLLMENTS_SEED, MASTERY_SEED, CONTENTS_SEED, OUTCOMES_SEED, EXAMS_SEED, ATTEMPTS_SEED, CONTENT_COMPLETIONS_SEED, INSTRUCTORS_SEED, PARTICIPANTS_SEED } from '@core/data';
import { ExamSession } from '@core/models/exam-session.model';
import { Recommendation } from '@core/models/recommendation.model';
import { generateRecommendations } from '@core/engine';
import { SessionStatus, EnrollmentStatus } from '@core/models/enums';

export interface CourseProgress {
  courseId: number;
  courseTitle: string;
  instructorName: string;
  totalContents: number;
  completedContents: number;
  progressPercent: number;
  status: string;
}

export interface ExamAttemptInfo {
  attemptId: number;
  examTitle: string;
  courseName: string;
  scorePercentage: number;
  totalScore: number;
  maxScore: number;
  status: string;
  date: string;
}

export interface DashboardData {
  totalCourses: number;
  activeEnrollments: number;
  pendingExams: number;
  avgMastery: number;
  weakOutcomes: number;
  completedContents: number;
  totalAttempts: number;
  avgExamScore: number;
  courseProgress: CourseProgress[];
  examAttempts: ExamAttemptInfo[];
  masteryByOutcome: { label: string; value: number }[];
}
export class LearningFacade {
  private mockApi = inject(MockApiService);
  private currentUser = inject(CurrentUserService);
  private activityStream = inject(ActivityStreamService);
  private sessionFacade = inject(SessionFacade);

  getDashboardData(): Observable<DashboardData> {
    const user = this.currentUser.getUser();
    const studentId = user.studentId ?? user.id;
    const isStudent = this.currentUser.getUser().role === UserRole.STUDENT;

    const masteryScores = MASTERY_SEED.filter(m => m.studentId === studentId);
    const avgScore = masteryScores.length > 0
      ? Math.round(masteryScores.reduce((s, m) => s + m.score, 0) / masteryScores.length)
      : 0;

    const completedContents = CONTENT_COMPLETIONS_SEED.filter(c => c.studentId === studentId).length;

    const userAttempts = ATTEMPTS_SEED.filter(a => a.studentId === studentId);
    const avgExamScore = userAttempts.length > 0
      ? Math.round(userAttempts.reduce((s, a) => s + a.scorePercentage, 0) / userAttempts.length)
      : 0;

    const enrolledCourseIds = ENROLLMENTS_SEED
      .filter(e => e.participantId === studentId && !e.deletedAt)
      .map(e => e.courseId);

    const courseProgress: CourseProgress[] = enrolledCourseIds.map(courseId => {
      const course = COURSES_SEED.find(c => c.id === courseId);
      const instructor = INSTRUCTORS_SEED.find(i => i.id === course?.instructorId);
      const total = CONTENTS_SEED.filter(c => c.courseId === courseId).length;
      const completed = CONTENT_COMPLETIONS_SEED.filter(
        c => c.studentId === studentId && c.courseId === courseId
      ).length;
      const enrollment = ENROLLMENTS_SEED.find(
        e => e.courseId === courseId && e.participantId === studentId && !e.deletedAt
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

    const examAttempts: ExamAttemptInfo[] = userAttempts.map(a => {
      const exam = EXAMS_SEED.find(e => e.id === a.examId);
      const course = exam ? COURSES_SEED.find(c => c.id === exam.courseId) : null;
      return {
        attemptId: a.id,
        examTitle: exam?.title ?? `Sınav #${a.examId}`,
        courseName: course?.title ?? '',
        scorePercentage: a.scorePercentage,
        totalScore: a.totalScore,
        maxScore: a.maxScore,
        status: a.status,
        date: a.startedAt,
      };
    });

    const masteryByOutcome = masteryScores.map(ms => {
      const outcome = OUTCOMES_SEED.find(o => o.id === ms.outcomeId);
      return { label: outcome?.code ?? `#${ms.outcomeId}`, value: ms.score };
    });

    return this.mockApi.get({
      totalCourses: COURSES_SEED.filter(c => !c.deletedAt).length,
      activeEnrollments: ENROLLMENTS_SEED.filter(e => e.status === 'approved' && !e.deletedAt && (!isStudent || e.participantId === studentId)).length,
      pendingExams: this.sessionFacade.getActiveSessionsForUser(user.id).length,
      avgMastery: avgScore,
      weakOutcomes: masteryScores.filter(m => m.score < 50).length,
      completedContents,
      totalAttempts: userAttempts.length,
      avgExamScore,
      courseProgress,
      examAttempts,
      masteryByOutcome,
    });
  }

  getActiveSessions(): ExamSession[] {
    return this.sessionFacade.getActiveSessionsForUser(this.currentUser.getUser().id);
  }

  getAllActiveSessions(): { token: string; examId: number; examTitle: string; studentName: string; timeRemainingSeconds: number; serverTimeReference: string; durationMinutes: number }[] {
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

  getRecommendations(): Recommendation[] {
    const user = this.currentUser.getUser();
    const studentId = user.studentId ?? user.id;
    const userMastery = MASTERY_SEED.filter(m => m.studentId === studentId);

    const completedCourseIds = ENROLLMENTS_SEED
      .filter(e => e.participantId === studentId && e.status === EnrollmentStatus.COMPLETED && !e.deletedAt)
      .map(e => e.courseId);
    const completedOutcomeIds = new Set(
      OUTCOMES_SEED.filter(o => completedCourseIds.includes(o.courseId)).map(o => o.id)
    );
    const masteryScores = userMastery
      .filter(m => !completedOutcomeIds.has(m.outcomeId));

    const completedIds = CONTENTS_SEED
      .filter(c => masteryScores.some(m => c.outcomeIds.includes(m.outcomeId) && m.score >= 60))
      .map(c => c.id);
    const lockedIds = CONTENTS_SEED.filter(c => c.isLocked).map(c => c.id);

    const now = new Date().toISOString();
    return generateRecommendations({
      masteryScores,
      contents: CONTENTS_SEED,
      completedContentIds: completedIds,
      lockedContentIds: lockedIds,
    }, studentId).map((r, i) => ({
      ...r,
      id: i + 1,
      version: 1,
      isApplied: false,
      isDismissed: false,
      createdAt: now,
      updatedAt: now,
    }));
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

  getAllOutcomes() {
    return OUTCOMES_SEED;
  }

  getAllMasteryScores() {
    const user = this.currentUser.getUser();
    const studentId = user.studentId ?? user.id;
    return MASTERY_SEED.filter(m => m.studentId === studentId);
  }

  getActivityStream(intervalMs = 5000): Observable<ActivityEvent> {
    return this.activityStream.stream(intervalMs);
  }

  isSessionActive(session: ExamSession): boolean {
    return session.status === SessionStatus.ACTIVE;
  }
}
