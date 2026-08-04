import { MasteryScore } from '@core/models/mastery-score.model';
import { LearningOutcome } from '@core/models/learning-outcome.model';
import { Attempt } from '@core/models/attempt.model';
import { Recommendation } from '@core/models/recommendation.model';
import { Participant } from '@core/models/participant.model';
import { ExamSession } from '@core/models/exam-session.model';
import { ExamAvailability } from '../exams/data-access/exams.facade';

export interface CourseProgress {
  courseId: number;
  courseTitle: string;
  instructorName: string;
  totalContents: number;
  completedContents: number;
  progressPercent: number;
  status: string;
}

export interface CourseMasterySummary {
  courseId: number;
  courseTitle: string;
  totalOutcomes: number;
  masteredOutcomes: number;
  avgMastery: number;
  weakOutcomeCount: number;
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

export interface StudentDashboardData {
  student: Participant | undefined;
  overallMastery: number;
  completedContents: number;
  totalContents: number;
  courseProgress: CourseProgress[];
  courseMastery: CourseMasterySummary[];
  masteryScores: MasteryScore[];
  outcomes: LearningOutcome[];
  examAttempts: Attempt[];
  upcomingExams: UpcomingExam[];
  scheduledTasks: ScheduledTask[];
  recommendations: Recommendation[];
  weakOutcomes: LearningOutcome[];
  strongOutcomes: LearningOutcome[];
  totalAttempts: number;
  avgExamScore: number;
  weeklyProgress: number;
  studyHours: number;
}

export interface ActiveSessionInfo {
  token: string;
  examId: number;
  examTitle: string;
  studentName: string;
  timeRemainingSeconds: number;
  serverTimeReference: string;
  durationMinutes: number;
}
