import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Loader2 } from 'lucide-react';
import { DataTable, Select, Button, Badge, Modal, Input, emptySort, type Column, type SortFieldDef, type SortRule } from '@/shared/components/ui';
import type { AuditLog, AuditAction } from '@shared';
import { listAuditApi, purgeAuditApi } from '../api/audit.api';
import { fmtChangeValue, fmtField } from '../format';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { usePersistedState, useClampPage, isNonNegInt, isOneOf, isSortRules } from '@/shared/hooks/usePersistedState';

const MODULE_OPTS = [{ value: '', label: 'All modules' }, { value: 'user', label: 'Users' }, { value: 'role', label: 'Roles' }];
const ACTION_OPTS = [{ value: '', label: 'All actions' }, { value: 'create', label: 'Created' }, { value: 'update', label: 'Updated' }, { value: 'delete', label: 'Deleted' }];
const ACTION_VARIANT: Record<AuditAction, 'success' | 'info' | 'danger'> = { create: 'success', update: 'info', delete: 'danger' };

function summarize(a: AuditLog): string {
  if (a.action === 'create') return 'Created';
  if (a.action === 'delete') return 'Deleted';
  const keys = Object.keys(a.changes);
  if (!keys.length) return 'Updated';
  return keys.map(k => `${fmtField(k)}: ${fmtChangeValue(a.changes[k].old)} → ${fmtChangeValue(a.changes[k].new)}`).join(', ');
}

export default function AuditLog() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [page, setPage]         = usePersistedState('audit-log', 'page', 0, isNonNegInt);
  const [pageSize, setPageSize] = usePersistedState('audit-log', 'page-size', 25, isOneOf([25, 50, 100]));
  const [module, setModule]     = usePersistedState('audit-log', 'module', '', isOneOf(MODULE_OPTS.map(o => o.value)));
  const [action, setAction]     = usePersistedState('audit-log', 'action', '', isOneOf(ACTION_OPTS.map(o => o.value)));
  const [sort, setSort]         = usePersistedState<SortRule[]>('audit-log', 'sort', emptySort(), isSortRules);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['audit', 'list', page, pageSize, module, action, sort],
    queryFn:  () => listAuditApi({ page: page + 1, limit: pageSize, record_type: module || undefined, action: action || undefined, sort }),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
  const rows  = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  useClampPage(page, data?.meta.totalPages, setPage);

  const sortFields: SortFieldDef[] = [
    { key: 'created_at',  label: 'When' },
    { key: 'record_type', label: 'Module' },
    { key: 'action',      label: 'Action' },
    { key: 'record_id',   label: 'Record' },
  ];

  const columns: Column<AuditLog>[] = [
    { key: 'sno', label: 'S.No', align: 'center', noHide: true, noExport: true, sticky: 'left',
      render: (_, i) => <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>{page * pageSize + i + 1}</span> },
    { key: 'created_at', label: 'When', exportValue: r => r.created_at ?? '',
      render: r => <span className="text-xs whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</span> },
    { key: 'record_type', label: 'Module', exportValue: r => r.record_type,
      render: r => <Badge variant="neutral">{r.record_type}</Badge> },
    { key: 'record_id', label: 'Record', exportValue: r => r.record_id,
      render: r => <span className="text-xs font-mono">#{r.record_id}</span> },
    { key: 'action', label: 'Action', exportValue: r => r.action,
      render: r => <Badge variant={ACTION_VARIANT[r.action]}>{r.action}</Badge> },
    { key: 'actor_name', label: 'Actor', exportValue: r => r.actor_name ?? '',
      render: r => <span className="text-xs">{r.actor_name ?? <span style={{ color: 'var(--color-text-3)' }}>System</span>}</span> },
    { key: 'changes', label: 'Changes', noExport: false, exportValue: r => summarize(r),
      render: r => <span className="text-xs text-gray-600 dark:text-gray-300">{summarize(r)}</span> },
  ];

  /* ── Purge ── */
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeDays, setPurgeDays] = useState('90');
  const [purgeModule, setPurgeModule] = useState('');
  const purgeMutation = useMutation({
    mutationFn: () => purgeAuditApi({ olderThanDays: Math.max(0, parseInt(purgeDays, 10) || 0), recordType: purgeModule || undefined }),
    onSuccess: (res) => { toast.success(`Purged ${res.data.deleted} log(s)`); qc.invalidateQueries({ queryKey: ['audit'] }); setPurgeOpen(false); },
    onError: (err: Error) => toast.error(err.message || 'Purge failed'),
  });

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <DataTable
        className="flex-1 min-h-0"
        columns={columns}
        data={rows}
        pageSizes={[25, 50, 100]}
        rowKey={r => r.id}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onRetry={refetch}
        onRefresh={() => refetch()}
        filename="AuditLogs"
        storageKey="audit-log"
        sortFields={sortFields}
        sortValue={sort}
        onSortChange={(s) => { setSort(s); setPage(0); }}
        afterSearch={
          <div className="flex items-center gap-2">
            <div className="w-36"><Select value={module} onChange={v => { setModule(String(v)); setPage(0); }} options={MODULE_OPTS} size="sm" /></div>
            <div className="w-36"><Select value={action} onChange={v => { setAction(String(v)); setPage(0); }} options={ACTION_OPTS} size="sm" /></div>
          </div>
        }
        serverSide={{
          total, page, pageSize,
          onPageChange:     setPage,
          onPageSizeChange: (s) => { setPageSize(s); setPage(0); },
        }}
        headerAction={
          can('audit', 'delete')
            ? <Button size="sm" variant="danger" leftIcon={<Trash2 size={15} />} onClick={() => setPurgeOpen(true)}>Purge</Button>
            : undefined
        }
      />

      <Modal open={purgeOpen} onClose={() => setPurgeOpen(false)} title="Purge Audit Logs" subtitle="Permanently delete old audit entries"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" block onClick={() => setPurgeOpen(false)} disabled={purgeMutation.isPending}>Cancel</Button>
            <Button variant="danger" block loading={purgeMutation.isPending} onClick={() => purgeMutation.mutate()}>
              {purgeMutation.isPending && <Loader2 size={14} className="animate-spin" />}Purge
            </Button>
          </div>
        }>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Older than (days)</label>
            <Input type="number" min={0} value={purgeDays} onChange={e => setPurgeDays(e.target.value)} />
            <p className="text-[11px] text-gray-400 mt-1">0 deletes everything in scope. This cannot be undone.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Module</label>
            <Select value={purgeModule} onChange={v => setPurgeModule(String(v))} options={MODULE_OPTS} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
