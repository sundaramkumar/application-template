import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { Popover } from './Popover';
import type { SelectOption } from './Select';

export interface MultiSelectProps {
  value:        (string | number)[];
  onChange:     (value: (string | number)[]) => void;
  options:      SelectOption[];
  placeholder?: string;
  disabled?:    boolean;
  className?:   string;
  /** Show search box in dropdown (default true when options > 6) */
  searchable?:  boolean;
  /** 'sm' for compact inline use, 'md' for forms */
  size?:        'sm' | 'md';
}

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled = false,
  className = '',
  size = 'md',
  searchable,
}: MultiSelectProps) {
  const showSearch = searchable ?? options.length > 3;

  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState('');
  const [focused, setFocused] = useState<number>(-1);

  const searchRef  = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLUListElement>(null);

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  /* ── Reset transient state when the menu opens ── */
  function openMenu() {
    setQuery('');
    setFocused(-1);
    setOpen(true);
  }

  /* ── Focus search on open ── */
  useEffect(() => {
    if (open && showSearch) {
      setTimeout(() => searchRef.current?.focus(), 30);
    }
  }, [open, showSearch]);

  /* ── Keyboard navigation ── */
  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault(); openMenu();
      }
      return;
    }
    const enabledIdxs = filtered.map((o, i) => (!o.disabled ? i : -1)).filter(i => i !== -1);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = enabledIdxs.find(i => i > focused) ?? enabledIdxs[0] ?? 0;
      setFocused(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = [...enabledIdxs].reverse().find(i => i < focused) ?? enabledIdxs[enabledIdxs.length - 1] ?? 0;
      setFocused(prev);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = filtered[focused];
      if (opt && !opt.disabled) toggle(opt.value);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, focused, filtered, disabled]);

  /* ── Scroll focused item into view ── */
  useEffect(() => {
    if (!open || focused < 0 || !listRef.current) return;
    const item = listRef.current.children[focused] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [focused, open]);

  /* ── Toggle one option ── */
  function toggle(optValue: string | number) {
    const next = value.includes(optValue)
      ? value.filter(v => v !== optValue)
      : [...value, optValue];
    onChange(next);
  }

  /* ── Trigger label ── */
  function getTriggerLabel() {
    if (value.length === 0) return null;
    const selected = options.filter(o => value.includes(o.value));
    if (selected.length === 0) return null;
    if (selected.length === 1) return selected[0].label;
    if (selected.length === 2) return selected.map(o => o.label).join(', ');
    return (
      <>
        {selected[0].label}
        <span
          className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
          style={{ background: 'var(--accent-600)' }}
        >
          +{selected.length - 1}
        </span>
      </>
    );
  }

  const triggerLabel = getTriggerLabel();

  /* ── Sizing ── */
  const triggerSize = size === 'sm'
    ? 'px-2.5 py-1.5 text-xs min-w-[60px]'
    : 'px-3 py-2.5 text-sm min-w-[120px]';
  const chevronSize = size === 'sm' ? 12 : 14;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => { if (o) openMenu(); else setOpen(false); }}
      disabled={disabled}
      matchWidth
      minWidth={size === 'sm' ? 140 : 180}
      flip
      align="left"
      className={`overflow-hidden ${className}`}
      trigger={
        <button
          type="button"
          disabled={disabled}
          onKeyDown={handleKey}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={[
            'flex items-center gap-2 w-full rounded-lg border transition-all',
            'border-gray-200 dark:border-gray-700',
            'bg-white dark:bg-gray-800',
            'text-gray-800 dark:text-gray-100',
            open ? '' : 'hover:border-gray-300 dark:hover:border-gray-600',
            'focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            triggerSize,
          ].join(' ')}
          style={open ? {
            borderColor: 'var(--accent-600)',
            boxShadow:   '0 0 0 2px color-mix(in srgb, var(--accent-600) 20%, transparent)',
          } : {}}
        >
          <span className="flex-1 text-left truncate flex items-center gap-1" style={triggerLabel ? { color: 'var(--accent-700)' } : {}}>
            {triggerLabel ?? <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>}
          </span>
          <ChevronDown
            size={chevronSize}
            className={`flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            style={{ color: 'var(--color-text-3)' }}
          />
        </button>
      }
    >
      {/* Dropdown content (Popover supplies the panel, positioning, outside-click) */}
      <div
        role="listbox"
        aria-multiselectable="true"
        className="flex flex-col"
        style={{ background: 'var(--color-surface)', maxHeight: 280 }}
      >
        {/* Search box */}
        {showSearch && (
          <div
            className="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0"
            style={{ borderColor: 'var(--color-border-light)' }}
          >
            <Search size={13} style={{ color: 'var(--color-text-3)' }} className="flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setFocused(0); }}
              onKeyDown={handleKey}
              placeholder="Search…"
              className="flex-1 bg-transparent text-xs outline-none placeholder-gray-400 dark:placeholder-gray-600 min-w-0"
              style={{ color: 'var(--color-text-1)' }}
            />
            {query && (
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); setQuery(''); searchRef.current?.focus(); }}
                className="flex-shrink-0 transition"
                style={{ color: 'var(--color-text-3)' }}
              >
                <X size={11} />
              </button>
            )}
          </div>
        )}

        {/* Clear selection row */}
        {value.length > 0 && (
          <div
            className="flex items-center gap-2 px-3 border-b flex-shrink-0 cursor-pointer transition-colors select-none"
            style={{
              borderColor: 'var(--color-border-light)',
              color:       'var(--color-text-2)',
              height:      38,
            }}
            onMouseDown={e => { e.preventDefault(); onChange([]); }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <X size={12} style={{ color: 'var(--color-text-3)' }} />
            <span className="text-xs">Clear selection ({value.length})</span>
          </div>
        )}

        {/* Options list */}
        <ul ref={listRef} className="overflow-y-auto flex-1 py-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-xs text-center" style={{ color: 'var(--color-text-3)' }}>
              No options found
            </li>
          ) : filtered.map((opt, idx) => {
            const isSelected = value.includes(opt.value);
            const isFocused  = idx === focused;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setFocused(idx)}
                onMouseDown={e => {
                  e.preventDefault();
                  if (!opt.disabled) toggle(opt.value);
                }}
                className={[
                  'flex items-center gap-2.5 px-3 cursor-pointer transition-colors select-none',
                  size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm',
                  opt.disabled ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
                style={
                  isSelected && isFocused
                    ? { background: 'color-mix(in srgb, var(--accent-600) 15%, var(--color-surface))', color: 'var(--accent-600)' }
                    : isSelected
                      ? { background: 'color-mix(in srgb, var(--accent-600) 8%, var(--color-surface))', color: 'var(--accent-600)' }
                      : isFocused
                        ? { background: 'var(--color-hover)', color: 'var(--color-text-1)' }
                        : { color: 'var(--color-text-1)' }
                }
              >
                {/* Checkbox */}
                <span
                  className="flex-shrink-0 rounded-sm flex items-center justify-center transition-colors"
                  style={{
                    width:       16,
                    height:      16,
                    border:      isSelected ? 'none' : '1.5px solid var(--color-border)',
                    background:  isSelected ? 'var(--accent-600)' : 'transparent',
                  }}
                >
                  {isSelected && <Check size={10} color="white" strokeWidth={3} />}
                </span>
                <span className="truncate flex-1">{opt.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </Popover>
  );
}
