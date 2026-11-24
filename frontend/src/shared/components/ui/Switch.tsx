export interface SwitchProps {
  checked:    boolean;
  onChange:   (checked: boolean) => void;
  disabled?:  boolean;
  /** Optional label rendered to the right of the track */
  label?:     React.ReactNode;
  className?: string;
}

export function Switch({ checked, onChange, disabled, label, className = '' }: SwitchProps) {
  return (
    <label className={`inline-flex items-center gap-2.5 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
          checked ? '' : 'bg-gray-300 dark:bg-gray-600'
        }`}
        style={checked ? { background: 'var(--accent-600,#2563eb)' } : undefined}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      {label != null && <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>}
    </label>
  );
}
