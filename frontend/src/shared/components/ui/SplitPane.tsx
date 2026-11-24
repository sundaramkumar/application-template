import { useCallback, useEffect, useRef, useState } from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';

export interface SplitPaneProps {
  left:  React.ReactNode;
  right: React.ReactNode;
  /** Namespaces persisted ratio + collapsed state in localStorage. */
  storageKey?:       string;
  /** Initial left-pane fraction (0..1). */
  defaultRatio?:     number;
  /** Minimum widths (px) enforced while dragging. */
  minLeftPx?:        number;
  minRightPx?:       number;
  /** Allow collapsing the right pane to a rail. Default true. */
  collapsibleRight?: boolean;
  className?:         string;
}

function lsGet(key: string | undefined, suffix: string): string | null {
  if (!key) return null;
  try { return localStorage.getItem(`sp:${key}:${suffix}`); } catch { return null; }
}
function lsSet(key: string | undefined, suffix: string, value: string) {
  if (!key) return;
  try { localStorage.setItem(`sp:${key}:${suffix}`, value); } catch { /* ignore */ }
}

/** Resizable two-column layout: drag the divider to resize, collapse the right
    pane to a rail, persists ratio/collapsed per storageKey. Stacks vertically
    (both panes visible) below the md breakpoint. Dependency-free. */
export function SplitPane({
  left, right, storageKey, defaultRatio = 0.62,
  minLeftPx = 380, minRightPx = 300, collapsibleRight = true, className = '',
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [ratio, setRatio] = useState<number>(() => {
    const n = parseFloat(lsGet(storageKey, 'ratio') ?? '');
    return Number.isFinite(n) && n > 0 && n < 1 ? n : defaultRatio;
  });
  const [collapsed, setCollapsed] = useState<boolean>(() => lsGet(storageKey, 'collapsed') === '1');
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const persistRatio = useCallback((r: number) => {
    setRatio(r); lsSet(storageKey, 'ratio', String(r));
  }, [storageKey]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(c => { const n = !c; lsSet(storageKey, 'collapsed', n ? '1' : '0'); return n; });
  }, [storageKey]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const minR = minLeftPx / rect.width;
      const maxR = 1 - minRightPx / rect.width;
      const r = Math.min(Math.max((e.clientX - rect.left) / rect.width, minR), maxR);
      persistRatio(r);
    };
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [dragging, minLeftPx, minRightPx, persistRatio]);

  // On mobile both panes always show (stacked); collapse only applies on desktop.
  const showRight = !isDesktop || !collapsed;
  // Collapsing only hides the right pane: the left pane keeps its width and position,
  // so the content (e.g. a record form) doesn't reflow or resize.
  const keepLeftWidth = isDesktop && (!collapsed || collapsibleRight);
  const leftStyle = keepLeftWidth ? { width: `${ratio * 100}%` } : undefined;

  return (
    <div ref={containerRef} className={`flex flex-col md:flex-row h-full min-h-0 ${className}`}>
      {/* Left pane */}
      <div className="min-w-0 min-h-0 overflow-auto flex-1 md:flex-none" style={leftStyle}>
        {left}
      </div>

      {/* Divider (desktop, when expanded) */}
      {isDesktop && !collapsed && (
        <div
          onPointerDown={e => { e.preventDefault(); setDragging(true); }}
          role="separator"
          aria-orientation="vertical"
          className="hidden md:flex relative flex-shrink-0 w-2 cursor-col-resize group"
        >
          <div
            className="mx-auto w-px h-full transition-colors group-hover:w-0.5"
            style={{ background: dragging ? 'var(--accent-600)' : 'var(--color-border)' }}
          />
          {collapsibleRight && (
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={toggleCollapsed}
              title="Hide panel"
              className="absolute top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center text-gray-500 hover:text-[var(--accent-600)] transition-colors z-10"
            >
              <PanelRightClose size={13} />
            </button>
          )}
        </div>
      )}

      {/* Right pane */}
      {showRight && (
        <div className="min-w-0 min-h-0 overflow-auto flex-1 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700">
          {right}
        </div>
      )}

      {/* Collapsed (desktop only): the divider stays where it was with a "show" button in the
          same spot as "hide"; the right pane's area is left empty rather than given to the left pane. */}
      {isDesktop && collapsed && collapsibleRight && (
        <>
          <div className="hidden md:flex relative flex-shrink-0 w-2">
            <div className="mx-auto w-px h-full" style={{ background: 'var(--color-border)' }} />
            <button
              onClick={toggleCollapsed}
              title="Show panel"
              className="absolute top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center text-gray-500 hover:text-[var(--accent-600)] transition-colors z-10"
            >
              <PanelRightOpen size={13} />
            </button>
          </div>
          <div className="hidden md:block flex-1 min-w-0" aria-hidden />
        </>
      )}
    </div>
  );
}
