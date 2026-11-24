import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Loader2, Pencil, ShieldCheck } from 'lucide-react';
import { Input, Select, Button, Field, Badge, ConfirmDialog, SplitPane } from '@/shared/components/ui';
import { createRoleSchema, MODULES, type RoleType, type RecordScope, type RolePermissionRow } from '@shared';
import {
  getRoleApi, createRoleApi, updateRoleApi, deleteRoleApi,
  getRolePermissionsApi, setRolePermissionsApi,
} from '../api/role.api';
import { PermissionGrid, fullMatrix } from '../components/PermissionGrid';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { parseRouteId } from '@/shared/lib/ids';
import { Panel, PaneGround, ReadValue, InfoRow, RecordHeader, FormFooter, IdentityAvatar, RecordInfoPane } from '@/shared/components/record/RecordParts';

export type RoleFormMode = 'create' | 'view' | 'edit';

const roleFormSchema = z.object({
  name: createRoleSchema.shape.name,
  type: z.enum(['admin', 'user']),
});
type RoleFormValues = z.infer<typeof roleFormSchema>;

const TYPE_OPTS = [
  { value: 'user',  label: 'User (governed by permissions)' },
  { value: 'admin', label: 'Admin (full access)' },
];
const typeLabel = (t?: RoleType) => (t === 'admin' ? 'Admin (full access)' : 'User (governed by permissions)');

const allTrueMatrix = (): RolePermissionRow[] =>
  MODULES.map(m => ({ module: m.key, can_read: true, can_create: true, can_update: true, can_delete: true, scope: 'all' as RecordScope }));

/** Full-width field label for the permission grid — same style as every other field label. */
function GridLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-1.5">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{children}</span>
      {hint && <span className="text-[11px] text-gray-400 dark:text-gray-500">{hint}</span>}
    </div>
  );
}

