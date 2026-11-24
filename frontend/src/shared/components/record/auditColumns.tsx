import type { Column, FilterFieldDef, SortFieldDef } from '@/shared/components/ui';
import { fmtDateTime } from '@/shared/lib/format';
import { DateTimeCell, ActorCell, type AuditStamp } from './RecordParts';

/* Created/Updated At/By — one definition for every master list. The backend list
   endpoint must whitelist the same keys for sort + filter. */

export function auditColumns<T extends AuditStamp>(): Column<T>[] {
  return [
    { key: 'created_at',      label: 'Created At', exportValue: r => fmtDateTime(r.created_at), render: r => <DateTimeCell iso={r.created_at} /> },
    { key: 'created_by_name', label: 'Created By', exportValue: r => r.created_by_name ?? 'System', render: r => <ActorCell name={r.created_by_name} /> },
    { key: 'updated_at',      label: 'Updated At', exportValue: r => fmtDateTime(r.updated_at), render: r => <DateTimeCell iso={r.updated_at} /> },
    { key: 'updated_by_name', label: 'Updated By', exportValue: r => r.updated_by_name ?? 'System', render: r => <ActorCell name={r.updated_by_name} /> },
  ];
}

export const AUDIT_SORT_FIELDS: SortFieldDef[] = [
  { key: 'created_at',      label: 'Created At' },
  { key: 'created_by_name', label: 'Created By' },
  { key: 'updated_at',      label: 'Updated At' },
  { key: 'updated_by_name', label: 'Updated By' },
];

export const AUDIT_FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'created_at',      label: 'Created At', type: 'date' },
  { key: 'created_by_name', label: 'Created By', type: 'text' },
  { key: 'updated_at',      label: 'Updated At', type: 'date' },
  { key: 'updated_by_name', label: 'Updated By', type: 'text' },
];
