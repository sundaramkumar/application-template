import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Ban, Copy, Check, KeyRound, TriangleAlert } from 'lucide-react';
import {
  DataTable, ConfirmDialog, Tooltip, Button, Badge, Modal, Field, Input, Select, DatePicker,
  emptySort, type Column, type SortFieldDef, type SortRule, type SelectOption,
} from '@/shared/components/ui';
import type { ApiKey, ApiKeyCreateResponse } from '@shared';
import { listApiKeysApi, createApiKeyApi, revokeApiKeyApi } from '../api/apikey.api';
import { listRolesApi } from '@/features/master/role/api/role.api';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { usePersistedState, useClampPage, isNonNegInt, isOneOf, isSortRules } from '@/shared/hooks/usePersistedState';

type KeyStatus = 'active' | 'expired' | 'revoked';
function keyStatus(k: ApiKey): KeyStatus {
  if (!k.active || k.revoked_at) return 'revoked';
  if (k.expires_at && new Date(k.expires_at).getTime() < Date.now()) return 'expired';
  return 'active';
}
function StatusBadge({ k }: { k: ApiKey }) {
  const s = keyStatus(k);
  return <Badge variant={s === 'active' ? 'success' : s === 'expired' ? 'warning' : 'danger'}>
    {s === 'active' ? 'Active' : s === 'expired' ? 'Expired' : 'Revoked'}
  </Badge>;
}

