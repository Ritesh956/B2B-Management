import api from './api';

export interface AuditLogUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuditLogItem {
  id: string;
  userId: string | null;
  user: AuditLogUser | null;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogListResponse {
  logs: AuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const auditLogService = {
  list: (params: {
    page?: number;
    limit?: number;
    entity?: string;
    userId?: string;
    from?: string;
    to?: string;
    search?: string;
  }) => api.get<AuditLogListResponse>('/audit-logs', { params }).then((r) => r.data),
};
