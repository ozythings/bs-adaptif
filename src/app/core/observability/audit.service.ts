import { inject } from '@angular/core';
import { AuditLogEntry } from '@core/models/audit-log-entry.model';
import { AuditAction } from '@core/models/enums';
import { StorageService } from '@core/storage/storage.service';
import { CurrentUserService } from '@core/auth/current-user.service';
import { EventBusService } from '@core/state/event-bus.service';

export interface AuditLogRequest {
  action: AuditAction;
  entity: string;
  entityId: number;
  description: string;
  oldValue?: unknown;
  newValue?: unknown;
}
export class AuditService {
  private readonly STORAGE_KEY = 'audit_logs';
  private storage = inject(StorageService);
  private currentUser = inject(CurrentUserService);
  private eventBus = inject(EventBusService);

  log(request: AuditLogRequest): void {
    const logs = this.storage.get<AuditLogEntry[]>(this.STORAGE_KEY) || [];
    const user = this.currentUser.getUser();

    const now = new Date().toISOString();
    const entry: AuditLogEntry = {
      id: Date.now(),
      action: request.action,
      entity: request.entity,
      entityId: request.entityId,
      user: user.name,
      role: user.role,
      timestamp: now,
      oldValue: request.oldValue,
      newValue: request.newValue,
      description: request.description,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    logs.unshift(entry);
    this.storage.set(this.STORAGE_KEY, logs);
    this.eventBus.emit('audit', { entry });
  }

  getLogs(): AuditLogEntry[] {
    return this.storage.get<AuditLogEntry[]>(this.STORAGE_KEY) || [];
  }

  getLogsByEntity(entity: string): AuditLogEntry[] {
    return this.getLogs().filter(log => log.entity === entity);
  }

  getLogsByEntityId(entityId: number): AuditLogEntry[] {
    return this.getLogs().filter(log => log.entityId === entityId);
  }
}