function fmtDate(v: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ApiKeys() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [page, setPage]         = usePersistedState('apikeys-master', 'page', 0, isNonNegInt);
  const [pageSize, setPageSize] = usePersistedState('apikeys-master', 'page-size', 25, isOneOf([25, 50, 100]));
  const [search, setSearch]     = usePersistedState('apikeys-master', 'query', '');
  const [sort, setSort]         = usePersistedState<SortRule[]>('apikeys-master', 'sort', emptySort(), isSortRules);
  const [toRevoke, setToRevoke] = useState<ApiKey | null>(null);

  // Create modal state.
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName]         = useState('');
  const [roleId, setRoleId]     = useState<string>('');
  const [expiresAt, setExpires] = useState('');     // 'YYYY-MM-DD' or ''
  const [created, setCreated]   = useState<ApiKeyCreateResponse | null>(null);  // plaintext shown once
  const [copied, setCopied]     = useState(false);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['apikeys', page, pageSize, search, sort],
    queryFn:  () => listApiKeysApi({ page: page + 1, limit: pageSize, search, sort }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const rows  = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  useClampPage(page, data?.meta.totalPages, setPage);

  const { data: rolesData } = useQuery({ queryKey: ['roles', 'all'], queryFn: () => listRolesApi({ limit: 100 }), staleTime: 60_000 });
  const roleOptions: SelectOption[] = (rolesData?.data ?? []).map(r => ({ value: r.id, label: r.name }));

  const sortFields: SortFieldDef[] = [
    { key: 'name',         label: 'Name' },
    { key: 'created_at',   label: 'Created' },
    { key: 'last_used_at', label: 'Last Used' },
    { key: 'expires_at',   label: 'Expires' },
  ];

  const resetForm = () => { setName(''); setRoleId(''); setExpires(''); setCreated(null); setCopied(false); };
  const closeCreate = () => { setCreateOpen(false); resetForm(); if (created) qc.invalidateQueries({ queryKey: ['apikeys'] }); };

  const createMutation = useMutation({
    mutationFn: () => createApiKeyApi({ name: name.trim(), role_id: roleId, expires_at: expiresAt || null }),
    onSuccess: (res) => { setCreated(res.data); qc.invalidateQueries({ queryKey: ['apikeys'] }); },
    onError: (err: Error) => toast.error(err.message || 'Failed to create API key'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeApiKeyApi(id),
    onSuccess: () => { toast.success('API key revoked'); qc.invalidateQueries({ queryKey: ['apikeys'] }); setToRevoke(null); },
    onError: (err: Error) => { toast.error(err.message || 'Failed to revoke API key'); setToRevoke(null); },
  });

  const copyKey = async () => {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.key); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error('Copy failed — select and copy manually'); }
  };

  const columns: Column<ApiKey>[] = [
    { key: 'sno', label: 'S.No', align: 'center', noHide: true, noExport: true, sticky: 'left',
      render: (_, i) => <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>{page * pageSize + i + 1}</span> },
    { key: 'name', label: 'Name', noHide: true, sticky: 'left', exportValue: r => r.name,
      render: r => <span className="text-xs font-medium" style={{ color: 'var(--color-text-1)' }}>{r.name}</span> },
    { key: 'prefix', label: 'Key', exportValue: r => r.prefix,
      render: r => <span className="font-mono text-xs" style={{ color: 'var(--color-text-2)' }}>{r.prefix}…</span> },
    { key: 'role_name', label: 'Role', exportValue: r => r.role_name ?? '',
      render: r => r.role_name ? <Badge variant="info">{r.role_name}</Badge> : <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>—</span> },
    { key: 'last_used_at', label: 'Last Used', exportValue: r => fmtDate(r.last_used_at),
      render: r => <span className="text-xs" style={{ color: 'var(--color-text-2)' }}>{fmtDate(r.last_used_at)}</span> },
    { key: 'expires_at', label: 'Expires', exportValue: r => r.expires_at ? fmtDate(r.expires_at) : 'Never',
      render: r => <span className="text-xs" style={{ color: 'var(--color-text-2)' }}>{r.expires_at ? fmtDate(r.expires_at) : 'Never'}</span> },
    { key: 'status', label: 'Status', exportValue: r => keyStatus(r), render: r => <StatusBadge k={r} /> },
    { key: 'action', label: 'Action', sticky: 'right', noExport: true, noHide: true,
      render: (r) => (
        <div className="flex items-center gap-0.5">
          {can('apikeys', 'delete') && keyStatus(r) !== 'revoked' && (
            <Tooltip label="Revoke"><button onClick={e => { e.stopPropagation(); setToRevoke(r); }} className="p-1.5 rounded-lg transition" style={{ color: '#f87171' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-hover)'; e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#f87171'; }}><Ban size={14} /></button></Tooltip>
          )}
        </div>
      ) },
  ];

  const canSubmit = name.trim().length > 0 && roleId !== '';

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
        searchPlaceholder="Search by name…"
        filename="API Keys"
        storageKey="apikeys-master"
        sortFields={sortFields}
        sortValue={sort}
        onSortChange={(s) => { setSort(s); setPage(0); }}
        serverSide={{
          total, page, pageSize,
          onPageChange:     setPage,
          onPageSizeChange: (s) => { setPageSize(s); setPage(0); },
          onSearch:         (q) => { if (q !== search) { setSearch(q); setPage(0); } },
        }}
        headerAction={
          can('apikeys', 'create')
            ? <Button size="sm" leftIcon={<Plus size={15} />} onClick={() => { resetForm(); setCreateOpen(true); }}>New API Key</Button>
            : undefined
        }
      />

      {/* Create / reveal modal */}
      <Modal
        open={createOpen}
        onClose={closeCreate}
        title={created ? 'API Key Created' : 'New API Key'}
        subtitle={created ? 'Copy your key now — it won’t be shown again' : 'Bind a key to a role; it inherits that role’s permissions'}
        icon={<KeyRound size={18} />}
        size="md"
        footer={
          created ? (
            <div className="flex justify-end">
              <Button size="sm" onClick={closeCreate}>Done</Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={closeCreate}>Cancel</Button>
              <Button size="sm" loading={createMutation.isPending} disabled={!canSubmit} onClick={() => createMutation.mutate()}>Create Key</Button>
            </div>
          )
        }
      >
        {created ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg p-3 text-xs" style={{ background: 'var(--color-hover)', color: 'var(--color-text-2)' }}>
              <TriangleAlert size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
              <span>This is the only time the full key is shown. Store it somewhere safe. If you lose it, revoke this key and create a new one.</span>
            </div>
            <Field label="Your API Key">
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg border px-3 py-2.5 text-xs font-mono" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-1)' }}>{created.key}</code>
                <Button size="sm" variant="secondary" leftIcon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={copyKey}>{copied ? 'Copied' : 'Copy'}</Button>
              </div>
            </Field>
            <p className="text-[11px]" style={{ color: 'var(--color-text-3)' }}>
              Use it as <code className="font-mono">Authorization: Bearer {created.prefix}…</code> or <code className="font-mono">X-API-Key</code>.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Name" required hint="A label to identify this key (e.g. “Billing export”).">
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Reporting integration" autoFocus />
            </Field>
            <Field label="Role" required hint="The key inherits this role’s permissions and data scope.">
              <Select value={roleId} onChange={v => setRoleId(String(v))} options={roleOptions} placeholder="Select a role…" />
            </Field>
            <Field label="Expires" hint="Optional. Leave blank for a key that never expires.">
              <DatePicker value={expiresAt} onChange={setExpires} placeholder="Never expires" />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toRevoke}
        title="Revoke API Key?"
        message={toRevoke ? `“${toRevoke.name}” will stop working immediately. This cannot be undone.` : ''}
        confirmLabel="Revoke"
        variant="danger"
        isLoading={revokeMutation.isPending}
        onCancel={() => setToRevoke(null)}
        onConfirm={() => toRevoke && revokeMutation.mutate(toRevoke.id)}
      />
    </div>
  );
}
