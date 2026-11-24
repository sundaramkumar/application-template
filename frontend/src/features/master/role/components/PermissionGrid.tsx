import { Checkbox, Select } from '@/shared/components/ui';
import { MODULES, type RolePermissionRow, type RecordScope } from '@shared';

const SCOPE_OPTS = [
  { value: 'own',  label: 'Own' },
  { value: 'role', label: 'Role team' },
  { value: 'all',  label: 'All' },
];

type Field = 'can_read' | 'can_create' | 'can_update' | 'can_delete';
const COLS: { field: Field; label: string }[] = [
  { field: 'can_read',   label: 'Read' },
  { field: 'can_create', label: 'Create' },
  { field: 'can_update', label: 'Update' },
  { field: 'can_delete', label: 'Delete' },
];
const GRID = '1.6fr repeat(4, 60px) 120px';

function blankRow(module: string): RolePermissionRow {
  return { module, can_read: false, can_create: false, can_update: false, can_delete: false, scope: 'own' };
}

/** Build a full matrix (one row per module) from the stored subset. */
export function fullMatrix(rows: RolePermissionRow[]): RolePermissionRow[] {
  const byModule = new Map(rows.map(r => [r.module, r]));
  return MODULES.map(m => byModule.get(m.key) ?? blankRow(m.key));
}

export function PermissionGrid({ value, onChange, readOnly = false, adminAll = false }: {
  value:     RolePermissionRow[];
  onChange:  (v: RolePermissionRow[]) => void;
  readOnly?: boolean;
  adminAll?: boolean;   // admin role type → everything granted, locked
}) {
  const byModule = new Map(value.map(r => [r.module, r]));
  const rowFor = (key: string) => byModule.get(key) ?? blankRow(key);
  const disabled = readOnly || adminAll;
  const rows = MODULES.map(m => rowFor(m.key));

  const isOn = (r: RolePermissionRow, f: Field) => (adminAll ? true : !!r[f]);

  /* ── tri-state helpers ── */
  const colState = (f: Field) => {
    const on = rows.filter(r => isOn(r, f)).length;
    return { checked: on === rows.length && on > 0, indeterminate: on > 0 && on < rows.length };
  };
  const rowState = (r: RolePermissionRow) => {
    const on = COLS.filter(c => isOn(r, c.field)).length;
    return { checked: on === COLS.length, indeterminate: on > 0 && on < COLS.length };
  };
  const allState = () => {
    const total = rows.length * COLS.length;
    const on = rows.reduce((n, r) => n + COLS.filter(c => isOn(r, c.field)).length, 0);
    return { checked: on === total && total > 0, indeterminate: on > 0 && on < total };
  };

  /* ── mutators ── */
  const setRow  = (key: string, patch: Partial<RolePermissionRow>) =>
    onChange(MODULES.map(m => (m.key === key ? { ...rowFor(m.key), ...patch } : rowFor(m.key))));
  const setCol  = (f: Field, val: boolean) =>
    onChange(MODULES.map(m => ({ ...rowFor(m.key), [f]: val })));
  const setRowAll = (key: string, val: boolean) =>
    setRow(key, { can_read: val, can_create: val, can_update: val, can_delete: val });
  const setAll  = (val: boolean) =>
    onChange(MODULES.map(m => ({ ...rowFor(m.key), can_read: val, can_create: val, can_update: val, can_delete: val })));

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header — column select-all */}
      <div className="grid items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/60" style={{ gridTemplateColumns: GRID }}>
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <Checkbox {...allState()} disabled={disabled} onChange={setAll} /> Module
        </span>
        {COLS.map(c => (
          <span key={c.field} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{c.label}</span>
            <Checkbox {...colState(c.field)} disabled={disabled} onChange={(v) => setCol(c.field, v)} />
          </span>
        ))}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Scope</span>
      </div>

      {/* Rows — per-row select-all in the Module cell */}
      {MODULES.map(m => {
        const row = rowFor(m.key);
        return (
          <div key={m.key} className="grid items-center gap-2 px-3 py-2.5 border-t border-gray-100 dark:border-gray-800" style={{ gridTemplateColumns: GRID }}>
            <span className="flex items-center gap-2">
              <Checkbox {...rowState(row)} disabled={disabled} onChange={(v) => setRowAll(m.key, v)} />
              <span className="text-sm text-gray-700 dark:text-gray-200">{m.label}</span>
            </span>
            {COLS.map(c => (
              <span key={c.field} className="flex justify-center">
                <Checkbox checked={isOn(row, c.field)} disabled={disabled} onChange={(v) => setRow(m.key, { [c.field]: v })} />
              </span>
            ))}
            {m.ownable ? (
              <Select value={adminAll ? 'all' : row.scope} onChange={(v) => setRow(m.key, { scope: v as RecordScope })} options={SCOPE_OPTS} size="sm" block disabled={disabled} searchable={false} />
            ) : (
              <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
