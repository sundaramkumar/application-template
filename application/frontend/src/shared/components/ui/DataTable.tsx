import { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Download, RefreshCw, Settings2, Loader2,
  Search, X, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, AlertCircle, Inbox, GripVertical,
  Check, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Select }        from './Select';
import { ConfirmDialog } from './ConfirmDialog';
import { Tooltip }       from './Tooltip';
import { FilterControl, FilterChips, countActiveConditions, type FilterFieldDef } from './FilterBuilder';
import { SortControl, SortChips, countSorts, type SortFieldDef, type SortRule } from './SortBuilder';
import { Popover } from './Popover';
import type { FilterConfig } from '@shared';

/* ─── Types ──────────────────────────────────────────────────────── */
export interface Column<T> {
  key:            string;
  label:          string;
  render:         (row: T, index: number) => React.ReactNode;
  sortValue?:     (row: T) => string | number | null | undefined;
  exportValue?:   (row: T) => string | number | null | undefined;
  align?:         'left' | 'center' | 'right';
  className?:     string;
  sticky?:        'left' | 'right';
  noExport?:      boolean;
  noHide?:        boolean;
  defaultHidden?: boolean;
}

export interface ServerSideOptions {
  total:            number;
  page:             number;
  pageSize:         number;
  onPageChange:     (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSearch?:        (query: string) => void;
}

interface DataTableProps<T> {
  columns:            Column<T>[];
  data:               T[];
  rowKey:             (row: T) => string | number;
  isLoading?:         boolean;
  isFetching?:        boolean;
  isError?:           boolean;
  onRetry?:           () => void;
  onRefresh?:         () => void;
  searchPlaceholder?: string;
  searchFilter?:      (row: T, query: string) => boolean;
  filename?:          string;
  skeletonRows?:      number;
  className?:         string;
  serverSide?:        ServerSideOptions;
  onExport?:          (visibleKeys: string[]) => void | Promise<void>;
  onRowClick?:        (row: T) => void;
  rowClassName?:      (row: T) => string;
  rowStyle?:          (row: T) => React.CSSProperties;
  /** Namespaces all localStorage keys for this table instance */
  storageKey?:        string;
  /** Seeds the search input (for restoring from external state) */
  initialQuery?:      string;
  /** Rendered just before the Columns icon (e.g. store filter) */
  storeFilter?:       React.ReactNode;
  /** Rendered after Refresh — rightmost slot (e.g. Filter button, Add button) */
  headerAction?:      React.ReactNode;
  /** Rendered between the toolbar and the table (e.g. active filter chips) */
  subHeader?:         React.ReactNode;
  /** Advanced AND/OR filter: field definitions enable the Filter button + chips */
  filterFields?:      FilterFieldDef[];
  /** Current filter config (controlled by the parent) */
  filterValue?:       FilterConfig;
  /** Called when the filter is applied / cleared / a chip removed */
  onFilterChange?:    (config: FilterConfig) => void;
  /** Multi-column sort: field definitions enable the Sort button + chips + header sort */
  sortFields?:        SortFieldDef[];
  /** Current sort rules (controlled by the parent) */
  sortValue?:         SortRule[];
  /** Called when sort changes (panel apply/clear/chip remove, or header click) */
  onSortChange?:      (sorts: SortRule[]) => void;
  /** Rendered right after the search input in the toolbar row */
  afterSearch?:       React.ReactNode;
  /** Override the rows-per-page options. Defaults to [25, 50, 100, 0] where 0 = All */
  pageSizes?:         number[];
  /** Show all rows with no pagination controls */
  disablePagination?: boolean;
  /** Rows pinned to the bottom of the table in a sticky <tfoot> */
  pinnedBottomData?:  T[];
  /** When provided, hover highlight only applies to rows where this returns true */
  rowHoverable?:      (row: T) => boolean;
  /** Compact row height mode */
  compact?:           boolean;
  /** Replaces the default empty state (shown when rows = 0 and not loading/error) */
  emptyContent?:      React.ReactNode;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

/** Returns 0-based page indices + '…' separators for a compact page window. */
function getPageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 1) return total === 1 ? [0] : [];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const set = new Set<number>([0, total - 1]);
  for (let p = Math.max(1, current - 1); p <= Math.min(total - 2, current + 1); p++) set.add(p);

  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

const SKEL_WIDTHS  = ['70%','50%','65%','80%','45%','55%','75%','60%','40%','85%'];

function lsGet<T>(key: string | undefined, suffix: string, fallback: T): T {
  if (!key) return fallback;
  try {
    const raw = localStorage.getItem(`dt:${key}:${suffix}`);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function lsSet(key: string | undefined, suffix: string, value: unknown) {
  if (!key) return;
  try { localStorage.setItem(`dt:${key}:${suffix}`, JSON.stringify(value)); } catch {}
}

function buildLocalCSV<T>(cols: Column<T>[], data: T[], filename: string) {
  const exportCols = cols.filter(c => !c.noExport && c.sticky !== 'right'); // left-sticky cols are exported
  const header     = exportCols.map(c => `"${c.label}"`).join(',');
  const rows       = data.map((row, i) =>
    exportCols.map(c => {
      const val = c.exportValue ? c.exportValue(row) : c.render(row, i);
      return `"${String(val ?? '').replace(/"/g, '""')}"`;
    }).join(','),
  );
  const csv  = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${filename ?? 'export'}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/* ─── Component ──────────────────────────────────────────────────── */
export function DataTable<T>({
  columns, data, rowKey,
  isLoading, isFetching, isError, onRetry, onRefresh,
  searchPlaceholder = 'Search…',
  searchFilter,
  filename = 'export',
  skeletonRows = 8,
  className = '',
  serverSide,
  onExport,
  onRowClick,
  rowClassName,
  rowStyle,
  storageKey,
  initialQuery = '',
  storeFilter,
  headerAction,
  subHeader,
  filterFields,
  filterValue,
  onFilterChange,
  sortFields,
  sortValue,
  onSortChange,
  afterSearch,
  pageSizes,
  disablePagination,
  pinnedBottomData,
  rowHoverable,
  compact,
  emptyContent,
}: DataTableProps<T>) {

  const isServer = !!serverSide;

  const PAGE_OPTIONS_RESOLVED = (pageSizes ?? [25, 50, 100, 0]).map(s => ({
    value: s,
    label: s === 0 ? 'All' : String(s),
  }));

  /* ── Persisted: column order ── */
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const stored = lsGet<string[]>(storageKey, 'col-order', []);
    return stored.length ? stored : columns.map(c => c.key);
  });

  /* ── Persisted: primary (sticky-after-sno) column key ── */
  const [primaryKey, setPrimaryKey] = useState<string>(() => lsGet<string>(storageKey, 'primary', ''));

  /* ── Sync columnOrder when columns prop changes (added/removed cols) ── */
  useEffect(() => {
    setColumnOrder(prev => {
      const keys    = columns.map(c => c.key);
      const kept    = prev.filter(k => keys.includes(k));
      const added   = keys.filter(k => !prev.includes(k));
      return [...kept, ...added];
    });
  }, [columns]);

  /* ── Persisted: hidden columns ── */
  const [hidden, setHidden] = useState<Set<string>>(() => {
    const storedHidden = lsGet<string[]>(storageKey, 'hidden', null as any);
    if (!storedHidden) {
      return new Set(columns.filter(c => c.defaultHidden).map(c => c.key));
    }
    const hiddenSet  = new Set(storedHidden);
    const knownKeys  = new Set(lsGet<string[]>(storageKey, 'col-order', []));
    // Auto-hide new columns with defaultHidden that weren't in the previous stored order
    columns.forEach(c => { if (c.defaultHidden && !knownKeys.has(c.key)) hiddenSet.add(c.key); });
    return hiddenSet;
  });

  /* ── Persisted: page size (client-side only) ── */
  const [pageSize, setPageSize] = useState<number>(() =>
    disablePagination ? 0 : lsGet(storageKey, 'page-size', 50),
  );

  /* ── Persisted: current page (client-side only) ── */
  const [page, setPage] = useState<number>(() =>
    lsGet(storageKey, 'page', 0),
  );

  /* ── Persisted: search query ── */
  const [query, setQuery] = useState<string>(() =>
    lsGet(storageKey, 'query', initialQuery),
  );

  /* ── Other local state ── */
  const [sortCol,    setSortCol]    = useState<string | null>(null);
  const [sortDir,    setSortDir]    = useState<'asc' | 'desc'>('asc');
  const [exporting,      setExporting]      = useState(false);
  const [exportConfirm,  setExportConfirm]  = useState(false);
  const [fillRows,       setFillRows]       = useState(skeletonRows);

  /* ── Persisted: column widths (px) for drag-resized columns ── */
  const [colWidths, setColWidths] = useState<Record<string, number>>(() =>
    lsGet<Record<string, number>>(storageKey, 'col-widths', {}),
  );

  const scrollRef   = useRef<HTMLDivElement>(null);

  /* ── Persist helpers ── */
  const persist = useCallback((suffix: string, value: unknown) => {
    lsSet(storageKey, suffix, value);
  }, [storageKey]);

  /* ── Reset local page on query / sort change (client-side) ── */
  useEffect(() => {
    if (!isServer) { setPage(0); persist('page', 0); }
  }, [query, sortCol, isServer, persist]);

  /* ── Debounce search → server ── */
  useEffect(() => {
    if (!serverSide?.onSearch) return;
    const t = setTimeout(() => serverSide.onSearch!(query), 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  /* ── Fill skeleton rows to cover the full height ── */
  const ROW_H = 41;
  const updateFillRows = useCallback(() => {
    const h = scrollRef.current?.clientHeight ?? 0;
    setFillRows(h > 0 ? Math.ceil(h / ROW_H) + 2 : skeletonRows);
  }, [skeletonRows]);

  useEffect(() => {
    updateFillRows();
    const ro = new ResizeObserver(updateFillRows);
    if (scrollRef.current) ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, [updateFillRows]);

  /* ── Ordered columns (apply stored order; sno always first; primary → sticky-left pos 2; sticky-right always last) ── */
  const orderedColumns = useMemo(() => {
    const colMap = new Map(columns.map(c => [c.key, c]));

    // Promote primary column to sticky-left if it isn't already
    if (primaryKey) {
      const col = colMap.get(primaryKey);
      if (col && col.sticky !== 'left' && col.sticky !== 'right') {
        colMap.set(primaryKey, { ...col, sticky: 'left' as const });
      }
    }

    const ordered = columnOrder.filter(k => colMap.has(k)).map(k => colMap.get(k)!);
    const missing = columns.filter(c => !columnOrder.includes(c.key)).map(c => colMap.get(c.key)!);
    const all = [...ordered, ...missing];

    // sno is always pinned first — extract it from wherever it landed
    const snoCol     = all.find(c => c.key === 'sno');
    const withoutSno = all.filter(c => c.key !== 'sno');

    const stickyLeft  = withoutSno.filter(c => c.sticky === 'left');
    const nonSticky   = withoutSno.filter(c => !c.sticky);
    const stickyRight = withoutSno.filter(c => c.sticky === 'right');

    const snoFirst = snoCol ? [snoCol] : [];

    if (primaryKey) {
      const primaryCols = stickyLeft.filter(c => c.key === primaryKey);
      const otherLeft   = stickyLeft.filter(c => c.key !== primaryKey);
      return [...snoFirst, ...primaryCols, ...otherLeft, ...nonSticky, ...stickyRight];
    }

    return [...snoFirst, ...stickyLeft, ...nonSticky, ...stickyRight];
  }, [columns, columnOrder, primaryKey]);

  /* ── Draggable columns (shown in overlay) ── */
  const draggableCols = useMemo(
    () => orderedColumns.filter(c => !c.noHide && !c.sticky),
    [orderedColumns],
  );

  /* ── Client-side filter + sort ── */
  const filtered = useMemo(() => {
    if (isServer || !query || !searchFilter) return data;
    const q = query.toLowerCase();
    return data.filter(r => searchFilter(r, q));
  }, [data, query, searchFilter, isServer]);

  const sorted = useMemo(() => {
    if (isServer || !sortCol) return filtered;
    const col = orderedColumns.find(c => c.key === sortCol);
    if (!col?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const va = col.sortValue!(a) ?? '';
      const vb = col.sortValue!(b) ?? '';
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir, orderedColumns, isServer]);

  /* ── Pagination values ── */
  const displayPage     = isServer ? serverSide!.page     : page;
  const displayPageSize = isServer ? serverSide!.pageSize : pageSize;
  const displayTotal    = isServer ? (serverSide!.total || 0) : sorted.length;
  const effectiveSize   = displayPageSize === 0 ? displayTotal || 1 : displayPageSize;
  const totalPages      = Math.max(1, Math.ceil(displayTotal / effectiveSize));
  const safePage        = Math.min(displayPage, totalPages - 1);

  const paginated = isServer
    ? data
    : (pageSize === 0 ? sorted : sorted.slice(safePage * pageSize, (safePage + 1) * pageSize));

  const startItem = displayTotal === 0 ? 0 : safePage * effectiveSize + 1;
  const endItem   = Math.min((safePage + 1) * effectiveSize, displayTotal);

  /* ── Navigation helpers ── */
  function goPage(p: number) {
    if (isServer) { serverSide!.onPageChange(p); }
    else { setPage(p); persist('page', p); }
  }
  function changeSize(s: number) {
    if (isServer) { serverSide!.onPageSizeChange(s); }
    else { setPageSize(s); persist('page-size', s); setPage(0); persist('page', 0); }
  }
  function handleQueryChange(q: string) {
    setQuery(q);
    persist('query', q);
  }

  const visibleCols = orderedColumns.filter(c => !hidden.has(c.key));

  /* ── Sorting: server (multi, via sortValue/onSortChange) or client (single) ── */
  const sortableKeys = useMemo(() => new Set(sortFields?.map(f => f.key) ?? []), [sortFields]);
  const serverSortable = (col: Column<T>) => !!onSortChange && sortableKeys.has(col.key);
  const canSort = (col: Column<T>) => serverSortable(col) || (!!col.sortValue && !isServer);

  /** Current sort direction shown in the header for a column (null = unsorted). */
  function headerDir(col: Column<T>): 'asc' | 'desc' | null {
    if (serverSortable(col)) return sortValue?.find(r => r.field === col.key)?.dir ?? null;
    if (!isServer && sortCol === col.key) return sortDir;
    return null;
  }

  function handleSort(col: Column<T>) {
    if (serverSortable(col)) {
      // Header click = quick single-column sort, toggling asc → desc → off.
      const cur = sortValue?.find(r => r.field === col.key);
      if (!cur)               onSortChange!([{ field: col.key, dir: 'asc' }]);
      else if (cur.dir === 'asc') onSortChange!([{ field: col.key, dir: 'desc' }]);
      else                    onSortChange!([]);
      return;
    }
    if (!canSort(col)) return;
    if (sortCol === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col.key); setSortDir('asc'); }
  }

  /* ── Column resize (drag the right edge of a non-sticky header) ── */
  const setColWidth = useCallback((key: string, w: number) => {
    setColWidths(prev => {
      const next = { ...prev, [key]: Math.max(60, Math.round(w)) };
      lsSet(storageKey, 'col-widths', next);
      return next;
    });
  }, [storageKey]);

  const startResize = useCallback((e: React.PointerEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.currentTarget as HTMLElement).closest('th') as HTMLElement | null;
    const startX = e.clientX;
    const startW = th?.offsetWidth ?? 120;
    const onMove = (ev: PointerEvent) => setColWidth(key, startW + (ev.clientX - startX));
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, [setColWidth]);

  const resetColWidth = useCallback((key: string) => {
    setColWidths(prev => {
      const next = { ...prev }; delete next[key];
      lsSet(storageKey, 'col-widths', next);
      return next;
    });
  }, [storageKey]);

  const toggleCol = useCallback((key: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      persist('hidden', [...next]);
      persist('user-customized', true);
      return next;
    });
  }, [persist]);

  /* ── Column drag-and-drop ── */
  const handleColumnReorder = useCallback((from: number, to: number) => {
    const keys    = draggableCols.map(c => c.key);
    const newKeys = [...keys];
    const [moved] = newKeys.splice(from, 1);
    newKeys.splice(to, 0, moved);
    let di = 0;
    const newOrder = orderedColumns.map(c =>
      (!c.noHide && !c.sticky) ? newKeys[di++] : c.key,
    );
    setColumnOrder(newOrder);
    persist('col-order', newOrder);
    persist('user-customized', true);
  }, [draggableCols, orderedColumns, persist]);

  /* ── Reset column layout — restores admin defaults, falls back to code defaults ── */
  const handleReset = useCallback(() => {
    const adminOrder   = lsGet<string[]>(storageKey, 'admin-order',  []);
    const adminHidden  = lsGet<string[] | null>(storageKey, 'admin-hidden',  null);
    const adminPrimary = lsGet<string>(storageKey, 'admin-primary', '');

    const newOrder   = adminOrder.length ? adminOrder  : columns.map(c => c.key);
    const newHidden  = adminHidden       ? new Set<string>(adminHidden) : new Set(columns.filter(c => c.defaultHidden).map(c => c.key));
    const newPrimary = adminPrimary;

    setColumnOrder(newOrder);
    setHidden(newHidden);
    setPrimaryKey(newPrimary);
    persist('col-order', newOrder);
    persist('hidden', [...newHidden]);
    persist('primary', newPrimary);
    // Clear user customization so admin defaults apply again on next login
    if (storageKey) localStorage.removeItem(`dt:${storageKey}:user-customized`);
  }, [columns, storageKey, persist]);

  /* ── Export ── */
  const exportableCols = useMemo(
    () => visibleCols.filter(c => !c.noExport && c.sticky !== 'right'),
    [visibleCols],
  );

  async function doExport() {
    setExporting(true);
    try {
      if (onExport) {
        await onExport(exportableCols.map(c => c.key));
      } else {
        buildLocalCSV(visibleCols, isServer ? data : sorted, filename);
        toast.success(`Exported ${isServer ? data.length : sorted.length} rows`);
      }
    } finally {
      setExporting(false);
    }
  }

  const isShowingSkeleton = !!(isLoading || isFetching);

  const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' };

  // Sticky-right classes
  const stickyRightTh      = 'sticky right-0 z-10 shadow-[-1px_0_0_0]';
  const stickyRightTd      = 'sticky right-0 bg-white dark:bg-gray-900 shadow-[-1px_0_0_0] shadow-gray-100 dark:shadow-gray-800';
  const stickyRightTdHover = 'group-hover:bg-gray-50 dark:group-hover:bg-gray-800';

  // Sticky-left: offsets computed from actual rendered widths
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const [stickyLeftOffsets, setStickyLeftOffsets] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!theadRef.current) return;
    const leftCols = visibleCols.filter(c => c.sticky === 'left');
    if (leftCols.length === 0) return;
    const offsets: Record<string, number> = {};
    let cum = 0;
    leftCols.forEach(col => {
      offsets[col.key] = cum;
      const th = theadRef.current!.querySelector(`[data-col="${col.key}"]`);
      if (th) cum += (th as HTMLElement).offsetWidth;
    });
    // Only update state when values actually changed to avoid re-render loops
    setStickyLeftOffsets(prev => {
      const changed =
        Object.keys(offsets).length !== Object.keys(prev).length ||
        Object.entries(offsets).some(([k, v]) => prev[k] !== v);
      return changed ? offsets : prev;
    });
  }, [visibleCols]);

  return (
    <div className={`flex flex-col min-h-0 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden ${className}`}>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-8 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          {query && (
            <button onClick={() => handleQueryChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Result count */}
        {query && !isShowingSkeleton && (
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md whitespace-nowrap">
            {displayTotal} result{displayTotal !== 1 ? 's' : ''}
          </span>
        )}

        {afterSearch}

        <div className="flex-1" />

        {/* Store filter slot — sits just before icon controls */}
        {storeFilter}

        {/* Column visibility + reorder */}
        {(() => {
          const visibleCount = draggableCols.filter(c => !hidden.has(c.key)).length;
          return (
            <Popover
              align="right"
              width={240}
              trigger={
                <Tooltip label={`Columns (${visibleCount} shown)`}>
                  <button className="relative h-8 w-8 flex items-center justify-center rounded-lg border transition text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <Settings2 size={14} />
                    <span
                      className="absolute -top-1.5 -right-1.5 text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center text-white leading-none"
                      style={{ background: 'var(--accent-600, #3b82f6)' }}
                    >
                      {visibleCount}
                    </span>
                  </button>
                </Tooltip>
              }
            >
              <ColumnOverlay
                cols={draggableCols}
                hidden={hidden}
                onToggle={toggleCol}
                onReorder={handleColumnReorder}
                onReset={handleReset}
              />
            </Popover>
          );
        })()}

        {/* Export */}
        <Tooltip label="Export CSV">
          <button
            onClick={() => setExportConfirm(true)}
            disabled={exporting || isLoading}
            className="h-8 w-8 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-60 transition"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          </button>
        </Tooltip>

        {/* Refresh */}
        {onRefresh && (
          <Tooltip label="Refresh">
            <button
              onClick={onRefresh}
              disabled={isLoading || isFetching}
              className="h-8 w-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 transition"
            >
              <RefreshCw size={14} className={(isLoading || isFetching) ? 'animate-spin' : ''} />
            </button>
          </Tooltip>
        )}

        {/* Multi-column sort */}
        {sortFields && sortFields.length > 0 && sortValue && onSortChange && (
          <SortControl fields={sortFields} value={sortValue} onChange={onSortChange} />
        )}

        {/* Advanced AND/OR filter */}
        {filterFields && filterFields.length > 0 && filterValue && onFilterChange && (
          <FilterControl fields={filterFields} value={filterValue} onChange={onFilterChange} />
        )}

        {/* Injected action slot — rightmost (e.g. Filter button, Add button) */}
        {headerAction}

      </div>

      {/* ── Sub-header (e.g. active filter / sort chips) ── */}
      {(subHeader
        || (filterFields && countActiveConditions(filterValue) > 0)
        || (sortFields && countSorts(sortValue) > 0)) && (
        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 space-y-2">
          {sortFields && sortValue && onSortChange && countSorts(sortValue) > 0 && (
            <SortChips fields={sortFields} value={sortValue} onChange={onSortChange} />
          )}
          {filterFields && filterValue && onFilterChange && countActiveConditions(filterValue) > 0 && (
            <FilterChips fields={filterFields} value={filterValue} onChange={onFilterChange} />
          )}
          {subHeader}
        </div>
      )}

      {/* ── Table scroll area ── */}
      <div ref={scrollRef} className={`flex-1 min-h-0 ${isShowingSkeleton ? 'overflow-hidden' : 'overflow-auto'}`}>
        <table className="w-full text-sm border-collapse">

          <colgroup>
            {visibleCols.map(col => (
              <col key={col.key} style={colWidths[col.key] ? { width: colWidths[col.key], minWidth: colWidths[col.key] } : undefined} />
            ))}
          </colgroup>

          <thead ref={theadRef} className="sticky top-0 z-20">
            <tr
              className="border-b divide-x"
              style={{
                background:        'color-mix(in srgb, var(--accent-600) 8%, var(--color-surface))',
                borderBottomColor: 'color-mix(in srgb, var(--accent-600) 20%, transparent)',
                borderColor:       'color-mix(in srgb, var(--accent-600) 10%, transparent)',
              }}
            >
              {visibleCols.map(col => {
                const dir = headerDir(col);
                const sortable = canSort(col);
                const isLeftSticky  = col.sticky === 'left';
                const isRightSticky = col.sticky === 'right';
                const resizable = !col.sticky && col.key !== 'sno';
                return (
                  <th
                    key={col.key}
                    data-col={col.key}
                    onClick={() => handleSort(col)}
                    className={[
                      'relative',
                      compact ? 'px-3 py-2' : 'px-3 py-3',
                      'text-xs font-semibold uppercase tracking-wide whitespace-nowrap select-none',
                      'text-left',
                      sortable ? 'cursor-pointer' : '',
                      isRightSticky ? stickyRightTh : '',
                      isLeftSticky  ? 'sticky z-10 shadow-[1px_0_0_0]' : '',
                    ].filter(Boolean).join(' ')}
                    style={{
                      color:       'color-mix(in srgb, var(--accent-600) 75%, var(--color-text-2))',
                      ...(isLeftSticky  ? { left: stickyLeftOffsets[col.key] ?? 0, background: 'color-mix(in srgb, var(--accent-600) 8%, var(--color-surface))', boxShadow: '1px 0 0 0 color-mix(in srgb, var(--accent-600) 15%, transparent)' } : {}),
                      ...(isRightSticky ? { background: 'color-mix(in srgb, var(--accent-600) 8%, var(--color-surface))', boxShadow: '-1px 0 0 0 color-mix(in srgb, var(--accent-600) 15%, transparent)' } : {}),
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortable && (
                        dir
                          ? dir === 'asc'
                            ? <ChevronUp   size={12} style={{ color: 'var(--accent-600)' }} />
                            : <ChevronDown size={12} style={{ color: 'var(--accent-600)' }} />
                          : <ChevronsUpDown size={12} className="text-gray-300 dark:text-gray-600" />
                      )}
                    </span>
                    {resizable && (
                      <span
                        onPointerDown={(e) => startResize(e, col.key)}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => { e.stopPropagation(); resetColWidth(col.key); }}
                        title="Drag to resize · double-click to reset"
                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-[var(--accent-600)]/40"
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {/* Skeleton */}
            {isShowingSkeleton && Array.from({ length: fillRows }).map((_, ri) => (
              <tr key={ri} className="border-b border-gray-100 dark:border-gray-800 divide-x divide-gray-100 dark:divide-gray-800">
                {visibleCols.map((col, ci) => (
                  <td
                    key={col.key}
                    className={[
                      'px-3 py-3',
                      col.sticky === 'right' ? stickyRightTd : '',
                      col.sticky === 'left'  ? 'sticky z-10 bg-white dark:bg-gray-900 shadow-[1px_0_0_0] shadow-gray-100 dark:shadow-gray-800' : '',
                    ].filter(Boolean).join(' ')}
                    style={col.sticky === 'left' ? { left: stickyLeftOffsets[col.key] ?? 0 } : undefined}
                  >
                    <div
                      className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                      style={{ width: SKEL_WIDTHS[(ri * visibleCols.length + ci) % SKEL_WIDTHS.length] }}
                    />
                  </td>
                ))}
              </tr>
            ))}

            {/* Error */}
            {!isShowingSkeleton && isError && (
              <tr>
                <td colSpan={visibleCols.length} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle size={32} className="text-red-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Failed to load data</p>
                    {onRetry && (
                      <button onClick={onRetry} className="text-xs text-blue-600 hover:text-blue-700 hover:underline">
                        Try again
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* Empty */}
            {!isShowingSkeleton && !isError && paginated.length === 0 && (
              <tr>
                <td colSpan={visibleCols.length} className="py-14 text-center">
                  {emptyContent ?? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-600,#2563eb) 10%, var(--color-surface,#fff)), color-mix(in srgb, var(--accent-600,#2563eb) 4%, var(--color-surface,#fff)))', border: '1.5px solid color-mix(in srgb, var(--accent-600,#2563eb) 18%, var(--color-border,#e5e7eb))' }}>
                        <Inbox size={28} style={{ color: 'color-mix(in srgb, var(--accent-600,#2563eb) 40%, var(--color-text-3,#9ca3af))' }} />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-1,#111827)' }}>
                          {query ? `No results for "${query}"` : 'No records found'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-3,#9ca3af)' }}>
                          {query ? 'Try a different search term' : 'There are no entries to display'}
                        </p>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!isShowingSkeleton && !isError && paginated.map((row, pageIdx) => {
              const absIdx  = safePage * effectiveSize + pageIdx;
              const hoverable = rowHoverable ? rowHoverable(row) : true;
              return (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={[
                    'group border-b border-gray-100 dark:border-gray-800 transition-colors divide-x divide-gray-100 dark:divide-gray-800',
                    hoverable ? 'hover:bg-gray-50 dark:hover:bg-gray-800' : '',
                    onRowClick ? 'cursor-pointer' : '',
                    rowClassName ? rowClassName(row) : '',
                  ].join(' ')}
                  style={rowStyle ? rowStyle(row) : undefined}
                >
                  {visibleCols.map(col => (
                    <td
                      key={col.key}
                      className={[
                        compact ? 'px-3 py-1' : 'px-3 py-2.5',
                        'text-gray-700 dark:text-gray-300 whitespace-nowrap',
                        alignClass[col.align ?? 'left'],
                        col.className ?? '',
                        col.sticky === 'right' ? `${stickyRightTd} ${stickyRightTdHover}` : '',
                        col.sticky === 'left'  ? 'sticky z-10 bg-white dark:bg-gray-900 shadow-[1px_0_0_0] shadow-gray-100 dark:shadow-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-800' : '',
                      ].filter(Boolean).join(' ')}
                      style={col.sticky === 'left' ? { left: stickyLeftOffsets[col.key] ?? 0 } : undefined}
                    >
                      {col.render(row, absIdx) ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>

          {/* Pinned bottom rows (e.g. grand total) */}
          {pinnedBottomData && pinnedBottomData.length > 0 && (
            <tfoot className="sticky bottom-0 z-20">
              {pinnedBottomData.map((row, i) => (
                <tr
                  key={`pinned-${i}`}
                  className={[
                    'divide-x divide-gray-200 dark:divide-gray-700',
                    rowClassName ? rowClassName(row) : '',
                  ].join(' ')}
                  style={rowStyle ? rowStyle(row) : undefined}
                >
                  {visibleCols.map((col, ci) => (
                    <td
                      key={col.key}
                      className={[
                        compact ? 'px-3 py-1' : 'px-3 py-2.5',
                        'whitespace-nowrap',
                        alignClass[col.align ?? 'left'],
                        col.className ?? '',
                      ].filter(Boolean).join(' ')}
                    >
                      {col.render(row, -1 - ci) ?? null}
                    </td>
                  ))}
                </tr>
              ))}
            </tfoot>
          )}

        </table>
      </div>

      {/* ── Pagination footer — hidden when pagination is disabled ── */}
      {!disablePagination && (
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 flex-wrap gap-3 bg-white dark:bg-gray-900">

        {/* Record count */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {isLoading ? (
            <span className="inline-block w-32 h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : displayTotal > 0 ? (
            <>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {startItem.toLocaleString()}–{endItem.toLocaleString()}
              </span>
              {' of '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {displayTotal.toLocaleString()}
              </span>
              {' records'}
            </>
          ) : (
            'No records'
          )}
        </p>

        <div className="flex items-center gap-3">

          {/* Rows per page */}
          {!disablePagination && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="hidden sm:inline">Rows per page</span>
            <span className="sm:hidden">Rows</span>
            <Select
              value={displayPageSize}
              onChange={v => changeSize(Number(v))}
              options={PAGE_OPTIONS_RESOLVED}
              size="sm"
              dropdownSize="md"
            />
          </div>
          )}

          {/* Page navigation */}
          {!disablePagination && displayPageSize > 0 && (
            <div className="flex items-center gap-0.5">
              <PgNavBtn icon={ChevronsLeft}  onClick={() => goPage(0)}              disabled={safePage === 0}              tooltip="First page" />
              <PgNavBtn icon={ChevronLeft}   onClick={() => goPage(safePage - 1)}   disabled={safePage === 0}              tooltip="Previous page" />

              <div className="flex items-center gap-0.5 mx-0.5">
                {isLoading
                  ? <span className="w-16 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse block" />
                  : getPageWindow(safePage, totalPages).map((p, i) =>
                      p === '…'
                        ? <span key={`e${i}`} className="w-6 h-7 flex items-end justify-center pb-1 text-xs text-gray-400 dark:text-gray-600 select-none">…</span>
                        : <PageBtn key={p} page={p as number} current={safePage} onClick={goPage} />
                    )
                }
              </div>

              <PgNavBtn icon={ChevronRight}  onClick={() => goPage(safePage + 1)}   disabled={safePage >= totalPages - 1} tooltip="Next page" />
              <PgNavBtn icon={ChevronsRight} onClick={() => goPage(totalPages - 1)} disabled={safePage >= totalPages - 1} tooltip="Last page" />
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── Export confirm dialog ── */}
      <ConfirmDialog
        open={exportConfirm}
        title="Export Data"
        message={`Download ${displayTotal.toLocaleString()} record${displayTotal !== 1 ? 's' : ''} as CSV with ${exportableCols.length} selected column${exportableCols.length !== 1 ? 's' : ''}${query ? ` (filtered by "${query}")` : ''}?`}
        confirmLabel="Download"
        variant="info"
        isLoading={exporting}
        onConfirm={async () => { await doExport(); setExportConfirm(false); }}
        onCancel={() => setExportConfirm(false)}
      />
    </div>
  );
}

/* ─── ColumnOverlay ──────────────────────────────────────────────── */
const ColumnOverlay = memo(function ColumnOverlay({ cols, hidden, onToggle, onReorder, onReset }: {
  cols:      Array<{ key: string; label: string }>;
  hidden:    Set<string>;
  onToggle:  (key: string) => void;
  onReorder: (from: number, to: number) => void;
  onReset:   () => void;
}) {
  const dragRef    = useRef<number | null>(null);
  const insertRef  = useRef<number | null>(null);
  const itemEls    = useRef<(HTMLDivElement | null)[]>([]);
  const endLineRef = useRef<HTMLDivElement>(null);

  const BLUE = 'var(--accent-600, #3b82f6)';
  const visibleCount = cols.filter(c => !hidden.has(c.key)).length;

  function clearIndicators() {
    itemEls.current.forEach(el => { if (el) el.style.borderTopColor = 'transparent'; });
    if (endLineRef.current) endLineRef.current.style.borderTopColor = 'transparent';
  }

  function showIndicator(idx: number) {
    clearIndicators();
    if (idx < cols.length) {
      const el = itemEls.current[idx];
      if (el) el.style.borderTopColor = BLUE;
    } else {
      if (endLineRef.current) endLineRef.current.style.borderTopColor = BLUE;
    }
  }

  function getInsert(e: React.DragEvent, itemIdx: number): number {
    const el = itemEls.current[itemIdx];
    if (!el) return itemIdx;
    const rect = el.getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2 ? itemIdx : itemIdx + 1;
  }

  function handleDragStart(e: React.DragEvent, idx: number) {
    dragRef.current   = idx;
    insertRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    const el = itemEls.current[idx];
    if (el) setTimeout(() => { el.style.opacity = '0.35'; }, 0);
  }

  function handleDragOver(e: React.DragEvent, itemIdx: number) {
    e.preventDefault();
    const ins = getInsert(e, itemIdx);
    insertRef.current = ins;
    showIndicator(ins);
  }

  function handleEndZoneDragOver(e: React.DragEvent) {
    e.preventDefault();
    insertRef.current = cols.length;
    showIndicator(cols.length);
  }

  function commit() {
    const from = dragRef.current;
    const ins  = insertRef.current;
    clearIndicators();
    if (from !== null) {
      const el = itemEls.current[from];
      if (el) el.style.opacity = '';
    }
    if (from !== null && ins !== null && ins !== from && ins !== from + 1) {
      const to = ins > from ? ins - 1 : ins;
      onReorder(from, to);
    }
    dragRef.current   = null;
    insertRef.current = null;
  }

  function handleDrop(e: React.DragEvent) { e.preventDefault(); commit(); }
  function handleDragEnd()                { commit(); }

  return (
    <div className="flex flex-col">
      {/* Header — fixed */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Settings2 size={13} className="text-gray-400 dark:text-gray-500" />
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Columns</span>
          <span className="text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full px-1.5 py-0.5 leading-none">
            {visibleCount}/{cols.length}
          </span>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-[11px] font-medium transition-colors"
          style={{ color: 'var(--accent-600,#2563eb)' }}
        >
          <RotateCcw size={11} />
          Reset
        </button>
      </div>

      {/* Hint — fixed */}
      <p className="text-[10px] text-gray-400 dark:text-gray-600 px-3 pt-2 pb-1 flex-shrink-0">
        Drag to reorder · click to show/hide
      </p>

      {/* Items — scrollable */}
      <div className="px-1.5 pb-1.5 overflow-y-auto" style={{ maxHeight: '280px' }}>
        {cols.map((col, idx) => {
          const isVisible = !hidden.has(col.key);
          return (
            <div
              key={col.key}
              ref={el => { itemEls.current[idx] = el; }}
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onClick={() => onToggle(col.key)}
              className="group flex items-center gap-2.5 px-2 py-2 rounded-lg select-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors"
              style={{ borderTop: '2px solid transparent' }}
            >
              {/* Drag grip */}
              <GripVertical
                size={14}
                className="text-gray-200 dark:text-gray-700 group-hover:text-gray-400 dark:group-hover:text-gray-500 cursor-grab flex-shrink-0 transition-colors"
                onMouseDown={e => e.stopPropagation()}
              />

              {/* Custom checkbox */}
              <div
                className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                  isVisible
                    ? 'bg-blue-500 border-blue-500'
                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                }`}
                onClick={e => { e.stopPropagation(); onToggle(col.key); }}
              >
                {isVisible && <Check size={9} className="text-white" strokeWidth={3.5} />}
              </div>

              {/* Label */}
              <span className={`text-sm flex-1 transition-colors ${
                isVisible
                  ? 'text-gray-700 dark:text-gray-200 font-medium'
                  : 'text-gray-400 dark:text-gray-500'
              }`}>
                {col.label}
              </span>
            </div>
          );
        })}

        {/* Drop zone — enables dragging to the last position */}
        <div
          ref={endLineRef}
          onDragOver={handleEndZoneDragOver}
          onDrop={handleDrop}
          className="h-2"
          style={{ borderTop: '2px solid transparent' }}
        />
      </div>
    </div>
  );
});

function PgNavBtn({ icon: Icon, onClick, disabled, tooltip }: {
  icon: React.ElementType; onClick: () => void; disabled: boolean; tooltip: string;
}) {
  return (
    <Tooltip label={tooltip}>
      <button
        onClick={onClick}
        disabled={disabled}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        onMouseEnter={!disabled ? e => {
          e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-600) 8%, var(--color-surface))';
          e.currentTarget.style.color = 'var(--accent-600, #2563eb)';
        } : undefined}
        onMouseLeave={!disabled ? e => {
          e.currentTarget.style.background = '';
          e.currentTarget.style.color = '';
        } : undefined}
      >
        <Icon size={13} />
      </button>
    </Tooltip>
  );
}

function PageBtn({ page, current, onClick }: {
  page: number; current: number; onClick: (p: number) => void;
}) {
  const isActive = page === current;
  return (
    <button
      onClick={() => !isActive && onClick(page)}
      className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
        isActive ? 'text-white shadow-sm cursor-default' : 'text-gray-600 dark:text-gray-400'
      }`}
      style={isActive ? { background: 'var(--accent-600, #2563eb)', color: '#fff' } : undefined}
      onMouseEnter={!isActive ? e => {
        e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-600) 8%, var(--color-surface))';
        e.currentTarget.style.color = 'var(--accent-600, #2563eb)';
      } : undefined}
      onMouseLeave={!isActive ? e => {
        e.currentTarget.style.background = '';
        e.currentTarget.style.color = '';
      } : undefined}
    >
      {page + 1}
    </button>
  );
}
