import { Fragment, useState } from 'react';
import { Filter, Plus, X, Trash2 } from 'lucide-react';
import { Select, type SelectOption } from './Select';
import { Tooltip } from './Tooltip';
import { Popover } from './Popover';
import type { FilterConfig, FilterGroup, FilterParam, FilterOperator } from '@shared';

/* ─── Field definitions (per table) ──────────────────────────────── */
export type FilterFieldType = 'text' | 'number' | 'select' | 'date';

export interface FilterFieldDef {
  /** Must match the backend whitelist key */
  key:      string;
  label:    string;
  type:     FilterFieldType;
  /** Options for `select` fields */
  options?: SelectOption[];
}

/* ─── Operators ──────────────────────────────────────────────────── */
const OP_LABELS: Record<FilterOperator, string> = {
  eq: 'is', neq: 'is not',
  contains: 'contains', starts_with: 'starts with', ends_with: 'ends with',
  gt: 'greater than', gte: 'greater or equal', lt: 'less than', lte: 'less or equal',
  is_empty: 'is empty', not_empty: 'is not empty',
};
const DATE_OP_LABELS: Partial<Record<FilterOperator, string>> = {
  eq: 'on', neq: 'not on', gt: 'after', gte: 'on or after', lt: 'before', lte: 'on or before',
};
const OPS_BY_TYPE: Record<FilterFieldType, FilterOperator[]> = {
  text:   ['contains', 'eq', 'neq', 'starts_with', 'ends_with', 'is_empty', 'not_empty'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'is_empty', 'not_empty'],
  select: ['eq', 'neq', 'is_empty', 'not_empty'],
  date:   ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'is_empty', 'not_empty'],
};

function opLabel(type: FilterFieldType, op: FilterOperator): string {
  return type === 'date' ? (DATE_OP_LABELS[op] ?? OP_LABELS[op]) : OP_LABELS[op];
}
function needsValue(op: FilterOperator): boolean {
  return op !== 'is_empty' && op !== 'not_empty';
}

/* ─── Helpers (exported for screens / DataTable) ─────────────────── */
let _id = 0;
function uid() { return `f${++_id}_${Date.now().toString(36)}`; }

export function emptyFilterConfig(): FilterConfig { return { groupLogic: 'and', groups: [] }; }

export function countActiveConditions(cfg?: FilterConfig): number {
  if (!cfg) return 0;
  let n = 0;
  for (const g of cfg.groups)
    for (const c of g.conditions)
      if (c.field && (!needsValue(c.op) || (c.value !== undefined && c.value !== ''))) n++;
  return n;
}

function newCondition(fields: FilterFieldDef[]): FilterParam {
  const f = fields[0];
  return { field: f?.key ?? '', op: OPS_BY_TYPE[f?.type ?? 'text'][0], value: '' };
}
function newGroup(fields: FilterFieldDef[]): FilterGroup {
  return { id: uid(), logic: 'and', conditions: [newCondition(fields)] };
}
function clone(cfg: FilterConfig): FilterConfig {
  return JSON.parse(JSON.stringify(cfg)) as FilterConfig;
}

/** Drop incomplete conditions / empty groups, strip values from value-less ops. */
function clean(cfg: FilterConfig): FilterConfig {
  const groups = cfg.groups
    .map((g) => ({
      ...g,
      conditions: g.conditions
        .filter((c) => c.field && (!needsValue(c.op) || (c.value !== undefined && c.value !== '')))
        .map((c) => (needsValue(c.op) ? c : { field: c.field, op: c.op })),
    }))
    .filter((g) => g.conditions.length > 0);
  return { groupLogic: cfg.groupLogic, groups };
}

const LOGIC_OPTS: SelectOption[] = [{ value: 'and', label: 'AND' }, { value: 'or', label: 'OR' }];

