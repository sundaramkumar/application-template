import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar, ArrowRight, X } from 'lucide-react';

export interface DateRangePickerProps {
  from:        string;
  to:          string;
  onFromChange: (v: string) => void;
  onToChange:   (v: string) => void;
  placeholder?: string;
  className?:   string;
}

const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDay(y: number, m: number)    { return new Date(y, m, 1).getDay(); }
function toIso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function parseIso(s: string) {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}
function fmt(s: string) {
  const d = parseIso(s);
  return d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
}

export function DateRangePicker({
  from, to, onFromChange, onToChange, className = '',
}: DateRangePickerProps) {
  const today = new Date();
  const [open,       setOpen]       = useState<'from' | 'to' | null>(null);
  const [viewYear,   setViewYear]   = useState(today.getFullYear());
  const [viewMonth,  setViewMonth]  = useState(today.getMonth());
  const [pos,        setPos]        = useState({ top: 0, left: 0 });
  const [hovered,    setHovered]    = useState<string | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const pickerRef  = useRef<HTMLDivElement>(null);

  function openPicker(which: 'from' | 'to') {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const base = which === 'from' ? parseIso(from) : parseIso(to);
    if (base) { setViewYear(base.getFullYear()); setViewMonth(base.getMonth()); }
    else      { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }
    setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    setOpen(which);
  }

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node) || pickerRef.current?.contains(e.target as Node)) return;
      setOpen(null);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(day: number) {
    const iso = toIso(viewYear, viewMonth, day);
    if (open === 'from') {
      onFromChange(iso);
      // If new from > to, clear to
      if (to && iso > to) onToChange('');
      setOpen('to');
    } else {
      // If new to < from, swap
      if (from && iso < from) { onToChange(from); onFromChange(iso); }
      else onToChange(iso);
      setOpen(null);
    }
  }

  function isInRange(y: number, m: number, d: number) {
    const iso  = toIso(y, m, d);
    const hov  = open === 'from' ? null : (hovered ?? null);
    const fIso = from || '';
    const tIso = open === 'to' ? (hov ?? to) : to;
    return fIso && tIso && iso > fIso && iso < tIso;
  }

  function isFrom(y: number, m: number, d: number) { return toIso(y, m, d) === from; }
  function isTo(y: number, m: number, d: number)   {
    const tIso = open === 'to' ? (hovered ?? to) : to;
    return toIso(y, m, d) === tIso;
  }

  const accentStyle   = { background: 'var(--accent-600,#2563eb)', color: '#fff' };
  const inRangeStyle  = { background: 'var(--accent-100,#dbeafe)', color: 'var(--accent-700,#1d4ed8)' };
  const todayStyle    = { background: 'color-mix(in srgb, var(--accent-600) 8%, var(--color-surface))', color: 'var(--accent-600,#2563eb)', fontWeight: 700 };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger */}
      <div
        ref={triggerRef}
        className="flex items-center gap-0 rounded-lg border overflow-hidden"
        style={{ borderColor: open ? 'var(--accent-600,#2563eb)' : 'var(--color-border)', background: 'var(--color-surface)', boxShadow: open ? '0 0 0 2px color-mix(in srgb, var(--accent-600) 20%, transparent)' : 'none' }}
      >
        {/* From */}
        <button
          type="button"
          onClick={() => open === 'from' ? setOpen(null) : openPicker('from')}
          className="flex flex-1 items-center gap-2 px-3 py-2.5 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-800"
          style={{ color: from ? 'var(--color-text-1)' : 'var(--color-text-3)', background: open === 'from' ? 'color-mix(in srgb, var(--accent-600) 8%, var(--color-surface))' : 'transparent' }}
        >
          <Calendar size={13} style={{ color: 'var(--color-text-3)' }} />
          <span className="text-xs font-medium">{from ? fmt(from) : 'From date'}</span>
          {from && (
            <span role="button" onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onFromChange(''); }}
              className="ml-auto text-gray-300 hover:text-gray-500 transition">
              <X size={10} />
            </span>
          )}
        </button>

        {/* Separator */}
        <div className="flex items-center px-1" style={{ color: 'var(--color-text-3)' }}>
          <ArrowRight size={13} />
        </div>

        {/* To */}
        <button
          type="button"
          onClick={() => open === 'to' ? setOpen(null) : openPicker('to')}
          className="flex flex-1 items-center gap-2 px-3 py-2.5 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-800"
          style={{ color: to ? 'var(--color-text-1)' : 'var(--color-text-3)', background: open === 'to' ? 'color-mix(in srgb, var(--accent-600) 8%, var(--color-surface))' : 'transparent' }}
        >
          <span className="text-xs font-medium">{to ? fmt(to) : 'To date'}</span>
          {to && (
            <span role="button" onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onToChange(''); }}
              className="ml-auto text-gray-300 hover:text-gray-500 transition">
              <X size={10} />
            </span>
          )}
        </button>
      </div>

      {/* Calendar dropdown */}
      {open && createPortal(
        <div
          ref={pickerRef}
          data-datepicker-calendar="true"
          style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999, width: 280 }}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
        >
          {/* Picking indicator */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800" style={{ background: 'color-mix(in srgb, var(--accent-600) 8%, var(--color-surface))' }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-600,#2563eb)' }}>
              {open === 'from' ? 'Select start date' : 'Select end date'}
            </span>
            {from && to && (
              <span className="ml-auto text-[10px] font-semibold" style={{ color: 'var(--color-text-3)' }}>
                {fmt(from)} → {fmt(to)}
              </span>
            )}
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
            <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ChevronLeft size={13} />
            </button>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-2 pt-2.5 pb-1">
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 pb-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 px-2 pb-3 gap-y-0.5">
            {Array.from({ length: firstDay(viewYear, viewMonth) }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth(viewYear, viewMonth) }).map((_, i) => {
              const day  = i + 1;
              const isF  = isFrom(viewYear, viewMonth, day);
              const isT  = isTo(viewYear, viewMonth, day);
              const inR  = isInRange(viewYear, viewMonth, day);
              const isTd = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
              const iso  = toIso(viewYear, viewMonth, day);
              // Disable to-dates before from
              const disabled = open === 'to' && from && iso < from;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={!!disabled}
                  onClick={() => !disabled && selectDay(day)}
                  onMouseEnter={() => open === 'to' && setHovered(iso)}
                  onMouseLeave={() => setHovered(null)}
                  className={[
                    'h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs font-medium transition',
                    disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
                    !isF && !isT && !inR && !isTd && !disabled ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800' : '',
                  ].join(' ')}
                  style={isF || isT ? accentStyle : inR ? inRangeStyle : isTd ? todayStyle : {}}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
