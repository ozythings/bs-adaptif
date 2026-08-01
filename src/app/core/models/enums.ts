export enum CourseStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMPLETED = 'completed'
}

export enum EnrollmentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ExamStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum QuestionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export enum ResultStatus {
  DRAFT = 'draft',
  FINALIZED = 'finalized'
}

export enum AttendanceStatus {
  ATTENDED = 'attended',
  ABSENT = 'absent',
  EXCUSED = 'excused'
}

export enum CertificateStatus {
  NOT_ELIGIBLE = 'not_eligible',
  ELIGIBLE = 'eligible',
  ISSUED = 'issued'
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  CANCEL = 'cancel',
  SWITCH = 'switch',
  RESTORE = 'restore',
  PUBLISH = 'publish',
  GRADE = 'grade',
  OVERRIDE = 'override',
  VIEW = 'view',
  SUBMIT = 'submit',
  SESSION_END = 'session_end',
  SESSION_EXPIRE = 'session_expire'
}

export enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ASSESSMENT_SPECIALIST = 'assessment_specialist',
  PROGRAM_MANAGER = 'program_manager',
  OBSERVER = 'observer',
  PLATFORM_ADMIN = 'platform_admin'
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay'
}

export enum OutcomeLevel {
  REMEMBER = 'remember',
  UNDERSTAND = 'understand',
  APPLY = 'apply',
  ANALYZE = 'analyze',
  EVALUATE = 'evaluate',
  CREATE = 'create'
}

export enum ContentFormat {
  VIDEO = 'video',
  TEXT = 'text',
  INTERACTIVE = 'interactive',
  QUIZ = 'quiz'
}

export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
  EXPIRED = 'expired'
}

export enum BlueprintStatus {
  DRAFT = 'draft',
  READY = 'ready',
  VIOLATED = 'violated'
}

export enum MasteryLevel {
  NOSTUDYYET = 'nostudyyet',
  NOVICE = 'novice',
  EMERGING = 'emerging',
  PROFICIENT = 'proficient',
  ADVANCED = 'advanced'
}

export enum QuestionVersionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum ContentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

export enum OutcomeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft'
}

export enum RecommendationStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  DISMISSED = 'dismissed'
}
