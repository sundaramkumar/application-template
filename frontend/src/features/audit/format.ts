import { summarizePermissions, type RolePermissionRow } from '@shared';

const FIELD_LABELS: Record<string, string> = {
  username:    'Username',
  full_name:   'Full name',
  email:       'Email',
  status:      'Status',
  role_name:   'Role',
  name:        'Name',
  type:        'Type',
  is_system:   'Built-in',
  permissions: 'Permissions',
};

/** Human label for an audited field key (e.g. full_name → "Full name"). */
export function fmtField(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

/** Render an audit change value for display — never "[object Object]". New rows
    store readable strings; legacy rows may hold raw permission arrays, which we
    humanize here too. */
export function fmtChangeValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return summarizePermissions(v as RolePermissionRow[]);
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch { return '—'; }
  }
  return String(v);
}
