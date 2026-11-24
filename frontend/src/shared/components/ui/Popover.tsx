import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Pos { top?: number; bottom?: number; left?: number; right?: number; width?: number | string }

export interface PopoverProps {
  /** The clickable element. It is wrapped in a span that toggles the popover. */
  trigger:   React.ReactNode;
  /** Panel content. Pass a function to receive a `close()` callback. */
  children:  React.ReactNode | ((close: () => void) => React.ReactNode);
  /** Horizontal alignment of the panel relative to the trigger. Default 'right'. */
  align?:    'left' | 'right';
  /** Fixed panel width in px (or any CSS width). Ignored when matchWidth is set. */
  width?:    number | string;
  /** Make the panel width match the trigger width (anchored dropdowns). */
  matchWidth?: boolean;
  /** Minimum width (px) when matchWidth is set. */
  minWidth?:   number;
  /** Open upward when there isn't enough room below. Default false. */
  flip?:     boolean;
  /** Gap (px) between trigger and panel. Default 6. */
  gap?:      number;
  /** Disable the built-in click-to-toggle (e.g. disabled trigger). */
  disabled?: boolean;
  /** Extra classes for the panel. */
  className?: string;
  /** Stretch the trigger wrapper to its container's width (form fields). */
  block?:     boolean;
  /** Controlled open state (optional). */
  open?:         boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Anchored, auto-positioned popover: portals to <body>, repositions on
    scroll/resize, optionally matches the trigger width and flips upward, and
    closes on outside-click or Escape. Backs dropdown menus, the table column
    menu, the filter panel, Select/DatePicker, etc. */
export function Popover({
  trigger, children, align = 'right', width, matchWidth, minWidth, flip = false,
  gap = 6, disabled = false, className = '', block = false, open: openProp, onOpenChange,
}: PopoverProps) {
  const isControlled = openProp !== undefined;
  const [openState, setOpenState] = useState(false);
  const open = isControlled ? openProp : openState;

  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const labelId = useId();

  const setOpen = useCallback((next: boolean) => {
    if (!isControlled) setOpenState(next);
    onOpenChange?.(next);
  }, [isControlled, onOpenChange]);

  const close = useCallback(() => setOpen(false), [setOpen]);

  const reposition = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const panelH     = panelRef.current?.offsetHeight ?? 0;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const openUp     = flip && panelH > 0 && spaceBelow < panelH && rect.top - gap > spaceBelow;

    const next: Pos = {
      top:    openUp ? undefined : rect.bottom + gap,
      bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
      width:  matchWidth ? Math.max(rect.width, minWidth ?? 0) : width,
    };
    if (matchWidth || align === 'left') next.left  = Math.max(8, rect.left);
    else                                next.right = Math.max(8, window.innerWidth - rect.right);
    setPos(next);
  }, [align, gap, flip, matchWidth, minWidth, width]);

  // Recompute position before paint whenever the panel opens.
  useLayoutEffect(() => { if (open) reposition(); }, [open, reposition]);
  // Clear stale position when closing so the next open re-measures cleanly.
  useEffect(() => { if (!open) setPos(null); }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      // Ignore clicks inside any other popover panel (e.g. a Select opened
      // within this one). That panel's own handler manages it; closing here
      // would dismiss us too — the nested-popover case.
      if (t instanceof Element && t.closest('[data-popover-panel]')) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onScrollResize = () => reposition();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScrollResize);
    window.addEventListener('scroll', onScrollResize, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScrollResize);
      window.removeEventListener('scroll', onScrollResize, true);
    };
  }, [open, close, reposition]);

  return (
    <span className={block ? 'relative flex w-full' : 'relative inline-flex'}>
      <span
        ref={anchorRef}
        onClick={() => { if (!disabled) setOpen(!open); }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? labelId : undefined}
        className={block ? 'flex w-full' : 'inline-flex'}
      >
        {trigger}
      </span>

      {open && createPortal(
        <div
          ref={panelRef}
          id={labelId}
          role="dialog"
          data-popover-panel=""
          /* z-[9000] = container layer (like Modal). Dropdowns/Selects opened
             inside use z-9999 so they correctly render above this panel. */
          className={`fixed z-[9000] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl ${className}`}
          style={{
            top: pos?.top, bottom: pos?.bottom, left: pos?.left, right: pos?.right,
            width: pos?.width ?? width,
            visibility: pos ? 'visible' : 'hidden',
          }}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>,
        document.body,
      )}
    </span>
  );
}
