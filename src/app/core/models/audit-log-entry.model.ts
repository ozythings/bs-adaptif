import { AuditAction, UserRole } from './enums';

export interface AuditLogEntry {
  id: number;
  action: AuditAction;
  entity: string;
  entityId: number;
  user: string;
  role: UserRole;
  status?: string;
  timestamp: string;
  oldValue?: unknown;
  newValue?: unknown;
  description: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type AuditEvent = AuditLogEntry;
