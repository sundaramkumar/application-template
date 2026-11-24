import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { DataTable, ConfirmDialog, Tooltip, Button, Badge, emptyFilterConfig, emptySort, type Column, type FilterFieldDef, type SortFieldDef, type SortRule } from '@/shared/components/ui';
import type { User, UserStatus, FilterConfig } from '@shared';
import { listUsersApi, deleteUserApi } from '../api/user.api';
import { listRolesApi } from '@/features/master/role/api/role.api';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { auditColumns, AUDIT_SORT_FIELDS, AUDIT_FILTER_FIELDS } from '@/shared/components/record/auditColumns';
import { usePersistedState, useClampPage, isNonNegInt, isOneOf, isFilterConfig, isSortRules } from '@/shared/hooks/usePersistedState';

/* ── Badges (built on the shared Badge) ──────────────────────────── */
function StatusBadge({ status }: { status: UserStatus }) {
  return <Badge variant={status === 'active' ? 'success' : 'danger'}>{status === 'active' ? 'Active' : 'Inactive'}</Badge>;
}
function RoleBadge({ name }: { name: string }) {
  return <Badge variant="info">{name}</Badge>;
}

export default function UserMaster() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { can } = usePermissions();
  // List state survives a refresh (columns/widths are persisted by DataTable itself).
  const [page, setPage]         = usePersistedState('user-master', 'page', 0, isNonNegInt);
  const [pageSize, setPageSize] = usePersistedState('user-master', 'page-size', 25, isOneOf([25, 50, 100]));
  const [search, setSearch]     = usePersistedState('user-master', 'query', '');
  const [filter, setFilter]     = usePersistedState<FilterConfig>('user-master', 'filter', emptyFilterConfig(), isFilterConfig);
  const [sort, setSort]         = usePersistedState<SortRule[]>('user-master', 'sort', emptySort(), isSortRules);
  const [toDelete, setToDelete] = useState<User | null>(null);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['users', page, pageSize, search, filter, sort],
    queryFn:  () => listUsersApi({ page: page + 1, limit: pageSize, search, filter, sort }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const rows  = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  useClampPage(page, data?.meta.totalPages, setPage);

  const { data: rolesData } = useQuery({ queryKey: ['roles', 'all'], queryFn: () => listRolesApi({ limit: 100 }), staleTime: 60_000 });

  const sortFields: SortFieldDef[] = [
    { key: 'username',   label: 'Username' },
    { key: 'full_name',  label: 'Full Name' },
    { key: 'email',      label: 'Email' },
    { key: 'status',     label: 'Status' },
    { key: 'role_name',  label: 'Role' },
    ...AUDIT_SORT_FIELDS,
  ];

  const filterFields: FilterFieldDef[] = [
    { key: 'username',   label: 'Username',  type: 'text' },
    { key: 'full_name',  label: 'Full Name', type: 'text' },
    { key: 'email',      label: 'Email',     type: 'text' },
    { key: 'role_name',  label: 'Role',      type: 'select', options: (rolesData?.data ?? []).map(r => ({ value: r.name, label: r.name })) },
    { key: 'status',     label: 'Status',    type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] },
    ...AUDIT_FILTER_FIELDS,
  ];

  const openRecord = (u: User) => navigate(`/users/${u.id}`);          // read-only view
  const openEdit   = (u: User) => navigate(`/users/${u.id}/edit`);

  const columns: Column<User>[] = [
    { key: 'sno', label: 'S.No', align: 'center', noHide: true, noExport: true, sticky: 'left',
      render: (_, i) => <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>{page * pageSize + i + 1}</span> },
    { key: 'username', label: 'Username', noHide: true, sticky: 'left', exportValue: r => r.username,
      render: r => <button onClick={e => { e.stopPropagation(); openRecord(r); }} className="font-mono text-xs font-medium hover:underline" style={{ color: 'var(--accent-600,#2563eb)' }}>{r.username}</button> },
    { key: 'full_name', label: 'Full Name', exportValue: r => r.full_name,
      render: r => <span className="text-xs" style={{ color: r.full_name ? 'var(--color-text-1)' : 'var(--color-text-3)' }}>{r.full_name || '—'}</span> },
    { key: 'email', label: 'Email', exportValue: r => r.email,
      render: r => <span className="text-xs">{r.email || <span style={{ color: 'var(--color-text-3)' }}>—</span>}</span> },
    { key: 'role_name', label: 'Role', exportValue: r => r.role_name ?? '',
      render: r => r.role_name ? <RoleBadge name={r.role_name} /> : <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>—</span> },
    { key: 'status', label: 'Status', align: 'center', exportValue: r => r.status, render: r => <StatusBadge status={r.status} /> },
    ...auditColumns<User>(),
    { key: 'action', label: 'Action', align: 'center', sticky: 'right', noExport: true, noHide: true,
      render: (r) => (
        <div className="flex items-center justify-center gap-1 [&_button]:w-7 [&_button]:h-7 [&_button]:p-0 [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center">
          <Tooltip label="View"><button onClick={e => { e.stopPropagation(); openRecord(r); }} className="p-1.5 rounded-lg transition" style={{ color: 'var(--color-text-3)' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-hover)'; e.currentTarget.style.color = 'var(--color-text-1)'; }} onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--color-text-3)'; }}><Eye size={14} /></button></Tooltip>
          {can('users', 'update') && <Tooltip label="Edit"><button onClick={e => { e.stopPropagation(); openEdit(r); }} className="p-1.5 rounded-lg transition" style={{ color: 'var(--accent-600,#2563eb)' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-50,#eff6ff)'; }} onMouseLeave={e => { e.currentTarget.style.background = ''; }}><Pencil size={14} /></button></Tooltip>}
          {can('users', 'delete') && <Tooltip label="Delete user"><button onClick={e => { e.stopPropagation(); setToDelete(r); }} className="p-1.5 rounded-lg transition" style={{ color: '#f87171' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-hover)'; e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#f87171'; }}><Trash2 size={14} /></button></Tooltip>}
        </div>
      ) },
  ];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUserApi(id),
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries({ queryKey: ['users'] }); setToDelete(null); },
    onError: (err: Error) => { toast.error(err.message || 'Failed to delete user'); setToDelete(null); },
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
        onRowClick={openRecord}
        searchPlaceholder="Search by username, name, email…"
        filename="Users"
        storageKey="user-master"
        filterFields={filterFields}
        filterValue={filter}
        onFilterChange={(cfg) => { setFilter(cfg); setPage(0); }}
        sortFields={sortFields}
        sortValue={sort}
        onSortChange={(s) => { setSort(s); setPage(0); }}
        serverSide={{
          total, page, pageSize,
          onPageChange:     setPage,
          onPageSizeChange: (s) => { setPageSize(s); setPage(0); },
          // Only a real change resets the page — the table replays the restored query on mount.
          onSearch:         (q) => { if (q !== search) { setSearch(q); setPage(0); } },
        }}
        headerAction={
          can('users', 'create')
            ? <Button size="sm" leftIcon={<Plus size={15} />} onClick={() => navigate('/users/new')}>Add User</Button>
            : undefined
        }
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete User?"
        message={toDelete ? `This will permanently delete the account for "${toDelete.full_name}". This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
      />
    </div>
  );
}
