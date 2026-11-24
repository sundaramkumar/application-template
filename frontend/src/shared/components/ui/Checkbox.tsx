import { Check, Minus } from 'lucide-react';

export interface CheckboxProps {
  checked:       boolean;
  onChange:      (checked: boolean) => void;
  /** Renders a dash instead of a tick (e.g. "some selected") */
  indeterminate?: boolean;
  disabled?:     boolean;
  /** Optional label rendered to the right of the box */
  label?:        React.ReactNode;
  className?:    string;
}

export function Checkbox({ checked, onChange, indeterminate, disabled, label, className = '' }: CheckboxProps) {
  const on = checked || indeterminate;
  return (
    <label className={`inline-flex items-center gap-2 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
          on ? 'border-transparent' : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
        }`}
        style={on ? { background: 'var(--accent-600,#2563eb)', borderColor: 'var(--accent-600,#2563eb)' } : undefined}
      >
        {indeterminate
          ? <Minus size={10} className="text-white" strokeWidth={3.5} />
          : checked && <Check size={10} className="text-white" strokeWidth={3.5} />}
      </button>
      {label != null && <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>}
    </label>
  );
}
