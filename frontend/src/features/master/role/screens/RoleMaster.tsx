import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { DataTable, ConfirmDialog, Tooltip, Button, Badge, emptyFilterConfig, emptySort, type Column, type FilterFieldDef, type SortFieldDef, type SortRule } from '@/shared/components/ui';
import type { Role, FilterConfig } from '@shared';
import { listRolesApi, deleteRoleApi } from '../api/role.api';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { auditColumns, AUDIT_SORT_FIELDS, AUDIT_FILTER_FIELDS } from '@/shared/components/record/auditColumns';
import { usePersistedState, useClampPage, isNonNegInt, isOneOf, isFilterConfig, isSortRules } from '@/shared/hooks/usePersistedState';

export default function RoleMaster() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [page, setPage]         = usePersistedState('role-master', 'page', 0, isNonNegInt);
  const [pageSize, setPageSize] = usePersistedState('role-master', 'page-size', 25, isOneOf([25, 50, 100]));
  const [search, setSearch]     = usePersistedState('role-master', 'query', '');
  const [filter, setFilter]     = usePersistedState<FilterConfig>('role-master', 'filter', emptyFilterConfig(), isFilterConfig);
  const [sort, setSort]         = usePersistedState<SortRule[]>('role-master', 'sort', emptySort(), isSortRules);
  const [toDelete, setToDelete] = useState<Role | null>(null);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['roles', page, pageSize, search, filter, sort],
    queryFn:  () => listRolesApi({ page: page + 1, limit: pageSize, search, filter, sort }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  const rows  = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  useClampPage(page, data?.meta.totalPages, setPage);

  const filterFields: FilterFieldDef[] = [
    { key: 'name', label: 'Role Name', type: 'text' },
    { key: 'type', label: 'Type',      type: 'select', options: [{ value: 'admin', label: 'Admin' }, { value: 'user', label: 'User' }] },
    ...AUDIT_FILTER_FIELDS,
  ];
  const sortFields: SortFieldDef[] = [
    { key: 'name', label: 'Role Name' },
    { key: 'type', label: 'Type' },
    ...AUDIT_SORT_FIELDS,
  ];

  const openRecord = (r: Role) => navigate(`/roles/${r.id}`);          // read-only view
  const openEdit   = (r: Role) => navigate(`/roles/${r.id}/edit`);

  const columns: Column<Role>[] = [
    { key: 'sno', label: 'S.No', align: 'center', noHide: true, noExport: true, sticky: 'left',
      render: (_, i) => <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>{page * pageSize + i + 1}</span> },
    { key: 'name', label: 'Role Name', noHide: true, exportValue: r => r.name,
      render: r => <button onClick={e => { e.stopPropagation(); openRecord(r); }} className="text-xs font-medium hover:underline" style={{ color: 'var(--accent-600,#2563eb)' }}>{r.name}</button> },
    { key: 'type', label: 'Type', exportValue: r => (r.type === 'admin' ? 'Admin' : 'User'),
      render: r => (
        <span className="flex items-center gap-1.5">
          <Badge variant={r.type === 'admin' ? 'accent' : 'neutral'}>{r.type === 'admin' ? 'Admin' : 'User'}</Badge>
          {r.is_system && <Badge variant="warning" size="sm">Built-in</Badge>}
        </span>
      ) },
    ...auditColumns<Role>(),
    { key: 'action', label: 'Action', align: 'center', sticky: 'right', noExport: true, noHide: true,
      render: r => (
        <div className="flex items-center justify-center gap-1 [&_button]:w-7 [&_button]:h-7 [&_button]:p-0 [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center">
          <Tooltip label="View"><button onClick={e => { e.stopPropagation(); openRecord(r); }} className="p-1.5 rounded-lg transition" style={{ color: 'var(--color-text-3)' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-hover)'; e.currentTarget.style.color = 'var(--color-text-1)'; }} onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--color-text-3)'; }}><Eye size={14} /></button></Tooltip>
          {can('roles', 'update') && <Tooltip label="Edit"><button onClick={e => { e.stopPropagation(); openEdit(r); }} className="p-1.5 rounded-lg transition" style={{ color: 'var(--accent-600,#2563eb)' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-50,#eff6ff)'; }} onMouseLeave={e => { e.currentTarget.style.background = ''; }}><Pencil size={14} /></button></Tooltip>}
          {can('roles', 'delete') && <Tooltip label="Delete role"><button onClick={e => { e.stopPropagation(); setToDelete(r); }} className="p-1.5 rounded-lg transition" style={{ color: '#f87171' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-hover)'; e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#f87171'; }}><Trash2 size={14} /></button></Tooltip>}
        </div>
      ) },
  ];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRoleApi(id),
    onSuccess: () => { toast.success('Role deleted'); qc.invalidateQueries({ queryKey: ['roles'] }); setToDelete(null); },
    onError: (err: Error) => { toast.error(err.message || 'Failed to delete role'); setToDelete(null); },
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
        searchPlaceholder="Search roles…"
        filename="Roles"
        storageKey="role-master"
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
          onSearch:         (q) => { if (q !== search) { setSearch(q); setPage(0); } },
        }}
        headerAction={
          can('roles', 'create')
            ? <Button size="sm" leftIcon={<Plus size={15} />} onClick={() => navigate('/roles/new')}>Add Role</Button>
            : undefined
        }
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete Role?"
        message={toDelete ? `Delete role "${toDelete.name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
      />
    </div>
  );
}
