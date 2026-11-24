import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

export interface DatePickerProps {
  value:        string;       // 'YYYY-MM-DD' or ''
  onChange:     (v: string) => void;
  placeholder?: string;
  disabled?:    boolean;
  readOnly?:    boolean;
  className?:   string;
  size?:        'sm' | 'md';
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  readOnly = false,
  className = '',
  size = 'md',
}: DatePickerProps) {
  const today  = new Date();
  const parsed = value ? new Date(value + 'T00:00:00') : null;

  const [open,      setOpen]      = useState(false);
  const [viewYear,  setViewYear]  = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth()    ?? today.getMonth());
  const [pos,       setPos]       = useState({ top: 0, left: 0, openUp: false });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const pickerRef  = useRef<HTMLDivElement>(null);

  function openCalendar() {
    if (!triggerRef.current) return;
    const rect        = triggerRef.current.getBoundingClientRect();
    const pickerH     = 296;
    const pickerW     = 256; // Calendar width
    const spaceBelow  = window.innerHeight - rect.bottom - 8;
    const spaceRight  = window.innerWidth - rect.left - 8;
    const openUp      = spaceBelow < pickerH && rect.top > pickerH;

    // Calculate horizontal position - align right edge if not enough space
    let leftPos = rect.left + window.scrollX;
    if (spaceRight < pickerW) {
      // Not enough space on the right, align to right edge of trigger
      leftPos = rect.right + window.scrollX - pickerW;
    }

    // Ensure calendar doesn't go off the left edge
    if (leftPos < window.scrollX + 8) {
      leftPos = window.scrollX + 8;
    }

    setPos({
      top:    openUp ? rect.top + window.scrollY - pickerH - 4
                     : rect.bottom + window.scrollY + 4,
      left:   leftPos,
      openUp,
    });
    if (parsed) { setViewYear(parsed.getFullYear()); setViewMonth(parsed.getMonth()); }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        pickerRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function selectDay(day: number) {
    const d   = new Date(viewYear, viewMonth, day);
    const iso = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
    onChange(iso);
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const displayValue = parsed
    ? size === 'sm'
      ? parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
      : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  const triggerPad  = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2.5 text-sm';
  const iconSize    = size === 'sm' ? 12 : 14;

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => { if (readOnly) return; open ? setOpen(false) : openCalendar(); }}
        onFocus={() => { if (!readOnly && !disabled && !open) openCalendar(); }}
        className={[
          'flex items-center gap-1.5 w-full rounded-lg border transition-colors',
          'border-gray-200 dark:border-gray-700',
          'bg-white dark:bg-gray-800',
          'text-gray-800 dark:text-gray-100',
          (!open && !readOnly) ? 'hover:border-gray-300 dark:hover:border-gray-600' : '',
          'focus:outline-none',
          readOnly ? 'cursor-default' : '',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          triggerPad,
        ].join(' ')}
        style={open ? { borderColor: 'var(--accent-600)', boxShadow: '0 0 0 2px color-mix(in srgb, var(--accent-600) 20%, transparent)' } : {}}
      >
        <Calendar size={iconSize} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
        <span className={`flex-1 text-left ${size === 'sm' ? 'min-w-0' : 'truncate'}`}>
          {displayValue
            ? displayValue
            : <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
          }
        </span>
        {value && !readOnly && (
          <span
            role="button"
            tabIndex={-1}
            onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onChange(''); }}
            className="flex items-center text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition"
          >
            <X size={10} />
          </span>
        )}
        {!readOnly && (
          <ChevronDown
            size={iconSize}
            className={`flex-shrink-0 text-gray-400 dark:text-gray-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Calendar portal */}
      {createPortal(
        <div
          ref={pickerRef}
          style={{
            position: 'absolute',
            top:      pos.top,
            left:     pos.left,
            zIndex:   9999,
            display:  open ? 'block' : 'none',
            width:    256,
          }}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden"
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 px-2 pt-2.5 pb-1">
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 pb-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 px-2 pb-3 gap-y-0.5">
            {Array.from({ length: firstDayOfMonth(viewYear, viewMonth) }).map((_, i) => (
              <div key={`e${i}`} />
            ))}
            {Array.from({ length: daysInMonth(viewYear, viewMonth) }).map((_, i) => {
              const day        = i + 1;
              const isSelected = parsed?.getFullYear() === viewYear && parsed?.getMonth() === viewMonth && parsed?.getDate() === day;
              const isToday    = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={[
                    'h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs font-medium transition',
                    !isSelected && !isToday
                      ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      : '',
                  ].join(' ')}
                  style={
                    isSelected
                      ? { background: 'var(--accent-600)', color: '#fff' }
                      : isToday
                        ? { background: 'var(--accent-100)', color: 'var(--accent-600)', fontWeight: 700 }
                        : {}
                  }
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
