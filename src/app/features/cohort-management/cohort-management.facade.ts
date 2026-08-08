import { inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { MockApiService } from '@core/api/mock-api.service';
import { CurrentUserService } from '@core/auth/current-user.service';
import { COHORTS_SEED } from '@core/data';
import { Cohort } from '@core/models/cohort.model';
import { AuditAction } from '@core/models/enums';
import { NotificationService } from '@core/observability/notification.service';
import { AuditService } from '@core/observability/audit.service';

export class CohortManagementFacade {
  private mockApi = inject(MockApiService);
  private currentUser = inject(CurrentUserService);
  private notification = inject(NotificationService);
  private audit = inject(AuditService);

  private rawCohorts = signal<Cohort[]>(COHORTS_SEED.map(c => ({ ...c, isActive: c.isActive ?? true })));

  readonly cohorts = this.rawCohorts.asReadonly();

  getCohorts(): Observable<Cohort[]> {
    this.audit.log({ action: AuditAction.VIEW, entity: 'Cohort', entityId: 0, description: 'Cohort listesi görüntülendi' });
    return this.mockApi.get(this.rawCohorts());
  }

  createCohort(data: { name: string; description?: string; programId: number; termId: number }): Observable<Cohort> {
    const newId = Math.max(0, ...this.rawCohorts().map(c => c.id)) + 1;
    const now = new Date().toISOString();
    const newCohort: Cohort = {
      id: newId,
      name: data.name,
      description: data.description ?? '',
      programId: data.programId,
      termId: data.termId,
      studentIds: [],
      isActive: true,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.rawCohorts.update(list => [...list, newCohort]);
    this.audit.log({ action: AuditAction.CREATE, entity: 'Cohort', entityId: newCohort.id, description: 'Cohort oluşturuldu', newValue: newCohort });
    this.notification.show('Cohort oluşturuldu', 'success');
    return this.mockApi.post(newCohort);
  }

  updateCohort(id: number, data: { name?: string; description?: string; isActive?: boolean }): Observable<Cohort | undefined> {
    const idx = this.rawCohorts().findIndex(c => c.id === id);
    if (idx === -1) {
      this.notification.show('Cohort bulunamadı', 'error');
      return this.mockApi.simulateError();
    }
    const old = this.rawCohorts()[idx];
    const updated: Cohort = { ...old, ...data, updatedAt: new Date().toISOString() };
    this.rawCohorts.update(list => list.map((c, i) => i === idx ? updated : c));
    this.audit.log({ action: AuditAction.UPDATE, entity: 'Cohort', entityId: id, description: 'Cohort güncellendi', oldValue: old, newValue: updated });
    this.notification.show('Cohort güncellendi', 'success');
    return this.mockApi.put(updated);
  }

  deleteCohort(id: number): Observable<boolean> {
    const cohort = this.rawCohorts().find(c => c.id === id);
    if (!cohort) {
      this.notification.show('Cohort bulunamadı', 'error');
      return this.mockApi.simulateError();
    }
    this.rawCohorts.update(list => list.filter(c => c.id !== id));
    this.audit.log({ action: AuditAction.DELETE, entity: 'Cohort', entityId: id, description: `Cohort silindi: ${cohort.name}` });
    this.notification.show('Cohort silindi', 'success');
    return this.mockApi.delete(true);
  }
}
