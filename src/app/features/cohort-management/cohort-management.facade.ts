import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MockApiService } from '@core/api/mock-api.service';
import { CurrentUserService } from '@core/auth/current-user.service';
import { Cohort } from '@core/models/cohort.model';
import { AuditAction } from '@core/models/enums';
import { NotificationService } from '@core/observability/notification.service';
import { AuditService } from '@core/observability/audit.service';
import { EntityStore } from '@core/state/entity.store';

export class CohortManagementFacade {
  private mockApi = inject(MockApiService);
  private currentUser = inject(CurrentUserService);
  private notification = inject(NotificationService);
  private audit = inject(AuditService);
  private store = inject(EntityStore);

  readonly cohorts = this.store.cohorts.asReadonly();

  getCohorts(): Observable<Cohort[]> {
    this.audit.log({ action: AuditAction.VIEW, entity: 'Cohort', entityId: 0, description: 'Cohort listesi görüntülendi' });
    return this.mockApi.get([...this.store.cohorts()]);
  }

  createCohort(data: { name: string; description?: string; programId: number; termId: number }): Observable<Cohort> {
    const newId = Math.max(0, ...this.store.cohorts().map(c => c.id)) + 1;
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
    this.store.addCohort(newCohort);
    this.audit.log({ action: AuditAction.CREATE, entity: 'Cohort', entityId: newCohort.id, description: 'Cohort oluşturuldu', newValue: newCohort });
    this.notification.show('Cohort oluşturuldu', 'success');
    return this.mockApi.post(newCohort);
  }

  updateCohort(id: number, data: { name?: string; description?: string; isActive?: boolean; studentIds?: number[] }): Observable<Cohort | undefined> {
    const old = this.store.cohorts().find(c => c.id === id);
    if (!old) {
      this.notification.show('Cohort bulunamadı', 'error');
      return this.mockApi.simulateError();
    }
    this.store.updateCohort(id, data);
    const updated = this.store.cohorts().find(c => c.id === id)!;
    this.audit.log({ action: AuditAction.UPDATE, entity: 'Cohort', entityId: id, description: 'Cohort güncellendi', oldValue: old, newValue: updated });
    this.notification.show('Cohort güncellendi', 'success');
    return this.mockApi.put(updated);
  }

  deleteCohort(id: number): Observable<boolean> {
    const cohort = this.store.cohorts().find(c => c.id === id);
    if (!cohort) {
      this.notification.show('Cohort bulunamadı', 'error');
      return this.mockApi.simulateError();
    }
    this.store.removeCohort(id);
    this.audit.log({ action: AuditAction.DELETE, entity: 'Cohort', entityId: id, description: `Cohort silindi: ${cohort.name}` });
    this.notification.show('Cohort silindi', 'success');
    return this.mockApi.delete(true);
  }
}
