import { QuestionResponse } from '@core/models/attempt.model';
import { Question } from '@core/models/question.model';
import { QuestionType } from '@core/models/enums';

export interface ScoreInput {
  response: QuestionResponse;
  question: Question;
  partialPoints?: boolean;
  partialPointsRules?: { threshold: number; points: number }[];
}

export interface ScoreResult {
  autoScore: number;
  isCorrect: boolean;
}

export function autoScore(input: ScoreInput): ScoreResult {
  const { response, question, partialPoints = false, partialPointsRules } = input;

  if (question.type === QuestionType.ESSAY || question.type === QuestionType.MATCHING) {
    return { autoScore: 0, isCorrect: false };
  }

  const correctAnswerStr = question.correctAnswer.toString();
  const studentAnswer = response.answer.trim().toLowerCase();
  const correctAnswer = correctAnswerStr.trim().toLowerCase();

  if (question.type === QuestionType.SHORT_ANSWER) {
    const correctKeywords = correctAnswer.split(/[,;|]/).map(k => k.trim()).filter(Boolean);
    const matched = correctKeywords.filter(k => studentAnswer.includes(k)).length;
    const ratio = matched / correctKeywords.length;

    if (matched === 0) {
      return { autoScore: 0, isCorrect: false };
    }
    if (matched === correctKeywords.length) {
      return { autoScore: question.points, isCorrect: true };
    }

    if (!partialPoints) {
      return { autoScore: 0, isCorrect: false };
    }

    if (partialPointsRules && partialPointsRules.length > 0) {
      const applicableRule = partialPointsRules
        .filter(r => ratio >= r.threshold)
        .sort((a, b) => b.threshold - a.threshold)[0];
      if (applicableRule) {
        return { autoScore: applicableRule.points, isCorrect: false };
      }
      return { autoScore: 0, isCorrect: false };
    }

    const partialScore = Math.round(ratio * question.points);
    return { autoScore: partialScore, isCorrect: false };
  }

  const isCorrect = studentAnswer === correctAnswer;

  if (!isCorrect) {
    return { autoScore: 0, isCorrect: false };
  }

  return { autoScore: question.points, isCorrect: true };
}

export interface AttemptScoreResult {
  totalScore: number;
  maxScore: number;
  scorePercentage: number;
  responses: QuestionResponse[];
}

export function calculateAttemptScore(
  responses: QuestionResponse[],
  questions: Question[]
): AttemptScoreResult {
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
  const scored = responses.map(r => {
    const question = questions.find(q => q.id === r.questionId);
    if (!question) return r;
    if (r.manualScore !== undefined && r.manualScore !== null) return r;
    const result = autoScore({ response: r, question });
    return { ...r, autoScore: result.autoScore, isCorrect: result.isCorrect };
  });
  const totalScore = scored.reduce((sum, r) => sum + (r.manualScore ?? r.autoScore), 0);
  const scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0;
  return { totalScore, maxScore, scorePercentage, responses: scored };
}
