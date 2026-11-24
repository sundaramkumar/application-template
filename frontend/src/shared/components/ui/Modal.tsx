import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';

interface ModalProps {
  open:        boolean;
  onClose:     () => void;
  title:       string;
  subtitle?:   string;
  icon?:       React.ReactNode;
  isFetching?: boolean;
  footer?:     React.ReactNode;
  children?:   React.ReactNode;
  size?:       'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export function Modal({
  open, onClose, title, subtitle, icon, isFetching, footer, children, size = 'md',
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  const widthClass  = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : size === 'xl' ? 'max-w-[56rem]' : size === '2xl' ? 'max-w-[76rem]' : size === '3xl' ? 'max-w-[90rem]' : size === '4xl' ? 'max-w-[110rem]' : size === '5xl' ? 'max-w-[130rem]' : 'max-w-xl';
  const maxHeight   = size === 'xl' || size === '2xl' || size === '3xl' || size === '4xl' || size === '5xl' ? '92vh' : '80vh';

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className={`relative w-full ${widthClass} rounded-2xl shadow-2xl flex flex-col`}
        style={{ background: 'var(--color-surface)', maxHeight }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-4 border-b flex-shrink-0 rounded-t-2xl"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--accent-600, #2563eb)'
          }}
        >
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2">
              {icon && <div className="text-white">{icon}</div>}
              <h2 className="text-base font-semibold text-white">{title}</h2>
            </div>
            {subtitle && <p className="text-xs mt-0.5 text-white/80">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition flex-shrink-0 text-white/80 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.1)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 relative">
          {isFetching && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-2xl"
              style={{ background: 'rgba(var(--color-surface-rgb,255,255,255),0.7)' }}
            >
              <Loader2 size={22} className="animate-spin" style={{ color: 'var(--accent-600)' }} />
            </div>
          )}
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
