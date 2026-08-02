import { Course } from '@core/models/course.model';
import { Instructor } from '@core/models/instructor.model';
import { LearningOutcome } from '@core/models/learning-outcome.model';
import { Question } from '@core/models/question.model';
import { Exam } from '@core/models/exam.model';
import { ExamBlueprint, BlueprintSummary } from '@core/models/exam-blueprint.model';
import { ContentItem } from '@core/models/content-item.model';
import { Rubric, RubricCriterion, RubricLevel, RubricStatus } from '@core/models/rubric.model';
import { Participant } from '@core/models/participant.model';
import { Cohort } from '@core/models/cohort.model';
import { Enrollment } from '@core/models/enrollment.model';
import { Attempt, QuestionResponse } from '@core/models/attempt.model';
import { MasteryScore, MasterySnapshot, DifficultyBreakdown } from '@core/models/mastery-score.model';
import { ExamSession } from '@core/models/exam-session.model';
import { Recommendation, ReasonDetail } from '@core/models/recommendation.model';
import { ItemAnalysis, DistractorAnalysis } from '@core/models/item-analysis.model';
import { ContentCompletion } from '@core/models/content-completion.model';
import { AnswerDraft } from '@core/models/answer-draft.model';
import { AuditLogEntry } from '@core/models/audit-log-entry.model';
import {
  CourseStatus, EnrollmentStatus, ExamStatus, QuestionStatus,
  Difficulty, ResultStatus, BlueprintStatus,
  MasteryLevel, ContentStatus, OutcomeStatus, SessionStatus,
  RecommendationStatus, AuditAction, UserRole,
} from '@core/models/enums';

import {
  INSTRUCTOR_SPECS, COURSE_SPECS, OUTCOME_SPECS, QUESTION_SPECS,
  EXAM_SPECS, BLUEPRINT_SPECS, CONTENT_SPECS, RUBRIC_SPECS,
  PARTICIPANT_SPECS, COHORT_SPECS
} from './seed-specs';

