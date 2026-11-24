import { apiFetch } from '@/shared/api/client';
import type { SortRule } from '@/shared/components/ui';
import type { ApiResponse, PaginatedResponse, AuditLog } from '@shared';

export interface AuditListParams {
  page?:        number;
  limit?:       number;
  sort?:        SortRule[];
  record_type?: string;
  record_id?:   string;
  action?:      string;
  actor_id?:    string;
  from?:        string;
  to?:          string;
}

export function listAuditApi(p: AuditListParams = {}) {
  const qs = new URLSearchParams();
  if (p.page)  qs.set('page', String(p.page));
  if (p.limit) qs.set('limit', String(p.limit));
  if (p.sort?.length) qs.set('sort', p.sort.map(s => `${s.field}:${s.dir}`).join(','));
  if (p.record_type) qs.set('record_type', p.record_type);
  if (p.record_id !== undefined) qs.set('record_id', String(p.record_id));
  if (p.action) qs.set('action', p.action);
  if (p.actor_id !== undefined) qs.set('actor_id', String(p.actor_id));
  if (p.from) qs.set('from', p.from);
  if (p.to)   qs.set('to', p.to);
  const s = qs.toString();
  return apiFetch<PaginatedResponse<AuditLog>>(`/api/audit${s ? `?${s}` : ''}`);
}

export function purgeAuditApi(p: { olderThanDays: number; recordType?: string }) {
  const qs = new URLSearchParams({ olderThanDays: String(p.olderThanDays) });
  if (p.recordType) qs.set('record_type', p.recordType);
  return apiFetch<ApiResponse<{ deleted: number }>>(`/api/audit/purge?${qs.toString()}`, { method: 'DELETE' });
}