/* ─── FilterControl: toolbar button + popover builder ────────────── */
export function FilterControl({ fields, value, onChange }: {
  fields:   FilterFieldDef[];
  value:    FilterConfig;
  onChange: (c: FilterConfig) => void;
}) {
  const [draft, setDraft] = useState<FilterConfig>(value);
  const activeCount = countActiveConditions(value);

  // Seed the draft from the applied value whenever the panel opens.
  function seedDraft() {
    setDraft(value.groups.length ? clone(value) : { groupLogic: 'and', groups: [newGroup(fields)] });
  }

  /* ── Immutable updaters ── */
  const patchCond = (gi: number, ci: number, patch: Partial<FilterParam>) =>
    setDraft((d) => ({ ...d, groups: d.groups.map((g, i) => i === gi
      ? { ...g, conditions: g.conditions.map((c, j) => (j === ci ? { ...c, ...patch } : c)) } : g) }));
  const addCond = (gi: number) =>
    setDraft((d) => ({ ...d, groups: d.groups.map((g, i) => i === gi
      ? { ...g, conditions: [...g.conditions, newCondition(fields)] } : g) }));
  const removeCond = (gi: number, ci: number) =>
    setDraft((d) => ({ ...d, groups: d.groups
      .map((g, i) => (i === gi ? { ...g, conditions: g.conditions.filter((_, j) => j !== ci) } : g))
      .filter((g) => g.conditions.length > 0) }));
  const setGroupLogic = (gi: number, logic: 'and' | 'or') =>
    setDraft((d) => ({ ...d, groups: d.groups.map((g, i) => (i === gi ? { ...g, logic } : g)) }));
  const addGroup    = () => setDraft((d) => ({ ...d, groups: [...d.groups, newGroup(fields)] }));
  const removeGroup = (gi: number) => setDraft((d) => ({ ...d, groups: d.groups.filter((_, i) => i !== gi) }));

  function changeField(gi: number, ci: number, key: string) {
    const f = fields.find((x) => x.key === key);
    patchCond(gi, ci, { field: key, op: OPS_BY_TYPE[f?.type ?? 'text'][0], value: '' });
  }
  function changeOp(gi: number, ci: number, op: FilterOperator, prev: string | number | undefined) {
    patchCond(gi, ci, { op, value: needsValue(op) ? (prev ?? '') : '' });
  }

  function apply(close: () => void)    { onChange(clean(draft)); close(); }
  function clearAll(close: () => void) { onChange(emptyFilterConfig()); setDraft({ groupLogic: 'and', groups: [newGroup(fields)] }); close(); }

  return (
    <Popover
      align="right"
      width={520}
      className="max-w-[calc(100vw-2rem)] flex flex-col"
      onOpenChange={(o) => { if (o) seedDraft(); }}
      trigger={
        <Tooltip label="Advanced filters">
          <button
            className={`relative h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg border text-sm font-medium transition
              ${activeCount > 0
                ? 'text-white border-transparent'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
            style={activeCount > 0 ? { background: 'var(--accent-600,#2563eb)' } : undefined}
          >
            <Filter size={14} />
            <span className="hidden sm:inline">Filter</span>
            {activeCount > 0 && (
              <span className="text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center bg-white/25">
                {activeCount}
              </span>
            )}
          </button>
        </Tooltip>
      }
    >
      {(close) => (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Advanced Filters</span>
            </div>
            <span className="text-[11px] text-gray-400">{countActiveConditions(draft)} condition(s)</span>
          </div>

          {/* Body */}
          <div className="px-4 py-3 overflow-y-auto" style={{ maxHeight: '60vh' }}>
            {draft.groups.length === 0 && (
              <p className="text-xs text-gray-400 py-6 text-center">No conditions. Add a group to start filtering.</p>
            )}

            {draft.groups.map((group, gi) => (
              <Fragment key={group.id}>
                {gi > 0 && (
                  <div className="flex items-center gap-2 my-2 pl-1">
                    <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                    <Select
                      value={draft.groupLogic}
                      onChange={(v) => setDraft((d) => ({ ...d, groupLogic: v as 'and' | 'or' }))}
                      options={LOGIC_OPTS}
                      size="sm"
                      searchable={false}
                    />
                    <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                  </div>
                )}

                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2.5">
                  {/* Group header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                      <span>Match</span>
                      <Select
                        value={group.logic}
                        onChange={(v) => setGroupLogic(gi, v as 'and' | 'or')}
                        options={LOGIC_OPTS}
                        size="sm"
                        searchable={false}
                      />
                      <span>of</span>
                    </div>
                    <Tooltip label="Remove group">
                      <button onClick={() => removeGroup(gi)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <Trash2 size={13} />
                      </button>
                    </Tooltip>
                  </div>

                  {/* Conditions */}
                  <div className="space-y-1.5">
                    {group.conditions.map((cond, ci) => {
                      const field = fields.find((f) => f.key === cond.field) ?? fields[0];
                      const ftype = field?.type ?? 'text';
                      return (
                        <div key={ci} className="flex items-center gap-1.5">
                          <div className="w-[34%]">
                            <Select
                              value={cond.field}
                              onChange={(v) => changeField(gi, ci, String(v))}
                              options={fields.map((f) => ({ value: f.key, label: f.label }))}
                              size="sm"
                            />
                          </div>
                          <div className="w-[28%]">
                            <Select
                              value={cond.op}
                              onChange={(v) => changeOp(gi, ci, v as FilterOperator, cond.value)}
                              options={OPS_BY_TYPE[ftype].map((op) => ({ value: op, label: opLabel(ftype, op) }))}
                              size="sm"
                              searchable={false}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            {needsValue(cond.op) && (
                              ftype === 'select' ? (
                                <Select
                                  value={cond.value ?? ''}
                                  onChange={(v) => patchCond(gi, ci, { value: v })}
                                  options={field?.options ?? []}
                                  size="sm"
                                  placeholder="Select…"
                                />
                              ) : (
                                <input
                                  type={ftype === 'number' ? 'number' : ftype === 'date' ? 'date' : 'text'}
                                  value={cond.value ?? ''}
                                  onChange={(e) => patchCond(gi, ci, {
                                    value: ftype === 'number'
                                      ? (e.target.value === '' ? '' : Number(e.target.value))
                                      : e.target.value,
                                  })}
                                  placeholder="Value…"
                                  className="w-full px-2.5 h-8 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                              )
                            )}
                          </div>
                          <button
                            onClick={() => removeCond(gi, ci)}
                            disabled={group.conditions.length === 1}
                            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition flex-shrink-0"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => addCond(gi)}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium transition"
                    style={{ color: 'var(--accent-600,#2563eb)' }}
                  >
                    <Plus size={12} /> Add condition
                  </button>
                </div>
              </Fragment>
            ))}

            <button
              onClick={addGroup}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <Plus size={13} /> Add group
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <button onClick={() => clearAll(close)} className="text-xs font-medium text-gray-500 hover:text-red-500 transition">
              Clear all
            </button>
            <div className="flex items-center gap-2">
              <button onClick={close} className="px-3 h-8 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                Cancel
              </button>
              <button onClick={() => apply(close)} className="px-3 h-8 rounded-lg text-sm font-semibold text-white transition" style={{ background: 'var(--accent-600,#2563eb)' }}>
                Apply filters
              </button>
            </div>
          </div>
        </>
      )}
    </Popover>
  );
}

/* ─── FilterChips: active filter summary under the toolbar ───────── */
export function FilterChips({ fields, value, onChange }: {
  fields:   FilterFieldDef[];
  value:    FilterConfig;
  onChange: (c: FilterConfig) => void;
}) {
  if (!value.groups.length) return null;

  function removeCondition(gi: number, ci: number) {
    const groups = value.groups
      .map((g, i) => (i === gi ? { ...g, conditions: g.conditions.filter((_, j) => j !== ci) } : g))
      .filter((g) => g.conditions.length > 0);
    onChange({ groupLogic: value.groupLogic, groups });
  }

  function condLabel(c: FilterParam): string {
    const field = fields.find((f) => f.key === c.field);
    const label = field?.label ?? c.field;
    const op    = opLabel(field?.type ?? 'text', c.op);
    if (!needsValue(c.op)) return `${label} ${op}`;
    let val = c.value;
    if (field?.type === 'select') val = field.options?.find((o) => o.value === c.value)?.label ?? c.value;
    return `${label} ${op} ${val}`;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Filters</span>
      {value.groups.map((group, gi) => (
        <Fragment key={group.id}>
          {gi > 0 && (
            <span className="text-[10px] font-bold uppercase px-1 text-gray-400">{value.groupLogic}</span>
          )}
          <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-1 py-0.5">
            {group.conditions.map((cond, ci) => (
              <Fragment key={ci}>
                {ci > 0 && (
                  <span className="text-[9px] font-bold uppercase text-gray-400">{group.logic}</span>
                )}
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md"
                  style={{ background: 'color-mix(in srgb, var(--accent-600,#2563eb) 10%, transparent)', color: 'var(--accent-700,#1d4ed8)' }}
                >
                  {condLabel(cond)}
                  <button onClick={() => removeCondition(gi, ci)} className="hover:text-red-500 transition">
                    <X size={11} />
                  </button>
                </span>
              </Fragment>
            ))}
          </span>
        </Fragment>
      ))}
      <button
        onClick={() => onChange(emptyFilterConfig())}
        className="text-[11px] font-medium text-gray-500 hover:text-red-500 transition ml-0.5"
      >
        Clear all
      </button>
    </div>
  );
}
