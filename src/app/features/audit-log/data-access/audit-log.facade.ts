import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuditLogEntry } from '@core/models/audit-log-entry.model';
import { AuditAction } from '@core/models/enums';
import { StorageService } from '@core/storage/storage.service';
import { MockApiService } from '@core/api/mock-api.service';
import { PageRequest, PageResponse } from '@core/api/mock-api.types';
import { AUDIT_LOG_SEED } from '@core/data';

export interface AuditLogSearchRequest {
  page: number;
  pageSize: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  action?: AuditAction | '';
  entity?: string | '';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}
export class AuditLogService {
  private storage = inject(StorageService);
  private mockApi = inject(MockApiService);

  private readonly STORAGE_KEY = 'audit_logs';
  private loaded = false;

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    const existing = this.storage.get<AuditLogEntry[]>(this.STORAGE_KEY);
    if (!existing || existing.length === 0) {
      this.storage.set(this.STORAGE_KEY, AUDIT_LOG_SEED);
    }
  }

  getAll(): Observable<AuditLogEntry[]> {
    this.ensureLoaded();
    const logs = this.storage.get<AuditLogEntry[]>(this.STORAGE_KEY) || [];
    return this.mockApi.get(logs);
  }

  getByEntity(entity: string): Observable<AuditLogEntry[]> {
    this.ensureLoaded();
    const logs = (this.storage.get<AuditLogEntry[]>(this.STORAGE_KEY) || [])
      .filter(l => l.entity === entity);
    return this.mockApi.get(logs);
  }

  getPaginated(request: AuditLogSearchRequest): Observable<PageResponse<AuditLogEntry>> {
    this.ensureLoaded();
    let logs = this.storage.get<AuditLogEntry[]>(this.STORAGE_KEY) || [];

    const dateFrom = request.dateFrom as string | undefined;
    const dateTo = request.dateTo as string | undefined;
    if (dateFrom) {
      const fromTs = dateFrom.length === 10 ? dateFrom + 'T00:00:00Z' : dateFrom;
      logs = logs.filter(l => l.timestamp >= fromTs);
    }
    if (dateTo) {
      const toTs = dateTo.length === 10 ? dateTo + 'T23:59:59Z' : dateTo;
      logs = logs.filter(l => l.timestamp <= toTs);
    }

    const pageRequest: PageRequest = {
      page: request.page,
      pageSize: request.pageSize,
      sortColumn: request.sortColumn,
      sortDirection: request.sortDirection,
      filters: {
        ...(request.action ? { action: request.action } : {}),
        ...(request.entity ? { entity: request.entity } : {}),
      },
      search: request.search || undefined,
    };

    return this.mockApi.paginate(logs, pageRequest);
  }
}
