import { inject,  signal,  computed } from '@angular/core';
import { Observable } from 'rxjs';
import { MockApiService } from '@core/api/mock-api.service';
import { LearningOutcome } from '@core/models/learning-outcome.model';
import { OUTCOMES_SEED, COURSES_SEED } from '@core/data';
import { NotificationService } from '@core/observability/notification.service';
import { AuditService } from '@core/observability/audit.service';
import { AuditAction } from '@core/models/enums';
import { hasCycle } from '@shared/utils/cycle-detector';
export class OutcomesFacade {
  private mockApi = inject(MockApiService);
  private notification = inject(NotificationService);
  private audit = inject(AuditService);

  private rawOutcomes = signal<LearningOutcome[]>(OUTCOMES_SEED);

  readonly outcomes = this.rawOutcomes.asReadonly();
  readonly courses = COURSES_SEED;

  getByCourse(courseId: number): Observable<LearningOutcome[]> {
    const filtered = this.rawOutcomes().filter(o => o.courseId === courseId);
    return this.mockApi.get(filtered);
  }

  getById(id: number): Observable<LearningOutcome | undefined> {
    return this.mockApi.get(this.rawOutcomes().find(o => o.id === id));
  }

  detectCycle(outcomeId: number, prerequisiteId: number): boolean {
    return hasCycle(this.rawOutcomes(), outcomeId, prerequisiteId);
  }

  create(data: Omit<LearningOutcome, 'id' | 'createdAt' | 'updatedAt'>): Observable<LearningOutcome> {
    const newId = Math.max(...this.rawOutcomes().map(o => o.id)) + 1;
    if (data.prerequisiteIds && data.prerequisiteIds.length > 0) {
      for (const prereq of data.prerequisiteIds) {
        const prereqOutcome = this.rawOutcomes().find(o => o.id === prereq);
        if (!prereqOutcome) {
          this.notification.show(`Önkoşul kazanım #${prereq} bulunamadı`, 'error');
          return this.mockApi.simulateError();
        }
        if (!prereqOutcome.isActive) {
          this.notification.show(`Önkoşul kazanım "${prereqOutcome.code}" henüz yayında değil`, 'error');
          return this.mockApi.simulateError();
        }
        if (this.detectCycle(newId, prereq)) {
          this.notification.show('Döngüsel önkoşul ilişkisi tespit edildi', 'error');
          return this.mockApi.simulateError();
        }
      }
    }
    const newOutcome: LearningOutcome = {
      ...data,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.rawOutcomes.update(list => [...list, newOutcome]);
    this.audit.log({ action: AuditAction.CREATE, entity: 'LearningOutcome', entityId: newOutcome.id, description: 'Kazanım oluşturuldu', newValue: newOutcome });
    this.notification.show('Kazanım oluşturuldu', 'success');
    return this.mockApi.post(newOutcome);
  }

  update(id: number, data: Partial<LearningOutcome>): Observable<LearningOutcome | undefined> {
    const idx = this.rawOutcomes().findIndex(o => o.id === id);
    if (idx === -1) {
      this.notification.show('Kazanım bulunamadı', 'error');
      return this.mockApi.simulateError();
    }
    if (data.prerequisiteIds && data.prerequisiteIds.length > 0) {
      for (const prereq of data.prerequisiteIds) {
        const prereqOutcome = this.rawOutcomes().find(o => o.id === prereq);
        if (!prereqOutcome) {
          this.notification.show(`Önkoşul kazanım #${prereq} bulunamadı`, 'error');
          return this.mockApi.simulateError();
        }
        if (!prereqOutcome.isActive) {
          this.notification.show(`Önkoşul kazanım "${prereqOutcome.code}" henüz yayında değil`, 'error');
          return this.mockApi.simulateError();
        }
        if (this.detectCycle(id, prereq)) {
          this.notification.show('Döngüsel önkoşul ilişkisi tespit edildi', 'error');
          return this.mockApi.simulateError();
        }
      }
    }
    const updated = { ...this.rawOutcomes()[idx], ...data, updatedAt: new Date().toISOString() };
    this.rawOutcomes.update(list => list.map((o, i) => i === idx ? updated : o));
    this.audit.log({ action: AuditAction.UPDATE, entity: 'LearningOutcome', entityId: id, description: 'Kazanım güncellendi', oldValue: this.rawOutcomes()[idx], newValue: updated });
    this.notification.show('Kazanım güncellendi', 'success');
    return this.mockApi.put(updated);
  }

  delete(id: number): Observable<boolean> {
    const dependent = this.rawOutcomes().filter(o => o.prerequisiteIds.includes(id));
    if (dependent.length > 0) {
      this.notification.show('Bu kazanım başka kazanımların önkoşulu', 'error');
      return this.mockApi.simulateError();
    }
    this.audit.log({ action: AuditAction.DELETE, entity: 'LearningOutcome', entityId: id, description: 'Kazanım silindi' });
    this.rawOutcomes.update(list => list.filter(o => o.id !== id));
    this.notification.show('Kazanım silindi', 'success');
    return this.mockApi.delete(true);
  }

  getPrerequisites(outcomeId: number): LearningOutcome[] {
    const outcome = this.rawOutcomes().find(o => o.id === outcomeId);
    if (!outcome) return [];
    return outcome.prerequisiteIds
      .map(id => this.rawOutcomes().find(o => o.id === id))
      .filter((o): o is LearningOutcome => !!o);
  }

  getDependents(outcomeId: number): LearningOutcome[] {
    return this.rawOutcomes().filter(o => o.prerequisiteIds.includes(outcomeId));
  }
}
