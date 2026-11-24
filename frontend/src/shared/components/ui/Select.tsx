import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { Popover } from './Popover';

export interface SelectOption {
  value:    string | number;
  label:    string;
  disabled?: boolean;
}

export interface SelectProps {
  value:        string | number;
  onChange:     (value: string | number) => void;
  options:      SelectOption[];
  placeholder?: string;
  disabled?:    boolean;
  readOnly?:    boolean;
  className?:   string;
  /** 'sm' for compact inline use (pagination etc.), 'md' for forms */
  size?:         'sm' | 'md';
  /** Override the size of dropdown list items independently of the trigger */
  dropdownSize?: 'sm' | 'md';
  /** Show search box in dropdown (default true when options > 6) */
  searchable?:  boolean;
  /** Fill the container width, like an Input (use inside form fields). */
  block?:       boolean;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled = false,
  readOnly = false,
  className = '',
  size = 'md',
  dropdownSize,
  searchable,
  block = false,
}: SelectProps) {
  const showSearch = searchable ?? (options?.length || 0) > 3;

  const [open,        setOpen]        = useState(false);
  const [query,       setQuery]       = useState('');
  const [focused,     setFocused]     = useState<number>(-1);
  const [buttonFocus, setButtonFocus] = useState(false);

  const listRef    = useRef<HTMLUListElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);

  // Empty string = nothing selected — show placeholder, not a "— None —" item
  const selected = value !== '' && value !== null && value !== undefined
    ? options?.find(o => o.value === value)
    : undefined;

  const filtered = query.trim()
    ? options?.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase())) || []
    : options || [];

  /* ── Reset transient state when the menu opens ── */
  function openMenu() {
    setFocused(options?.findIndex(o => o.value === value) ?? -1);
    setQuery('');
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
    if (disabled || readOnly) return;
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault(); openMenu();
      }
      return;
    }
    const enabledIdxs = (filtered || []).map((o, i) => (!o.disabled ? i : -1)).filter(i => i !== -1);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = enabledIdxs.find(i => i > focused) ?? enabledIdxs[0] ?? 0;
      setFocused(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = [...enabledIdxs].reverse().find(i => i < focused) ?? enabledIdxs[enabledIdxs.length - 1] ?? 0;
      setFocused(prev);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[focused];
      if (opt && !opt.disabled) { onChange(opt.value); setOpen(false); }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, focused, filtered, onChange, disabled]);

  /* ── Scroll focused item into view ── */
  useEffect(() => {
    if (!open || focused < 0 || !listRef.current) return;
    const item = listRef.current.children[focused] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [focused, open]);

  /* ── Sizing ── */
  const triggerSize = size === 'sm'
    ? 'px-2.5 py-1.5 text-xs min-w-[60px]'
    : 'px-3 py-2.5 text-sm min-w-[120px]';
  const chevronSize = size === 'sm' ? 12 : 14;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => { if (o) openMenu(); else setOpen(false); }}
      disabled={disabled || readOnly}
      matchWidth
      block={block}
      minWidth={size === 'sm' ? 140 : 180}
      flip
      align="left"
      className={`overflow-hidden ${className}`}
      trigger={
        <button
          type="button"
          disabled={disabled}
          onKeyDown={handleKey}
          onFocus={() => setButtonFocus(true)}
          onBlur={() => setButtonFocus(false)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={[
            'flex items-center gap-2 w-full rounded-lg border transition-all',
            'border-gray-200 dark:border-gray-700',
            'bg-white dark:bg-gray-800',
            'text-gray-800 dark:text-gray-100',
            (!open && !buttonFocus && !readOnly) ? 'hover:border-gray-300 dark:hover:border-gray-600' : '',
            'focus:outline-none',
            readOnly ? 'cursor-default' : '',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            triggerSize,
          ].join(' ')}
          style={(open || buttonFocus) ? {
            borderColor: 'var(--accent-600)',
            boxShadow:   '0 0 0 2px color-mix(in srgb, var(--accent-600) 20%, transparent)',
          } : {}}
        >
          <span className="flex-1 text-left truncate">
            {selected
              ? selected.label
              : <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
            }
          </span>
          {!readOnly && (
            <ChevronDown
              size={chevronSize}
              className={`flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
              style={{ color: 'var(--color-text-3)' }}
            />
          )}
        </button>
      }
    >
      {/* Dropdown content (Popover supplies the panel, positioning, outside-click) */}
      <div
        role="listbox"
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
                onMouseDown={e => { e.preventDefault(); setQuery(''); setFocused(0); searchRef.current?.focus(); }}
                className="flex-shrink-0 transition"
                style={{ color: 'var(--color-text-3)' }}
              >
                <X size={11} />
              </button>
            )}
          </div>
        )}

        {/* Options list */}
        <ul
          ref={listRef}
          className="overflow-y-auto flex-1 py-1"
          style={{ maxHeight: showSearch ? 236 : 272 }}
        >
          {(filtered || []).length === 0 ? (
            <li className="px-3 py-3 text-xs text-center" style={{ color: 'var(--color-text-3)' }}>
              No options found
            </li>
          ) : (filtered || []).map((opt, idx) => {
            const isSelected = opt.value === value;
            const isFocused  = idx === focused;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setFocused(idx)}
                onMouseDown={e => {
                  e.preventDefault();
                  if (!opt.disabled) { onChange(opt.value); setOpen(false); setQuery(''); }
                }}
                className={[
                  'flex items-center justify-between px-3 cursor-pointer transition-colors select-none',
                  (dropdownSize ?? size) === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm',
                  opt.disabled ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
                style={
                  !opt.disabled && isFocused
                    ? { background: 'color-mix(in srgb, var(--accent-600) 8%, var(--color-surface))', color: 'var(--accent-600)' }
                    : !opt.disabled && isSelected && !isFocused
                      ? { color: 'var(--accent-600)' }
                      : { color: 'var(--color-text-1)' }
                }
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check size={12} className="flex-shrink-0 ml-2" style={{ color: 'var(--accent-600)' }} />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Popover>
  );
}
