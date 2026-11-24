import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';

interface Props {
  open:          boolean;
  title:         string;
  message:       string;
  confirmLabel?: string;
  cancelLabel?:  string;
  variant?:      'danger' | 'warning' | 'info';
  isLoading?:    boolean;
  onConfirm:     () => void;
  onCancel:      () => void;
}

const variants = {
  danger:  { icon: AlertTriangle, iconBg: 'bg-red-100 dark:bg-red-900/30',    iconColor: 'text-red-600 dark:text-red-400',    btn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500' },
  warning: { icon: AlertTriangle, iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400', btn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500' },
  info:    { icon: Info,          iconBg: 'bg-blue-100 dark:bg-blue-900/30',   iconColor: 'text-blue-600 dark:text-blue-400',   btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' },
};

export function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  variant      = 'danger',
  isLoading    = false,
  onConfirm,
  onCancel,
}: Props) {
  // Handle Esc and Space key press
  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (!open) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      } else if (event.code === 'Space') {
        event.preventDefault();
        onConfirm();
      }
    }

    if (open) {
      document.addEventListener('keydown', handleKeyboard);
      return () => document.removeEventListener('keydown', handleKeyboard);
    }
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  const { icon: Icon, iconBg, iconColor, btn } = variants[variant];

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 z-[9100] backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-[9100] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto border border-gray-100 dark:border-gray-700">
          <div className="p-6 space-y-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconBg}`}>
              <Icon size={24} className={iconColor} />
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 transition ${btn}`}
              >
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                {isLoading ? 'Please wait…' : confirmLabel}
              </button>
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition"
              >
                {cancelLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
