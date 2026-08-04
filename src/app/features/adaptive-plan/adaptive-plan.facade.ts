import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MockApiService } from '@core/api/mock-api.service';
import { CurrentUserService } from '@core/auth/current-user.service';
import { ExamStatus } from '@core/models/enums';
import { isExamAvailable, type ExamAvailability } from '../exams/data-access/exams.facade';
import { generateRecommendations, generateStudySequence, difficultyColor } from '@core/engine';
import type { SequencedContent } from '@core/engine';
import { Recommendation } from '@core/models/recommendation.model';
import { COURSES_SEED, ENROLLMENTS_SEED, CONTENTS_SEED, OUTCOMES_SEED, MASTERY_SEED, CONTENT_COMPLETIONS_SEED, ATTEMPTS_SEED, EXAMS_SEED } from '@core/data';

export interface ScheduledTask {
  day: string;
  dayIndex: number;
  contentId: number;
  contentTitle: string;
  courseTitle: string;
  outcomeName: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  durationMinutes: number;
  masteryScore: number;
}

export interface UpcomingExam {
  examId: number;
  title: string;
  courseTitle: string;
  questionCount: number;
  duration: number;
  passingScore: number;
  startDate: string | null;
  endDate: string | null;
  availability: ExamAvailability;
}

export interface CourseMasterySummary {
  courseId: number;
  courseTitle: string;
  totalOutcomes: number;
  masteredOutcomes: number;
  avgMastery: number;
  weakOutcomeCount: number;
}

export interface WeeklyPlanData {
  courses: CourseMasterySummary[];
  recommendations: Recommendation[];
  upcomingExams: UpcomingExam[];
  scheduledTasks: ScheduledTask[];
  totalMastery: number;
  completedContents: number;
  totalContents: number;
  weeklyProgress: number;
  studyHours: number;
}

export class AdaptivePlanFacade {
  private mockApi = inject(MockApiService);
  private currentUser = inject(CurrentUserService);

  private getStudentId(): number {
    const user = this.currentUser.getUser();
    return user.studentId ?? user.id;
  }

  getWeeklyPlan(): Observable<WeeklyPlanData> {
    const studentId = this.getStudentId();
    const enrolledCourseIds = ENROLLMENTS_SEED
      .filter(e => e.participantId === studentId && e.status === 'approved' && !e.deletedAt)
      .map(e => e.courseId);

    const enrolledCourses = COURSES_SEED.filter(c => enrolledCourseIds.includes(c.id));

    const masteryScores = MASTERY_SEED.filter(m => m.studentId === studentId);
    const totalMastery = masteryScores.length > 0
      ? Math.round(masteryScores.reduce((s, m) => s + m.score, 0) / masteryScores.length)
      : 0;

    const completedContentIds = new Set(
      CONTENT_COMPLETIONS_SEED.filter(c => c.studentId === studentId).map(c => c.contentId)
    );
    const lockedContentIds = CONTENTS_SEED.filter(c => c.isLocked).map(c => c.id);

    const contents = CONTENTS_SEED.filter(c => enrolledCourseIds.includes(c.courseId));

    const sequence = generateStudySequence({
      masteryScores,
      contents,
      completedContentIds: [...completedContentIds],
      lockedContentIds,
    });

    const now = new Date().toISOString();
    const recommendations = generateRecommendations({
      masteryScores,
      contents,
      completedContentIds: [...completedContentIds],
      lockedContentIds,
    }, studentId).map((r, i) => ({
      ...r,
      id: i + 1,
      version: 1,
      isApplied: false,
      isDismissed: false,
      createdAt: now,
      updatedAt: now,
    }));

    const courses: CourseMasterySummary[] = enrolledCourses.map(course => {
      const courseOutcomes = OUTCOMES_SEED.filter(o => o.courseId === course.id);
      const courseMastery = masteryScores.filter(m =>
        courseOutcomes.some(o => o.id === m.outcomeId)
      );
      const avg = courseMastery.length > 0
        ? Math.round(courseMastery.reduce((s, m) => s + m.score, 0) / courseMastery.length)
        : 0;
      return {
        courseId: course.id,
        courseTitle: course.title,
        totalOutcomes: courseOutcomes.length,
        masteredOutcomes: courseMastery.filter(m => m.score >= 60).length,
        avgMastery: avg,
        weakOutcomeCount: courseMastery.filter(m => m.score < 60).length,
      };
    });

    const attemptedExamIds = new Set(
      ATTEMPTS_SEED.filter(a => a.studentId === studentId).map(a => a.examId)
    );
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

    const totalContents = contents.length;
    const completedContents = completedContentIds.size;
    const weeklyProgress = totalContents > 0 ? Math.round((completedContents / totalContents) * 100) : 0;
    const studyHours = scheduledTasks.reduce((s, t) => s + t.durationMinutes, 0) / 60;

    return this.mockApi.get<WeeklyPlanData>({
      courses,
      recommendations,
      upcomingExams,
      scheduledTasks,
      totalMastery,
      completedContents,
      totalContents,
      weeklyProgress,
      studyHours,
    });
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

  getMasteryColor(score: number): string {
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-blue-100 text-blue-700';
    if (score >= 40) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  }

  getMasteryLabel(score: number): string {
    if (score >= 80) return 'İleri';
    if (score >= 60) return 'Yeterli';
    if (score >= 40) return 'Gelişmekte';
    return 'Başlangıç';
  }
}
