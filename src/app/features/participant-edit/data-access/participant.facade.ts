import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MockApiService } from '@core/api/mock-api.service';
import { AuditService } from '@core/observability/audit.service';
import { PARTICIPANTS_SEED } from '@core/data';
import { Participant } from '@core/models/participant.model';
import { AuditAction } from '@core/models/enums';

export class ParticipantFacade {
  private mockApi = inject(MockApiService);
  private audit = inject(AuditService);

  getParticipant(id: number): Observable<Participant | undefined> {
    const p = PARTICIPANTS_SEED.find(x => x.id === id && !x.deletedAt);
    return this.mockApi.get(p);
  }

  updateParticipant(id: number, patch: Partial<Participant>): Observable<Participant | undefined> {
    const existing = PARTICIPANTS_SEED.find(x => x.id === id && !x.deletedAt);
    if (!existing) return this.mockApi.get(undefined);
    const updated: Participant = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const index = PARTICIPANTS_SEED.findIndex(x => x.id === id);
    if (index >= 0) PARTICIPANTS_SEED[index] = updated;
    this.audit.log({
      action: AuditAction.UPDATE,
      entity: 'Participant',
      entityId: id,
      description: `Katılımcı profili güncellendi: ${updated.firstName} ${updated.lastName}`,
      oldValue: { schoolNumber: existing.schoolNumber, email: existing.email, phone: existing.phone },
      newValue: { schoolNumber: updated.schoolNumber, email: updated.email, phone: updated.phone },
    });
    return this.mockApi.put(updated, existing as Participant);
  }
}