// ── deterministic PRNG ──
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rng: () => number;
function rand(): number { return rng(); }
function randInt(min: number, max: number): number { return Math.floor(rand() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[randInt(0, arr.length - 1)]; }
function pickN<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// ── helpers ──
const T = (date: string) => date; // identity for readability
let nextId = 1000;

function genId(): number { return nextId++; }
function genVK(): { version: number; createdAt: string; updatedAt: string } {
  return { version: 1, createdAt: '2024-01-01T10:00:00Z', updatedAt: '2024-01-01T10:00:00Z' };
}

const clampRate = (n: number) => Math.max(0, Math.min(1, n));

// Derive a per-difficulty success breakdown aligned with the overall score,
// so the recommendation engine can explain performance at each difficulty level.
function breakdownFor(score: number): DifficultyBreakdown {
  const base = score / 100;
  const totals = { easy: 4, medium: 5, hard: 3 };
  const easyRate = clampRate(base + 0.25);
  const mediumRate = clampRate(base + 0.05);
  const hardRate = clampRate(base - 0.2);
  const correct = (rate: number, total: number) => Math.round(rate * total);
  return {
    easy: { correct: correct(easyRate, totals.easy), total: totals.easy, successRate: easyRate },
    medium: { correct: correct(mediumRate, totals.medium), total: totals.medium, successRate: mediumRate },
    hard: { correct: correct(hardRate, totals.hard), total: totals.hard, successRate: hardRate },
  };
}

function historyFor(finalScore: number, lastDate: string): MasterySnapshot[] {
  const count = randInt(4, 6);
  const end = new Date(lastDate).getTime();
  const fourWeeks = 28 * 24 * 60 * 60 * 1000;
  const snapshots: MasterySnapshot[] = [];
  for (let i = 0; i < count; i++) {
    const progress = (i + 1) / count;
    const jitter = randInt(-8, 8);
    const score = Math.max(5, Math.min(100, Math.round(finalScore * progress + jitter)));
    const date = new Date(end - fourWeeks + (fourWeeks * progress)).toISOString().slice(0, 19) + 'Z';
    snapshots.push({ score, date });
  }
  return snapshots;
}

export function generateSeeds() {
  rng = mulberry32(42);
  nextId = 1000;

  // ── fixed-ID entities from specs ──

  const instructors: Instructor[] = INSTRUCTOR_SPECS.map((s, i) => ({
    id: i + 1,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
    phone: s.phone,
    expertise: s.expertise,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  }));

  const courses: Course[] = COURSE_SPECS.map((s, i) => ({
    id: i + 1,
    title: s.title,
    description: s.description,
    instructorId: s.instructorId,
    startDate: s.startDate,
    endDate: s.endDate,
    maxParticipants: s.maxParticipants,
    status: s.status,
    passingScore: s.passingScore,
    version: 1,
    createdAt: s.status === CourseStatus.COMPLETED ? '2023-12-20T10:00:00Z' : `2024-0${s.instructorId}-01T10:00:00Z`, // reasonable
    updatedAt: s.status === CourseStatus.COMPLETED ? '2024-02-20T17:00:00Z' : `2024-0${s.instructorId}-01T10:00:00Z`,
  }));

  const outcomeIdMap = new Map<number, number>();
  const outcomes: LearningOutcome[] = OUTCOME_SPECS.map((s, i) => {
    const id = 100 + i;
    outcomeIdMap.set(i, id);
    return {
      id,
      code: s.code,
      name: s.name,
      description: s.description,
      courseId: s.courseId,
      level: s.level,
      prerequisiteIds: [], // patched below after prefixed ids are available
      sortOrder: s.sortOrder,
      status: s.status,
      isActive: true,
      version: 1,
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
    };
  });

  // resolve outcome prerequisite IDs using the derived outcome object array
  const outcomeById = new Map<number, LearningOutcome>();
  outcomes.forEach(o => outcomeById.set(o.id, o));
  OUTCOME_SPECS.forEach((s, i) => {
    const specIndexInArray = s.prerequisiteIds.map(oldId => {
      // oldId was like [100] or [101,102] — these were the old hardcoded outcome IDs
      // We need to map old ID -> new ID (same scheme: 100+n)
      return oldId; // spec uses old IDs directly since they match new IDs (100+)
    });
    outcomes[i].prerequisiteIds = specIndexInArray;
  });

  // update prerequisiteIds resolution
  {
    let idx = 0;
    for (const spec of OUTCOME_SPECS) {
      outcomes[idx].prerequisiteIds = spec.prerequisiteIds;
      idx++;
    }
  }

  const questions: Question[] = QUESTION_SPECS.map((s, i) => ({
    id: i + 1,
    examId: s.examId,
    questionText: s.questionText,
    type: s.type,
    options: s.options.length > 0 ? s.options : undefined,
    correctAnswer: s.correctAnswer,
    solution: s.solution,
    difficulty: s.difficulty,
    points: s.points,
    status: QuestionStatus.ACTIVE,
    outcomeIds: s.outcomeIds,
    tags: s.tags,
    version: 1,
    createdAt: '2026-07-01T10:00:00Z',
    updatedAt: '2026-07-01T10:00:00Z',
  }));

  const exams: Exam[] = EXAM_SPECS.map((s, i) => ({
    id: i + 1,
    courseId: s.courseId,
    title: s.title,
    questionCount: questions.filter(q => q.examId === i + 1).length,
    passingScore: s.passingScore,
    duration: s.duration,
    wrongAnswerPenalty: s.wrongAnswerPenalty,
    status: s.status,
    version: 1,
    questionVersionIds: null,
    startDate: s.startDate,
    endDate: s.endDate,
    createdAt: '2024-03-15T10:00:00Z',
    updatedAt: s.status === ExamStatus.ARCHIVED ? '2024-03-20T17:00:00Z' : '2024-03-15T10:00:00Z',
  }));

  const blueprints: ExamBlueprint[] = BLUEPRINT_SPECS.map((s, i) => {
    const examQuestions = questions.filter(q => q.examId === s.examId);
    const coverage = s.constraints.map(c => ({
      outcomeId: c.outcomeId,
      selected: examQuestions.filter(q => q.outcomeIds?.includes(c.outcomeId)).length,
      required: c.minCount,
    }));
    const violations = coverage
      .filter(c => c.selected < c.required)
      .map(c => `outcomeId ${c.outcomeId}: ${c.selected} selected, ${c.required} required`);

    const summary: BlueprintSummary = {
      totalQuestions: examQuestions.length,
      totalPoints: examQuestions.reduce((sum, q) => sum + q.points, 0),
      coverage,
      violations,
    };

    return {
      id: 100 + i,
      name: s.name,
      examId: s.examId,
      constraints: s.constraints,
      status: violations.length > 0 ? BlueprintStatus.VIOLATED : BlueprintStatus.READY,
      summary,
      version: 1,
      createdAt: '2024-03-01T10:00:00Z',
      updatedAt: '2024-03-05T10:00:00Z',
    };
  });

  const contents: ContentItem[] = CONTENT_SPECS.map((s, i) => ({
    id: 100 + i,
    title: s.title,
    description: s.description,
    format: s.format,
    difficulty: s.difficulty,
    durationMinutes: s.durationMinutes,
    outcomeIds: s.outcomeIds,
    courseId: s.courseId,
    prerequisiteContentIds: s.prerequisiteContentIds,
    status: s.status,
    isLocked: s.isLocked,
    isRequired: s.isRequired,
    sortOrder: s.sortOrder,
    url: s.url,
    version: 1,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
  }));

  const rubrics: Rubric[] = RUBRIC_SPECS.map((s, i) => ({
    id: 100 + i,
    name: s.name,
    questionId: s.questionId,
    criteria: s.criteria.map((c, ci) => ({
      id: (i + 1) * 2 + ci - 1,
      name: c.name,
      description: c.description,
      maxPoints: c.maxPoints,
      levels: c.levels as RubricLevel[],
    } as RubricCriterion)),
    status: RubricStatus.ACTIVE,
    version: 1,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
  }));

  const participants: Participant[] = PARTICIPANT_SPECS.map((s, i) => ({
    id: i + 1,
    schoolNumber: s.schoolNumber,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
    phone: s.phone,
    birthDate: s.birthDate,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  }));

  const cohorts: Cohort[] = COHORT_SPECS.map((s, i) => ({
    id: 100 + i,
    name: s.name,
    programId: s.programId,
    termId: s.termId,
    studentIds: s.studentIds,
    version: 1,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  }));

  // ── generated / derived data ──

  // enrollments: assign students to courses deterministically
  const enrollments: Enrollment[] = [
    { id: 1, courseId: 1, participantId: 1, enrollmentDate: '2026-07-01T10:00:00Z', status: EnrollmentStatus.APPROVED, createdAt: '2026-07-01T10:00:00Z', updatedAt: '2026-07-01T10:00:00Z' },
    { id: 2, courseId: 1, participantId: 2, enrollmentDate: '2026-07-02T10:00:00Z', status: EnrollmentStatus.APPROVED, createdAt: '2026-07-02T10:00:00Z', updatedAt: '2026-07-02T10:00:00Z' },
    { id: 3, courseId: 2, participantId: 3, enrollmentDate: '2026-07-03T10:00:00Z', status: EnrollmentStatus.APPROVED, createdAt: '2026-07-03T10:00:00Z', updatedAt: '2026-07-03T10:00:00Z' },
    { id: 4, courseId: 1, participantId: 4, enrollmentDate: '2026-07-04T10:00:00Z', status: EnrollmentStatus.PENDING, createdAt: '2026-07-04T10:00:00Z', updatedAt: '2026-07-04T10:00:00Z' },
    { id: 5, courseId: 3, participantId: 5, enrollmentDate: '2026-07-05T10:00:00Z', status: EnrollmentStatus.COMPLETED, createdAt: '2026-07-05T10:00:00Z', updatedAt: '2026-07-06T10:00:00Z' },
    { id: 6, courseId: 1, participantId: 3, enrollmentDate: '2026-07-06T10:00:00Z', status: EnrollmentStatus.APPROVED, createdAt: '2026-07-06T10:00:00Z', updatedAt: '2026-07-06T10:00:00Z' },
    { id: 7, courseId: 1, participantId: 6, enrollmentDate: '2026-07-07T10:00:00Z', status: EnrollmentStatus.APPROVED, createdAt: '2026-07-07T10:00:00Z', updatedAt: '2026-07-07T10:00:00Z' },
    { id: 8, courseId: 2, participantId: 2, enrollmentDate: '2026-07-08T10:00:00Z', status: EnrollmentStatus.APPROVED, createdAt: '2026-07-08T10:00:00Z', updatedAt: '2026-07-08T10:00:00Z' },
    { id: 9, courseId: 2, participantId: 4, enrollmentDate: '2026-07-09T10:00:00Z', status: EnrollmentStatus.PENDING, createdAt: '2026-07-09T10:00:00Z', updatedAt: '2026-07-09T10:00:00Z' },
    { id: 10, courseId: 4, participantId: 7, enrollmentDate: '2026-07-10T10:00:00Z', status: EnrollmentStatus.APPROVED, createdAt: '2026-07-10T10:00:00Z', updatedAt: '2026-07-10T10:00:00Z' },
    { id: 11, courseId: 4, participantId: 8, enrollmentDate: '2026-07-11T10:00:00Z', status: EnrollmentStatus.APPROVED, createdAt: '2026-07-11T10:00:00Z', updatedAt: '2026-07-11T10:00:00Z' },
    { id: 12, courseId: 5, participantId: 9, enrollmentDate: '2026-07-12T10:00:00Z', status: EnrollmentStatus.APPROVED, createdAt: '2026-07-12T10:00:00Z', updatedAt: '2026-07-12T10:00:00Z' },
    { id: 13, courseId: 6, participantId: 10, enrollmentDate: '2026-07-13T10:00:00Z', status: EnrollmentStatus.APPROVED, createdAt: '2026-07-13T10:00:00Z', updatedAt: '2026-07-13T10:00:00Z' },
    { id: 14, courseId: 6, participantId: 11, enrollmentDate: '2026-07-14T10:00:00Z', status: EnrollmentStatus.PENDING, createdAt: '2026-07-14T10:00:00Z', updatedAt: '2026-07-14T10:00:00Z' },
  ];

  // exam sessions — demo active session for student Ali Korkmaz
  const now = new Date().toISOString();
  const examSessions: ExamSession[] = [
    {
      id: 1001,
      token: 'sess_demo_active_1',
      examId: 1,
      userId: 4,
      startedAt: new Date(Date.now() - 20 * 60000).toISOString(),
      serverTimeReference: now,
      durationMinutes: 60,
      timeRemainingSeconds: 2400,
      status: SessionStatus.ACTIVE,
      questionOrder: [1, 2, 3, 4, 11, 12],
      currentQuestionIndex: 2,
      markedQuestions: [1],
      connectionStatus: 'online',
      version: 1,
      questionVersionIds: null,
      questionSnapshots: questions.slice(0, 4),
      createdAt: now,
      updatedAt: now,
    },
  ];

  // attempts (same as existing for compatibility)
  const Q1: QuestionResponse[] = [
    { questionId: 5, answer: '1', isCorrect: true, autoScore: 5, maxScore: 5 },
    { questionId: 6, answer: '1', isCorrect: true, autoScore: 10, maxScore: 10 },
    { questionId: 15, answer: '1', isCorrect: false, autoScore: 0, maxScore: 10 },
    { questionId: 16, answer: '0', isCorrect: true, autoScore: 5, maxScore: 5 },
  ];
  const Q2: QuestionResponse[] = [
    { questionId: 13, answer: '0', isCorrect: true, autoScore: 10, maxScore: 10 },
    { questionId: 14, answer: '0', isCorrect: true, autoScore: 5, maxScore: 5 },
  ];
  const Q3: QuestionResponse[] = [
    { questionId: 1, answer: '1', isCorrect: true, autoScore: 5, maxScore: 5 },
    { questionId: 2, answer: '1', isCorrect: true, autoScore: 5, maxScore: 5 },
    { questionId: 3, answer: '0', isCorrect: true, autoScore: 10, maxScore: 10 },
    { questionId: 4, answer: '2', isCorrect: false, autoScore: 0, maxScore: 15 },
    { questionId: 11, answer: '0', isCorrect: true, autoScore: 5, maxScore: 5 },
    { questionId: 12, answer: '0', isCorrect: true, autoScore: 10, maxScore: 10 },
  ];

  const attempts: Attempt[] = [
    { id: 100, examId: 3, sessionToken: 'sess_102_ghi789', studentId: 5, startedAt: '2024-02-15T09:00:00Z', submittedAt: '2024-02-15T10:10:00Z', status: ResultStatus.FINALIZED, questionResponses: Q1, totalScore: 20, maxScore: 30, scorePercentage: 66.67, gradingCompletedAt: '2024-02-15T10:15:00Z', version: 1, createdAt: '2024-02-15T09:00:00Z', updatedAt: '2024-02-15T10:15:00Z' },
    { id: 101, examId: 2, sessionToken: 'sess_101_def456', studentId: 3, startedAt: '2024-04-05T14:00:00Z', submittedAt: '2024-04-05T14:40:00Z', status: ResultStatus.FINALIZED, questionResponses: Q2, totalScore: 15, maxScore: 15, scorePercentage: 100, gradingCompletedAt: '2024-04-05T14:45:00Z', version: 1, createdAt: '2024-04-05T14:00:00Z', updatedAt: '2024-04-05T14:45:00Z' },
    { id: 102, examId: 1, sessionToken: 'sess_100_abc123', studentId: 4, startedAt: '2024-03-20T10:00:00Z', status: ResultStatus.DRAFT, questionResponses: Q3, totalScore: 35, maxScore: 50, scorePercentage: 70, version: 1, createdAt: '2024-03-20T10:00:00Z', updatedAt: '2024-03-20T10:50:00Z' },
    { id: 103, examId: 5, sessionToken: 'sess_104_mno345', studentId: 7, startedAt: '2024-05-05T13:00:00Z', status: ResultStatus.DRAFT, questionResponses: [
      { questionId: 7, answer: '0', isCorrect: true, autoScore: 5, maxScore: 5 },
      { questionId: 8, answer: '0', isCorrect: true, autoScore: 10, maxScore: 10 },
    ], totalScore: 15, maxScore: 15, scorePercentage: 100, version: 1, createdAt: '2024-05-05T13:00:00Z', updatedAt: '2024-05-05T13:25:00Z' },
    { id: 104, examId: 1, sessionToken: 'sess_103_jkl012', studentId: 2, startedAt: '2024-03-21T11:00:00Z', status: ResultStatus.DRAFT, questionResponses: [
      { questionId: 1, answer: '1', isCorrect: true, autoScore: 5, maxScore: 5 },
      { questionId: 2, answer: '', isCorrect: false, autoScore: 0, maxScore: 5 },
    ], totalScore: 5, maxScore: 50, scorePercentage: 10, version: 1, createdAt: '2024-03-21T11:00:00Z', updatedAt: '2024-03-21T11:00:00Z' },
    { id: 105, examId: 6, sessionToken: 'sess_105_pqr678', studentId: 1, startedAt: '2024-03-22T09:00:00Z', status: ResultStatus.DRAFT, questionResponses: [
      { questionId: 9, answer: '0', isCorrect: true, autoScore: 10, maxScore: 10 },
      { questionId: 10, answer: '', isCorrect: false, autoScore: 0, maxScore: 5 },
    ], totalScore: 10, maxScore: 40, scorePercentage: 25, version: 1, createdAt: '2024-03-22T09:00:00Z', updatedAt: '2024-03-22T09:00:00Z' },
  ];

  // mastery
  const masteryScores: MasteryScore[] = [
    { id: 100, studentId: 1, outcomeId: 100, masteryLevel: MasteryLevel.ADVANCED, score: 92, recentAnswers: [1, 1, 1, 0, 1], difficultyWeightedAverage: 0.88, difficultyBreakdown: breakdownFor(92), repeatCount: 2, lastAssessedAt: '2024-03-15T10:00:00Z', calculatedAt: '2024-03-15T10:00:00Z', history: historyFor(92, '2024-03-15T10:00:00Z'), version: 1, createdAt: '2024-03-15T10:00:00Z', updatedAt: '2024-03-15T10:00:00Z' },
    { id: 101, studentId: 1, outcomeId: 101, masteryLevel: MasteryLevel.PROFICIENT, score: 78, recentAnswers: [1, 0, 1, 1, 1], difficultyWeightedAverage: 0.75, difficultyBreakdown: breakdownFor(78), repeatCount: 3, lastAssessedAt: '2024-03-15T10:00:00Z', calculatedAt: '2024-03-15T10:00:00Z', history: historyFor(78, '2024-03-15T10:00:00Z'), version: 1, createdAt: '2024-03-15T10:00:00Z', updatedAt: '2024-03-15T10:00:00Z' },
    { id: 102, studentId: 1, outcomeId: 102, masteryLevel: MasteryLevel.NOVICE, score: 35, recentAnswers: [0, 1, 0, 0], difficultyWeightedAverage: 0.3, difficultyBreakdown: breakdownFor(35), repeatCount: 1, lastAssessedAt: '2024-03-10T10:00:00Z', calculatedAt: '2024-03-10T10:00:00Z', history: historyFor(35, '2024-03-10T10:00:00Z'), version: 1, createdAt: '2024-03-10T10:00:00Z', updatedAt: '2024-03-10T10:00:00Z' },
    { id: 103, studentId: 2, outcomeId: 100, masteryLevel: MasteryLevel.EMERGING, score: 55, recentAnswers: [1, 0, 1, 0], difficultyWeightedAverage: 0.5, difficultyBreakdown: breakdownFor(55), repeatCount: 2, lastAssessedAt: '2024-03-20T10:00:00Z', calculatedAt: '2024-03-20T10:00:00Z', history: historyFor(55, '2024-03-20T10:00:00Z'), version: 1, createdAt: '2024-03-20T10:00:00Z', updatedAt: '2024-03-20T10:00:00Z' },
    { id: 104, studentId: 2, outcomeId: 103, masteryLevel: MasteryLevel.NOVICE, score: 25, recentAnswers: [0, 0, 1], difficultyWeightedAverage: 0.22, difficultyBreakdown: breakdownFor(25), repeatCount: 1, lastAssessedAt: '2024-03-18T10:00:00Z', calculatedAt: '2024-03-18T10:00:00Z', history: historyFor(25, '2024-03-18T10:00:00Z'), version: 1, createdAt: '2024-03-18T10:00:00Z', updatedAt: '2024-03-18T10:00:00Z' },
    { id: 105, studentId: 4, outcomeId: 106, masteryLevel: MasteryLevel.PROFICIENT, score: 82, recentAnswers: [1, 1, 1, 1, 0], difficultyWeightedAverage: 0.8, difficultyBreakdown: breakdownFor(82), repeatCount: 4, lastAssessedAt: '2024-04-01T10:00:00Z', calculatedAt: '2024-04-01T10:00:00Z', history: historyFor(82, '2024-04-01T10:00:00Z'), version: 1, createdAt: '2024-04-01T10:00:00Z', updatedAt: '2024-04-01T10:00:00Z' },
    { id: 106, studentId: 4, outcomeId: 107, masteryLevel: MasteryLevel.ADVANCED, score: 95, recentAnswers: [1, 1, 1, 1], difficultyWeightedAverage: 0.92, difficultyBreakdown: breakdownFor(95), repeatCount: 2, lastAssessedAt: '2024-04-05T10:00:00Z', calculatedAt: '2024-04-05T10:00:00Z', history: historyFor(95, '2024-04-05T10:00:00Z'), version: 1, createdAt: '2024-04-05T10:00:00Z', updatedAt: '2024-04-05T10:00:00Z' },
    { id: 107, studentId: 4, outcomeId: 108, masteryLevel: MasteryLevel.EMERGING, score: 48, recentAnswers: [0, 1, 0, 1, 0], difficultyWeightedAverage: 0.45, difficultyBreakdown: breakdownFor(48), repeatCount: 3, lastAssessedAt: '2024-04-10T10:00:00Z', calculatedAt: '2024-04-10T10:00:00Z', history: historyFor(48, '2024-04-10T10:00:00Z'), version: 1, createdAt: '2024-04-10T10:00:00Z', updatedAt: '2024-04-10T10:00:00Z' },
    { id: 108, studentId: 5, outcomeId: 109, masteryLevel: MasteryLevel.PROFICIENT, score: 85, recentAnswers: [1, 1, 0, 1], difficultyWeightedAverage: 0.82, difficultyBreakdown: breakdownFor(85), repeatCount: 1, lastAssessedAt: '2024-02-10T10:00:00Z', calculatedAt: '2024-02-10T10:00:00Z', history: historyFor(85, '2024-02-10T10:00:00Z'), version: 1, createdAt: '2024-02-10T10:00:00Z', updatedAt: '2024-02-10T10:00:00Z' },
    { id: 109, studentId: 5, outcomeId: 110, masteryLevel: MasteryLevel.EMERGING, score: 45, recentAnswers: [0, 1, 0], difficultyWeightedAverage: 0.4, difficultyBreakdown: breakdownFor(45), repeatCount: 2, lastAssessedAt: '2024-02-15T10:00:00Z', calculatedAt: '2024-02-15T10:00:00Z', history: historyFor(45, '2024-02-15T10:00:00Z'), version: 1, createdAt: '2024-02-15T10:00:00Z', updatedAt: '2024-02-15T10:00:00Z' },
    { id: 110, studentId: 7, outcomeId: 114, masteryLevel: MasteryLevel.PROFICIENT, score: 72, recentAnswers: [1, 1, 0, 1], difficultyWeightedAverage: 0.7, difficultyBreakdown: breakdownFor(72), repeatCount: 2, lastAssessedAt: '2024-04-20T10:00:00Z', calculatedAt: '2024-04-20T10:00:00Z', history: historyFor(72, '2024-04-20T10:00:00Z'), version: 1, createdAt: '2024-04-20T10:00:00Z', updatedAt: '2024-04-20T10:00:00Z' },
  ];

  // generated: masteries for more students (students 2, 3, 6 across their enrolled outcomes)
  {
    const enrolledStudentIds = [...new Set(enrollments.filter(e => e.status !== EnrollmentStatus.PENDING).map(e => e.participantId))];
    let mid = 200;
    for (const sid of enrolledStudentIds) {
      const studentCourses = enrollments.filter(e => e.participantId === sid).map(e => e.courseId);
      const studentOutcomes = outcomes.filter(o => studentCourses.includes(o.courseId));
      // skip if this student already has mastery entries
      const existing = masteryScores.filter(m => m.studentId === sid).map(m => m.outcomeId);
      const missing = studentOutcomes.filter(o => !existing.includes(o.id));
      for (const o of pickN(missing, Math.min(missing.length, randInt(1, 4)))) {
        const score = randInt(30, 95);
        const level = score >= 80 ? MasteryLevel.ADVANCED : score >= 60 ? MasteryLevel.PROFICIENT : score >= 40 ? MasteryLevel.EMERGING : MasteryLevel.NOVICE;
        const answers = Array.from({ length: randInt(3, 5) }, () => randInt(0, 1));
        masteryScores.push({
          id: mid++, studentId: sid, outcomeId: o.id,
          masteryLevel: level, score, recentAnswers: answers,
          difficultyWeightedAverage: (score - randInt(0, 5)) / 100,
          difficultyBreakdown: breakdownFor(score),
          repeatCount: randInt(1, 3),
          lastAssessedAt: '2024-04-01T10:00:00Z',
          calculatedAt: '2024-04-01T10:00:00Z',
          history: historyFor(score, '2024-04-01T10:00:00Z'),
          version: 1,
          createdAt: '2024-04-01T10:00:00Z',
          updatedAt: '2024-04-01T10:00:00Z',
        });
      }
    }
  }

  // generated: attempts for additional enrolled students
  {
    let aid = 200;
    const enrolledStudentIds = [...new Set(enrollments.filter(e => e.status !== EnrollmentStatus.PENDING).map(e => e.participantId))];
    for (const sid of enrolledStudentIds) {
      // skip students that already have attempts in the hardcoded list
      if (attempts.some(a => a.studentId === sid)) continue;
      const studentCourses = enrollments.filter(e => e.participantId === sid).map(e => e.courseId);
      const studentExams = exams.filter(e => studentCourses.includes(e.courseId));
      const exam = pick(studentExams);
      if (!exam) continue;
      const examQuestions = questions.filter(q => q.examId === exam.id);
      const responses: QuestionResponse[] = examQuestions.map(q => ({
        questionId: q.id,
        answer: String(pick(q.options ?? ['0', '1'])),
        isCorrect: rand() > 0.35,
        autoScore: rand() > 0.35 ? q.points : 0,
        maxScore: q.points,
      }));
      const total = responses.reduce((s, r) => s + r.autoScore, 0);
      const maxScore = responses.reduce((s, r) => s + r.maxScore, 0);
      const token = `sess_auto_${aid}_${sid}`;
      attempts.push({
        id: aid++, examId: exam.id, sessionToken: token,
        studentId: sid, startedAt: '2024-04-01T10:00:00Z',
        submittedAt: '2024-04-01T11:00:00Z',
        status: ResultStatus.FINALIZED,
        questionResponses: responses,
        totalScore: total, maxScore, scorePercentage: maxScore > 0 ? Math.round((total / maxScore) * 10000) / 100 : 0,
        gradingCompletedAt: '2024-04-01T11:05:00Z',
        version: 1,
        createdAt: '2024-04-01T10:00:00Z',
        updatedAt: '2024-04-01T11:05:00Z',
      });
    }
  }

  // content completions
  const contentCompletions: ContentCompletion[] = [
    { id: 1, studentId: 1, contentId: 100, courseId: 1, studyCount: 1, completedAt: '2024-03-05T10:00:00Z', createdAt: '2024-03-05T10:00:00Z', updatedAt: '2024-03-05T10:00:00Z' },
    { id: 2, studentId: 1, contentId: 101, courseId: 1, studyCount: 3, completedAt: '2024-03-10T10:00:00Z', createdAt: '2024-03-10T10:00:00Z', updatedAt: '2024-03-10T10:00:00Z' },
  ];

  // recommendations
  const recommendations: Recommendation[] = [
    { id: 100, studentId: 1, contentType: 'content', contentId: 102, outcomeId: 102, priority: 1, status: RecommendationStatus.PENDING, isApplied: false, isDismissed: false, reason: 'Kazanim puani dusuk: Direktif ve Pipe (35)', reasonDetails: [{ factor: 'mastery_score', weight: 0.6, description: 'Ustalik puani 35 - kirmizi bolge' }, { factor: 'repeat_count', weight: 0.2, description: 'Sadece 1 kez calisilmis' }, { factor: 'prerequisite', weight: 0.2, description: 'Binding konusunda yeterli (78)' }], version: 1, createdAt: '2024-03-16T10:00:00Z', updatedAt: '2024-03-16T10:00:00Z' },
    { id: 101, studentId: 1, contentType: 'question', contentId: 3, outcomeId: 101, priority: 2, status: RecommendationStatus.PENDING, isApplied: false, isDismissed: false, reason: 'Orta zorlukta tekrar sorusu: Data Binding', reasonDetails: [{ factor: 'mastery_score', weight: 0.5, description: 'Ustalik puani 78 - iyi ama duzeltilebilir' }, { factor: 'time_elapsed', weight: 0.3, description: 'Son degerlendirme uzerinden 1 ay gecmis' }], version: 1, createdAt: '2024-03-16T10:00:00Z', updatedAt: '2024-03-16T10:00:00Z' },
    { id: 102, studentId: 2, contentType: 'content', contentId: 104, outcomeId: 103, priority: 1, status: RecommendationStatus.PENDING, isApplied: false, isDismissed: false, reason: 'Servis ve DI konusunda eksik (25)', reasonDetails: [{ factor: 'mastery_score', weight: 0.7, description: 'Ustalik puani 25 - kritik seviye' }], version: 1, createdAt: '2024-03-21T10:00:00Z', updatedAt: '2024-03-21T10:00:00Z' },
    { id: 103, studentId: 4, contentType: 'content', contentId: 109, outcomeId: 108, priority: 2, status: RecommendationStatus.APPLIED, isApplied: true, isDismissed: false, reason: 'Subject tiplerinde gelisim alani (48)', reasonDetails: [{ factor: 'mastery_score', weight: 0.5, description: 'Ustalik puani 48' }, { factor: 'difficulty_trend', weight: 0.3, description: 'Zor sorularda basarisizlik' }], version: 1, createdAt: '2024-04-11T10:00:00Z', updatedAt: '2024-04-11T10:00:00Z' },
    { id: 104, studentId: 5, contentType: 'question', contentId: 15, outcomeId: 110, priority: 1, status: RecommendationStatus.PENDING, isApplied: false, isDismissed: false, reason: 'Generic tiplerde zayif (45)', reasonDetails: [{ factor: 'mastery_score', weight: 0.6, description: 'Ustalik puani 45' }, { factor: 'exam_performance', weight: 0.4, description: 'Sinavda generic sorusu yanlis' }], version: 1, createdAt: '2024-02-16T10:00:00Z', updatedAt: '2024-02-16T10:00:00Z' },
  ];

  // item analysis
  const itemAnalyses: ItemAnalysis[] = [
    {
      id: 100, questionId: 1, examId: 1,
      difficultyIndex: 0.72, discriminationIndex: 0.45, pointBiserial: 0.38,
      distractorAnalysis: [
        { optionKey: '0', optionValue: 'Python', selectionRate: 0.12, isCorrect: false },
        { optionKey: '1', optionValue: 'TypeScript', selectionRate: 0.72, isCorrect: true },
        { optionKey: '2', optionValue: 'Java', selectionRate: 0.10, isCorrect: false },
        { optionKey: '3', optionValue: 'C#', selectionRate: 0.06, isCorrect: false },
      ],
      upperGroupRate: 0.95, lowerGroupRate: 0.45, sampleSize: 40, status: 'computed',
      version: 1, calculatedAt: '2024-03-25T10:00:00Z', createdAt: '2024-03-25T10:00:00Z', updatedAt: '2024-03-25T10:00:00Z'
    },
    {
      id: 101, questionId: 4, examId: 1,
      difficultyIndex: 0.35, discriminationIndex: 0.62, pointBiserial: 0.55,
      distractorAnalysis: [
        { optionKey: '0', optionValue: 'create() fonksiyonu', selectionRate: 0.20, isCorrect: false },
        { optionKey: '1', optionValue: 'of() fonksiyonu', selectionRate: 0.30, isCorrect: false },
        { optionKey: '2', optionValue: 'new Observable()', selectionRate: 0.35, isCorrect: true },
        { optionKey: '3', optionValue: 'Hepsi', selectionRate: 0.15, isCorrect: false },
      ],
      upperGroupRate: 0.65, lowerGroupRate: 0.10, sampleSize: 40, status: 'computed',
      version: 1, calculatedAt: '2024-03-25T10:00:00Z', createdAt: '2024-03-25T10:00:00Z', updatedAt: '2024-03-25T10:00:00Z'
    },
    {
      id: 102, questionId: 13, examId: 2,
      difficultyIndex: 0.68, discriminationIndex: 0.38, pointBiserial: 0.32,
      distractorAnalysis: [
        { optionKey: '0', optionValue: 'Observable ve Observer', selectionRate: 0.68, isCorrect: true },
        { optionKey: '1', optionValue: 'Promise türü', selectionRate: 0.12, isCorrect: false },
        { optionKey: '2', optionValue: 'Event emitter', selectionRate: 0.15, isCorrect: false },
        { optionKey: '3', optionValue: 'Veri deposu', selectionRate: 0.05, isCorrect: false },
      ],
      upperGroupRate: 0.88, lowerGroupRate: 0.42, sampleSize: 35, status: 'computed',
      version: 1, calculatedAt: '2024-04-10T10:00:00Z', createdAt: '2024-04-10T10:00:00Z', updatedAt: '2024-04-10T10:00:00Z'
    },
  ];

  // answer drafts
  const answerDrafts: AnswerDraft[] = [
    { id: 100, sessionId: 100, questionId: 1, answer: '1', version: 3, isSynced: true, syncStatus: 'synced', lastSavedAt: '2024-03-20T10:05:00Z', createdAt: '2024-03-20T10:01:00Z', updatedAt: '2024-03-20T10:05:00Z' },
    { id: 101, sessionId: 100, questionId: 2, answer: '1', version: 1, isSynced: true, syncStatus: 'synced', lastSavedAt: '2024-03-20T10:08:00Z', createdAt: '2024-03-20T10:08:00Z', updatedAt: '2024-03-20T10:08:00Z' },
    { id: 102, sessionId: 100, questionId: 3, answer: '0', version: 2, isSynced: true, syncStatus: 'synced', lastSavedAt: '2024-03-20T10:15:00Z', createdAt: '2024-03-20T10:12:00Z', updatedAt: '2024-03-20T10:15:00Z' },
    { id: 103, sessionId: 103, questionId: 1, answer: '1', version: 1, isSynced: true, syncStatus: 'synced', lastSavedAt: '2024-03-21T11:05:00Z', createdAt: '2024-03-21T11:05:00Z', updatedAt: '2024-03-21T11:05:00Z' },
    { id: 104, sessionId: 103, questionId: 2, answer: '', version: 1, isSynced: false, syncStatus: 'pending', lastSavedAt: '2024-03-21T11:15:00Z', createdAt: '2024-03-21T11:10:00Z', updatedAt: '2024-03-21T11:15:00Z' },
    { id: 105, sessionId: 100, questionId: 12, answer: '0', version: 1, isSynced: true, syncStatus: 'synced', lastSavedAt: '2024-03-20T10:20:00Z', createdAt: '2024-03-20T10:20:00Z', updatedAt: '2024-03-20T10:20:00Z' },
  ];

  // audit log entries
  const auditLogs: AuditLogEntry[] = [
    { id: 1, action: AuditAction.CREATE, entity: 'Course', entityId: 1, user: 'Admin Kullanıcı', role: UserRole.PLATFORM_ADMIN, timestamp: '2026-07-07T08:00:00Z', description: 'Kurs oluşturuldu: Angular 22 Temelleri', version: 1, createdAt: '2026-07-07T08:00:00Z', updatedAt: '2026-07-07T08:00:00Z' },
    { id: 2, action: AuditAction.UPDATE, entity: 'Enrollment', entityId: 1, user: 'Admin Kullanıcı', role: UserRole.PLATFORM_ADMIN, timestamp: '2026-07-08T10:00:00Z', description: 'Kayıt durumu değiştirildi: Pending → Approved', version: 1, createdAt: '2026-07-08T10:00:00Z', updatedAt: '2026-07-08T10:00:00Z' },
    { id: 3, action: AuditAction.CREATE, entity: 'Exam', entityId: 1, user: 'Ahmet Yılmaz', role: UserRole.INSTRUCTOR, timestamp: '2026-07-09T14:00:00Z', description: 'Sınav oluşturuldu: Angular Temelleri Final Sınavı', version: 1, createdAt: '2026-07-09T14:00:00Z', updatedAt: '2026-07-09T14:00:00Z' },
    { id: 4, action: AuditAction.CREATE, entity: 'CertificateEligibility', entityId: 1, user: 'System', role: UserRole.PLATFORM_ADMIN, timestamp: '2026-07-10T16:00:00Z', description: 'Sertifika uygunluğu oluşturuldu', version: 1, createdAt: '2026-07-10T16:00:00Z', updatedAt: '2026-07-10T16:00:00Z' },
    { id: 5, action: AuditAction.UPDATE, entity: 'CertificateEligibility', entityId: 1, user: 'Admin Kullanıcı', role: UserRole.PLATFORM_ADMIN, timestamp: '2026-07-11T09:00:00Z', description: 'Sertifika verildi: CERT-2026-0001', version: 1, createdAt: '2026-07-11T09:00:00Z', updatedAt: '2026-07-11T09:00:00Z' },
  ];

  return {
    INSTRUCTORS_SEED: instructors,
    COURSES_SEED: courses,
    OUTCOMES_SEED: outcomes,
    QUESTIONS_SEED: questions,
    EXAMS_SEED: exams,
    BLUEPRINTS_SEED: blueprints,
    CONTENTS_SEED: contents,
    RUBRICS_SEED: rubrics,
    PARTICIPANTS_SEED: participants,
    COHORTS_SEED: cohorts,
    ENROLLMENTS_SEED: enrollments,
    EXAM_SESSIONS_SEED: examSessions,
    ATTEMPTS_SEED: attempts,
    MASTERY_SEED: masteryScores,
    ITEM_ANALYSIS_SEED: itemAnalyses,
    CONTENT_COMPLETIONS_SEED: contentCompletions,
    RECOMMENDATIONS_SEED: recommendations,
    ANSWER_DRAFTS_SEED: answerDrafts,
    AUDIT_LOG_SEED: auditLogs,
  };
}
