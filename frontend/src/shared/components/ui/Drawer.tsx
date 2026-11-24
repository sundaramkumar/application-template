import { X, Loader2 } from 'lucide-react';

interface Props {
  open:        boolean;
  onClose:     () => void;
  title:       string;
  subtitle?:   string;
  children:    React.ReactNode;
  footer?:     React.ReactNode;
  width?:      string;
  isFetching?: boolean;
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-md', isFetching }: Props) {
  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className={`fixed right-0 top-0 h-full w-full ${width} bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col`}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
              {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
            {isFetching && <Loader2 size={14} className="animate-spin text-gray-400 flex-shrink-0" />}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition flex-shrink-0 ml-4"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
