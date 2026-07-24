import { generateSeeds } from './seed-generator';
import { loadSnapshot, enableAutoSave } from './seed-persist';

type Seeds = ReturnType<typeof generateSeeds>;

const seeds = (loadSnapshot() as Seeds | null) ?? generateSeeds();

export const {
  INSTRUCTORS_SEED,
  COURSES_SEED,
  OUTCOMES_SEED,
  QUESTIONS_SEED,
  EXAMS_SEED,
  BLUEPRINTS_SEED,
  CONTENTS_SEED,
  RUBRICS_SEED,
  PARTICIPANTS_SEED,
  COHORTS_SEED,
  ENROLLMENTS_SEED,
  EXAM_SESSIONS_SEED,
  ATTEMPTS_SEED,
  MASTERY_SEED,
  ITEM_ANALYSIS_SEED,
  CONTENT_COMPLETIONS_SEED,
  RECOMMENDATIONS_SEED,
  ANSWER_DRAFTS_SEED,
  AUDIT_LOG_SEED,
} = seeds;

enableAutoSave(seeds);
