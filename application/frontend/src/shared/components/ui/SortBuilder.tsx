import { useState, Fragment } from 'react';
import { ArrowDownUp, ArrowUp, ArrowDown, Plus, X } from 'lucide-react';
import { Select, type SelectOption } from './Select';
import { Tooltip } from './Tooltip';
import { Popover } from './Popover';

export interface SortFieldDef { key: string; label: string }
export type SortDir = 'asc' | 'desc';
export interface SortRule { field: string; dir: SortDir }

const DIR_OPTS: SelectOption[] = [
  { value: 'asc',  label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

export function emptySort(): SortRule[] { return []; }
export function countSorts(v?: SortRule[]): number { return v?.length ?? 0; }

/** Encode for the API `sort` param: `field:dir,field:dir`. */
export function encodeSort(v?: SortRule[]): string | undefined {
  if (!v || !v.length) return undefined;
  return v.map(r => `${r.field}:${r.dir}`).join(',');
}

function clone(v: SortRule[]): SortRule[] { return v.map(r => ({ ...r })); }
function clean(v: SortRule[]): SortRule[] {
  const seen = new Set<string>();
  return v.filter(r => r.field && !seen.has(r.field) && seen.add(r.field));
}

/* ─── SortControl: toolbar button + popover builder ──────────────── */
export function SortControl({ fields, value, onChange }: {
  fields:   SortFieldDef[];
  value:    SortRule[];
  onChange: (v: SortRule[]) => void;
}) {
  const [draft, setDraft] = useState<SortRule[]>(value);
  const activeCount = countSorts(value);

  function seed() {
    setDraft(value.length ? clone(value) : [{ field: fields[0]?.key ?? '', dir: 'asc' }]);
  }

  const patch = (i: number, p: Partial<SortRule>) =>
    setDraft(d => d.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const addRow    = () => setDraft(d => [...d, { field: fields[0]?.key ?? '', dir: 'asc' }]);
  const removeRow = (i: number) => setDraft(d => d.filter((_, j) => j !== i));

  function apply(close: () => void)    { onChange(clean(draft)); close(); }
  function clearAll(close: () => void) { onChange(emptySort()); setDraft([{ field: fields[0]?.key ?? '', dir: 'asc' }]); close(); }

  return (
    <Popover
      align="right"
      width={420}
      className="max-w-[calc(100vw-2rem)] flex flex-col"
      onOpenChange={(o) => { if (o) seed(); }}
      trigger={
        <Tooltip label="Sort">
          <button
            className={`relative h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg border text-sm font-medium transition
              ${activeCount > 0
                ? 'text-white border-transparent'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
            style={activeCount > 0 ? { background: 'var(--accent-600,#2563eb)' } : undefined}
          >
            <ArrowDownUp size={14} />
            <span className="hidden sm:inline">Sort</span>
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
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <ArrowDownUp size={14} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Sort by</span>
            </div>
            <span className="text-[11px] text-gray-400">{draft.filter(r => r.field).length} rule(s)</span>
          </div>

          <div className="px-4 py-3 overflow-y-auto" style={{ maxHeight: '60vh' }}>
            {draft.length === 0 && (
              <p className="text-xs text-gray-400 py-4 text-center">No sorting. Add a rule below.</p>
            )}
            <div className="space-y-1.5">
              {draft.map((rule, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-400 w-9 flex-shrink-0">{i === 0 ? 'Sort' : 'then'}</span>
                  <div className="flex-1 min-w-0">
                    <Select
                      value={rule.field}
                      onChange={(v) => patch(i, { field: String(v) })}
                      options={fields.map(f => ({ value: f.key, label: f.label }))}
                      size="sm"
                    />
                  </div>
                  <div className="w-[36%]">
                    <Select
                      value={rule.dir}
                      onChange={(v) => patch(i, { dir: v as SortDir })}
                      options={DIR_OPTS}
                      size="sm"
                      searchable={false}
                    />
                  </div>
                  <button
                    onClick={() => removeRow(i)}
                    className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addRow}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <Plus size={13} /> Add sort
            </button>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <button onClick={() => clearAll(close)} className="text-xs font-medium text-gray-500 hover:text-red-500 transition">Clear all</button>
            <div className="flex items-center gap-2">
              <button onClick={close} className="px-3 h-8 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">Cancel</button>
              <button onClick={() => apply(close)} className="px-3 h-8 rounded-lg text-sm font-semibold text-white transition" style={{ background: 'var(--accent-600,#2563eb)' }}>Apply sort</button>
            </div>
          </div>
        </>
      )}
    </Popover>
  );
}

/* ─── SortChips: active sort summary under the toolbar ───────────── */
export function SortChips({ fields, value, onChange }: {
  fields:   SortFieldDef[];
  value:    SortRule[];
  onChange: (v: SortRule[]) => void;
}) {
  if (!value.length) return null;
  const label = (key: string) => fields.find(f => f.key === key)?.label ?? key;
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sort</span>
      {value.map((r, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-[10px] font-bold uppercase text-gray-400">then</span>}
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md"
            style={{ background: 'color-mix(in srgb, var(--accent-600,#2563eb) 10%, transparent)', color: 'var(--accent-700,#1d4ed8)' }}
          >
            {label(r.field)}
            {r.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            <button onClick={() => remove(i)} className="hover:text-red-500 transition"><X size={11} /></button>
          </span>
        </Fragment>
      ))}
      <button onClick={() => onChange(emptySort())} className="text-[11px] font-medium text-gray-500 hover:text-red-500 transition ml-0.5">Clear all</button>
    </div>
  );
}
