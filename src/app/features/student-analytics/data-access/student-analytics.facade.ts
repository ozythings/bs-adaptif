import { inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MockApiService } from '@core/api/mock-api.service';
import { PARTICIPANTS_SEED, MASTERY_SEED, ATTEMPTS_SEED, RECOMMENDATIONS_SEED, OUTCOMES_SEED, COURSES_SEED, ENROLLMENTS_SEED } from '@core/data';
import { Participant } from '@core/models/participant.model';
import { MasteryScore } from '@core/models/mastery-score.model';
import { Attempt } from '@core/models/attempt.model';
import { Recommendation } from '@core/models/recommendation.model';
import { LearningOutcome } from '@core/models/learning-outcome.model';
import { AuditService } from '@core/observability/audit.service';
import { DataScopeService } from '@core/auth/data-scope.service';
import { AuditAction, UserRole } from '@core/models/enums';
import { CurrentUserService } from '@core/auth/current-user.service';
export class StudentAnalyticsFacade {
  private mockApi = inject(MockApiService);
  private audit = inject(AuditService);
  private dataScope = inject(DataScopeService);
  private currentUser = inject(CurrentUserService);

  private validateAccess(studentId: number): boolean {
    const scope = this.dataScope.getScope();
    if (!scope.allowedStudentIds) return true;
    return scope.allowedStudentIds.includes(studentId);
  }

  getStudentInfo(studentId: number): Observable<Participant | undefined> {
    if (!this.validateAccess(studentId)) return of(undefined);
    this.audit.log({ action: AuditAction.VIEW, entity: 'Student', entityId: studentId, description: 'Öğrenci bilgisi görüntülendi' });
    return this.mockApi.get(PARTICIPANTS_SEED.find(p => p.id === studentId));
  }

  getMasteryScores(studentId: number): Observable<MasteryScore[]> {
    if (!this.validateAccess(studentId)) return of([]);
    this.audit.log({ action: AuditAction.VIEW, entity: 'MasteryScore', entityId: studentId, description: 'Öğrenci başarım puanları görüntülendi' });
    return this.mockApi.get(MASTERY_SEED.filter(s => s.studentId === studentId));
  }

  getAttempts(studentId: number): Observable<Attempt[]> {
    if (!this.validateAccess(studentId)) return of([]);
    this.audit.log({ action: AuditAction.VIEW, entity: 'Attempt', entityId: studentId, description: 'Öğrenci denemeleri görüntülendi' });
    return this.mockApi.get(ATTEMPTS_SEED.filter(a => a.studentId === studentId));
  }

  getRecommendations(studentId: number): Observable<Recommendation[]> {
    if (!this.validateAccess(studentId)) return of([]);
    this.audit.log({ action: AuditAction.VIEW, entity: 'Recommendation', entityId: studentId, description: 'Öğrenci önerileri görüntülendi' });
    return this.mockApi.get(RECOMMENDATIONS_SEED.filter(r => r.studentId === studentId));
  }

  getWeakOutcomes(studentId: number): Observable<LearningOutcome[]> {
    if (!this.validateAccess(studentId)) return of([]);
    this.audit.log({ action: AuditAction.VIEW, entity: 'WeakOutcome', entityId: studentId, description: 'Zayıf kazanımlar görüntülendi' });
    const masteryScores = MASTERY_SEED.filter(s => s.studentId === studentId && s.score < 50);
    const outcomeIds = masteryScores.map(s => s.outcomeId);
    return this.mockApi.get(OUTCOMES_SEED.filter(o => outcomeIds.includes(o.id)));
  }

  getStrongOutcomes(studentId: number): Observable<LearningOutcome[]> {
    if (!this.validateAccess(studentId)) return of([]);
    this.audit.log({ action: AuditAction.VIEW, entity: 'StrongOutcome', entityId: studentId, description: 'Güçlü kazanımlar görüntülendi' });
    const masteryScores = MASTERY_SEED.filter(s => s.studentId === studentId && s.score >= 70);
    const outcomeIds = masteryScores.map(s => s.outcomeId);
    return this.mockApi.get(OUTCOMES_SEED.filter(o => outcomeIds.includes(o.id)));
  }

  getAllOutcomes(): Observable<LearningOutcome[]> {
    if (!this.validateAccess(this.currentUser.getUser().studentId ?? this.currentUser.getUser().id)) {
      return of([]);
    }
    return this.mockApi.get([...OUTCOMES_SEED]);
  }
}
