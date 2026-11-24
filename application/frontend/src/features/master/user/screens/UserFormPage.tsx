import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Loader2, Pencil, Eye, EyeOff, UserPlus } from 'lucide-react';
import {
  Input, Select, Button, Field, Badge, ConfirmDialog, SplitPane,
} from '@/shared/components/ui';
import { createUserSchema, userStatusSchema } from '@shared';
import type { UserCreateRequest, UserUpdateRequest, UserStatus } from '@shared';
import { getUserApi, createUserApi, updateUserApi, deleteUserApi } from '../api/user.api';
import { listRolesApi } from '@/features/master/role/api/role.api';
import { Panel, PaneGround, ReadValue, InfoRow, RecordHeader, FormFooter, IdentityAvatar, RecordInfoPane } from '@/shared/components/record/RecordParts';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { parseRouteId } from '@/shared/lib/ids';

export type UserFormMode = 'create' | 'view' | 'edit';

/* Reuse shared field rules; password may be blank on edit (= keep current). */
const userFormSchema = z.object({
  username:  createUserSchema.shape.username,
  full_name: createUserSchema.shape.full_name,
  email:     createUserSchema.shape.email,
  password:  z.union([z.string().min(6, 'Password must be at least 6 characters'), z.literal('')]),
  status:    userStatusSchema,
  role_id:   z.uuid().nullable(),
});
type UserFormValues = z.infer<typeof userFormSchema>;
const EMPTY: UserFormValues = { username: '', full_name: '', email: '', password: '', status: 'active', role_id: null };

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? 'text' : 'password'} className="pr-10" />
      <button type="button" tabIndex={-1} onClick={() => setShow(v => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 w-10 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

export default function UserFormPage({ mode }: { mode: UserFormMode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { can } = usePermissions();

  const recordId  = parseRouteId(id);
  const hasRecord = mode !== 'create';   // view + edit load a record
  const readOnly  = mode === 'view';

  const [toDelete, setToDelete] = useState(false);

  const { data: rolesData } = useQuery({ queryKey: ['roles', 'all'], queryFn: () => listRolesApi({ limit: 100 }), staleTime: 60_000 });
  const roleOptions = (rolesData?.data ?? []).map(r => ({ value: r.id, label: r.name }));

  const { data: recordRes, isLoading, isError } = useQuery({
    queryKey: ['users', recordId],
    queryFn:  () => getUserApi(recordId!),
    enabled:  hasRecord && recordId !== null,
  });
  const record = recordRes?.data ?? null;

  const { register, handleSubmit, control, reset, setError, formState: { errors, isDirty } } =
    useForm<UserFormValues>({ resolver: zodResolver(userFormSchema), defaultValues: EMPTY });

  // Seed the form once the record loads (view / edit).
  useEffect(() => {
    if (record) reset({ username: record.username, full_name: record.full_name, email: record.email, password: '', status: record.status, role_id: record.role_id });
  }, [record, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: UserFormValues) => {
      if (mode === 'edit') {
        const body: UserUpdateRequest = { username: values.username, full_name: values.full_name, email: values.email, status: values.status, role_id: values.role_id };
        if (values.password) body.password = values.password;
        return updateUserApi(recordId!, body);
      }
      const body: UserCreateRequest = { username: values.username, password: values.password, full_name: values.full_name, email: values.email, status: values.status, role_id: values.role_id };
      return createUserApi(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['audit'] });   // refresh the Activity pane
      toast.success(mode === 'edit' ? 'User updated' : 'User created');
      // Create → back to the list; edit → back to this record's view.
      navigate(mode === 'edit' ? `/users/${recordId}` : '/users');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save user'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteUserApi(recordId!),
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries({ queryKey: ['users'] }); navigate('/users'); },
    onError: (err: Error) => { toast.error(err.message || 'Failed to delete user'); setToDelete(false); },
  });

  const onSubmit = handleSubmit((values) => {
    if (mode === 'create' && !values.password) { setError('password', { message: 'Password is required' }); return; }
    saveMutation.mutate(values);
  });

  const isPending = saveMutation.isPending;

  if (hasRecord && isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" size={26} style={{ color: 'var(--accent-600)' }} /></div>;
  }
  if (hasRecord && (isError || recordId === null)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm text-gray-500">Couldn’t load this user.</p>
        <Button variant="secondary" leftIcon={<ArrowLeft size={14} />} onClick={() => navigate('/users')}>Back to users</Button>
      </div>
    );
  }

  const title = mode === 'create' ? 'Add User' : (record?.full_name ?? (readOnly ? 'User' : 'Edit User'));
  const subtitle = mode === 'create' ? 'Create a new user account'
    : record ? [`@${record.username}`, record.role_name, record.email].filter(Boolean).join(' · ') : '';

  return (
    <div className="h-full flex flex-col">
      <RecordHeader
        onBack={() => navigate('/users')}
        avatar={<IdentityAvatar name={mode === 'create' ? undefined : record?.full_name} icon={<UserPlus size={18} />} />}
        title={title}
        subtitle={subtitle}
        badges={<>
          {record && <Badge variant={record.status === 'active' ? 'success' : 'neutral'} size="sm">{record.status === 'active' ? 'Active' : 'Inactive'}</Badge>}
          {mode === 'edit' && <Badge variant="accent" size="sm">Editing</Badge>}
        </>}
        actions={<>
          {hasRecord && can('users', 'delete') && (
            <Button variant="danger-soft" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => setToDelete(true)}>Delete</Button>
          )}
          {readOnly && can('users', 'update') && (
            <Button variant="primary" size="sm" leftIcon={<Pencil size={14} />} onClick={() => navigate(`/users/${recordId}/edit`)}>Edit</Button>
          )}
        </>}
      />

      {/* Split body */}
      <div className="flex-1 min-h-0">
        <SplitPane
          storageKey="user-form"
          left={
            <PaneGround className="p-4 sm:p-6">
              {readOnly && record ? (
                /* View: same grid + field footprint as the form, values read-only */
                <div className="max-w-3xl mx-auto">
                  <Panel bodyClassName="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
                      <ReadValue label="Full Name">{record.full_name}</ReadValue>
                      <ReadValue label="Username"><span className="font-mono">{record.username}</span></ReadValue>
                      <ReadValue label="Email">{record.email}</ReadValue>
                      <ReadValue label="Password" muted>••••••••</ReadValue>
                      <ReadValue label="Role">{record.role_name}</ReadValue>
                      <ReadValue label="Status">
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${record.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {record.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </ReadValue>
                    </div>
                  </Panel>
                </div>
              ) : (
                /* Create / Edit: one card — a single 2-column grid, every control full-width
                   in its cell at the same 42px height; actions in the card footer. */
                <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
                      <Field label="Full Name" required error={errors.full_name?.message}>
                        <Input autoFocus {...register('full_name')} placeholder="John Doe" />
                      </Field>
                      <Field label="Username" required error={errors.username?.message}>
                        <Input {...register('username')} placeholder="jdoe" autoComplete="off" />
                      </Field>
                      <Field label="Email" required error={errors.email?.message}>
                        <Input type="email" {...register('email')} placeholder="john@example.com" />
                      </Field>
                      <Field label={mode === 'edit' ? 'New Password' : 'Password'} required={mode === 'create'} error={errors.password?.message}
                        hint={mode === 'edit' ? 'Leave blank to keep the current password' : 'Minimum 6 characters'}>
                        <PasswordInput autoComplete="new-password" {...register('password')} placeholder="••••••••" />
                      </Field>
                      <Field label="Role" error={errors.role_id?.message}>
                        <Controller name="role_id" control={control} render={({ field }) => (
                          <Select block value={field.value ?? ''} onChange={v => field.onChange(v === '' ? null : String(v))} options={roleOptions} placeholder="Select a role" />
                        )} />
                      </Field>
                      <Field label="Status" error={errors.status?.message}>
                        <Controller name="status" control={control} render={({ field }) => (
                          <Select block value={field.value} onChange={v => field.onChange(v as UserStatus)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                        )} />
                      </Field>
                    </div>

                    <FormFooter
                      isDirty={isDirty} mode={mode === 'edit' ? 'edit' : 'create'} pending={isPending}
                      submitLabel={mode === 'edit' ? 'Save Changes' : 'Create User'}
                      submitDisabled={(mode === 'edit' && (!isDirty || !can('users', 'update'))) || (mode === 'create' && !can('users', 'create'))}
                      onCancel={() => navigate(mode === 'edit' ? `/users/${recordId}` : '/users')}
                    />
                  </div>
                </form>
              )}
            </PaneGround>
          }
          right={
            <RecordInfoPane record={record} recordType="user">
              <InfoRow label="Role" value={record?.role_name} />
            </RecordInfoPane>
          }
        />
      </div>

      <ConfirmDialog
        open={toDelete}
        title="Delete User?"
        message={record ? `This will permanently delete the account for "${record.full_name}". This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onCancel={() => setToDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