export default function RoleFormPage({ mode }: { mode: RoleFormMode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { can } = usePermissions();

  const recordId  = parseRouteId(id);
  const hasRecord = mode !== 'create';

  const [toDelete, setToDelete] = useState(false);
  const [perms, setPerms] = useState<RolePermissionRow[]>(fullMatrix([]));

  const { data: recordRes, isLoading, isError } = useQuery({
    queryKey: ['roles', recordId],
    queryFn:  () => getRoleApi(recordId!),
    enabled:  hasRecord && recordId !== null,
  });
  const record = recordRes?.data ?? null;

  const { data: permsRes } = useQuery({
    queryKey: ['roles', recordId, 'permissions'],
    queryFn:  () => getRolePermissionsApi(recordId!),
    enabled:  hasRecord && recordId !== null,
  });
  useEffect(() => { if (permsRes?.data) setPerms(fullMatrix(permsRes.data)); }, [permsRes]);

  const { register, handleSubmit, control, watch, reset, formState: { errors, isDirty: fieldsDirty } } =
    useForm<RoleFormValues>({ resolver: zodResolver(roleFormSchema), defaultValues: { name: '', type: 'user' } });

  useEffect(() => { if (record) reset({ name: record.name, type: record.type ?? 'user' }); }, [record, reset]);

  const watchedType = watch('type');
  const adminType   = watchedType === 'admin';
  const isSystem    = !!record?.is_system;
  const readOnly    = mode === 'view';

  // The permission matrix lives outside react-hook-form, so track its dirtiness separately.
  const savedPerms = useMemo(() => JSON.stringify(fullMatrix(permsRes?.data ?? [])), [permsRes]);
  const isDirty    = fieldsDirty || JSON.stringify(perms) !== savedPerms;

  const saveMutation = useMutation({
    mutationFn: async (values: RoleFormValues) => {
      const payloadPerms = values.type === 'admin' ? allTrueMatrix() : perms;
      let roleId: string;
      if (mode === 'edit') {
        if (!isSystem && fieldsDirty) await updateRoleApi(recordId!, values);  // built-in name/type are fixed
        roleId = recordId!;
      } else {
        roleId = (await createRoleApi(values)).data.id;
      }
      await setRolePermissionsApi(roleId, payloadPerms);
      return roleId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
      toast.success(mode === 'edit' ? 'Role updated' : 'Role created');
      navigate(mode === 'edit' ? `/roles/${recordId}` : '/roles');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save role'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRoleApi(recordId!),
    onSuccess: () => { toast.success('Role deleted'); qc.invalidateQueries({ queryKey: ['roles'] }); navigate('/roles'); },
    onError: (err: Error) => { toast.error(err.message || 'Failed to delete role'); setToDelete(false); },
  });

  const onSubmit = handleSubmit((values) => saveMutation.mutate(values));
  const isPending = saveMutation.isPending;

  if (hasRecord && isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" size={26} style={{ color: 'var(--accent-600)' }} /></div>;
  }
  if (hasRecord && (isError || recordId === null)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm text-gray-500">Couldn’t load this role.</p>
        <Button variant="secondary" leftIcon={<ArrowLeft size={14} />} onClick={() => navigate('/roles')}>Back to roles</Button>
      </div>
    );
  }

  const title = mode === 'create' ? 'Add Role' : (record?.name ?? 'Role');
  const subtitle = mode === 'create' ? 'Create a new role'
    : isSystem ? 'Built-in role — name and type are fixed, permissions are editable'
    : typeLabel(record?.type);

  return (
    <div className="h-full flex flex-col">
      <RecordHeader
        onBack={() => navigate('/roles')}
        avatar={<IdentityAvatar icon={<ShieldCheck size={18} />} />}
        title={title}
        subtitle={subtitle}
        badges={<>
          {record && <Badge variant={record.type === 'admin' ? 'accent' : 'neutral'} size="sm">{record.type === 'admin' ? 'Admin' : 'User'}</Badge>}
          {isSystem && <Badge variant="warning" size="sm">Built-in</Badge>}
          {mode === 'edit' && <Badge variant="accent" size="sm">Editing</Badge>}
        </>}
        actions={<>
          {hasRecord && !isSystem && can('roles', 'delete') &&
            <Button variant="danger-soft" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => setToDelete(true)}>Delete</Button>}
          {readOnly && can('roles', 'update') && record?.type !== 'admin' &&
            <Button variant="primary" size="sm" leftIcon={<Pencil size={14} />} onClick={() => navigate(`/roles/${recordId}/edit`)}>Edit</Button>}
        </>}
      />

      <div className="flex-1 min-h-0">
        <SplitPane
          storageKey="role-form"
          left={
            <PaneGround className="p-4 sm:p-6">
              {readOnly && record ? (
                /* View: same grid + field footprint as the form, values read-only */
                <div className="max-w-3xl mx-auto">
                  <Panel bodyClassName="p-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
                      <ReadValue label="Role Name">{record.name}</ReadValue>
                      <ReadValue label="Type">{typeLabel(record.type)}</ReadValue>
                    </div>
                    <div>
                      <GridLabel hint={record.type === 'admin' ? 'Admin type has full access' : undefined}>Permissions</GridLabel>
                      <PermissionGrid value={perms} onChange={() => {}} readOnly adminAll={record.type === 'admin'} />
                    </div>
                  </Panel>
                </div>
              ) : (
                /* Create / Edit: one card — name + type on one row, permissions full width below */
                <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
                    <div className="p-6 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
                        {isSystem ? (
                          <>
                            <ReadValue label="Role Name">{record?.name}</ReadValue>
                            <ReadValue label="Type">{typeLabel(record?.type)}</ReadValue>
                          </>
                        ) : (
                          <>
                            <Field label="Role Name" required error={errors.name?.message}>
                              <Input autoFocus {...register('name')} placeholder="e.g. Manager" />
                            </Field>
                            <Field label="Type" error={errors.type?.message}>
                              <Controller name="type" control={control} render={({ field }) => (
                                <Select block value={field.value} onChange={v => field.onChange(v as RoleType)} options={TYPE_OPTS} searchable={false} />
                              )} />
                            </Field>
                          </>
                        )}
                      </div>
                      <div>
                        <GridLabel hint={adminType ? 'Admin type has full access to everything' : 'Choose module access for this role'}>Permissions</GridLabel>
                        <PermissionGrid value={perms} onChange={setPerms} adminAll={adminType} />
                      </div>
                    </div>

                    <FormFooter
                      isDirty={isDirty} mode={mode === 'edit' ? 'edit' : 'create'} pending={isPending}
                      submitLabel={mode === 'edit' ? 'Save Changes' : 'Create Role'}
                      submitDisabled={(mode === 'edit' && (!isDirty || !can('roles', 'update'))) || (mode === 'create' && !can('roles', 'create'))}
                      onCancel={() => navigate(mode === 'edit' ? `/roles/${recordId}` : '/roles')}
                    />
                  </div>
                </form>
              )}
            </PaneGround>
          }
          right={
            <RecordInfoPane record={record} recordType="role">
              <InfoRow label="Type" value={record ? (record.type === 'admin' ? 'Admin' : 'User') : null} />
              <InfoRow label="Built-in" value={record ? (record.is_system ? 'Yes' : 'No') : null} />
            </RecordInfoPane>
          }
        />
      </div>

      <ConfirmDialog
        open={toDelete}
        title="Delete Role?"
        message={record ? `Delete role "${record.name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onCancel={() => setToDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
