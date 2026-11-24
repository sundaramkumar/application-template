import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  label:     string;
  children:  React.ReactNode;
  side?:     'top' | 'bottom' | 'right';
  delay?:    number;
}

export function Tooltip({ label, children, side = 'top', delay = 400 }: TooltipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const timer  = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapRef = useRef<HTMLSpanElement>(null);

  // When tooltip is visible, watch for the mouse leaving the trigger area.
  // onMouseLeave alone misses the case where a modal portal opens on top of the
  // trigger — the span never gets a leave event, so the tooltip lingers at z-9999
  // and overlays the dialog's close button.
  useEffect(() => {
    if (!pos) return;
    function onMove(e: MouseEvent) {
      const r = wrapRef.current?.getBoundingClientRect();
      if (!r || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
        clearTimeout(timer.current);
        setPos(null);
      }
    }
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, [pos]);

  if (!label) return <>{children}</>;

  function show() {
    timer.current = setTimeout(() => {
      const r = wrapRef.current?.getBoundingClientRect();
      if (!r) return;
      if (side === 'right') setPos({ x: r.right, y: r.top + r.height / 2 });
      else setPos({ x: r.left + r.width / 2, y: side === 'top' ? r.top : r.bottom });
    }, delay);
  }

  function hide() {
    clearTimeout(timer.current);
    setPos(null);
  }

  const boxStyle = side === 'right'
    ? { left: pos?.x ?? 0 + 8, top: pos?.y, transform: 'translate(8px, -50%)' }
    : { left: pos?.x, top: side === 'top' ? (pos?.y ?? 0) - 8 : (pos?.y ?? 0) + 8,
        transform: side === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)' };

  return (
    <>
      <span ref={wrapRef} className="inline-flex" onMouseEnter={show} onMouseLeave={hide}>
        {children}
      </span>

      {pos && createPortal(
        <div className="fixed z-[9999] pointer-events-none" style={boxStyle}>
          <div className="bg-gray-900 dark:bg-gray-700 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
            {label}
          </div>
          {side === 'right'
            ? <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
            : <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"
                style={side === 'top' ? { bottom: -4 } : { top: -4 }} />
          }
        </div>,
        document.body,
      )}
    </>
  );
}
