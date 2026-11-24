export interface FieldProps {
  label:     string;
  required?: boolean;
  error?:    string;
  /** Helper text shown below the control when there's no error */
  hint?:     string;
  htmlFor?:  string;
  className?: string;
  children:  React.ReactNode;
}

/** Label + required marker + error/hint wrapper for form controls. */
export function Field({ label, required, error, hint, htmlFor, className = '', children }: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error
        ? <p className="text-[11px] text-red-500">{error}</p>
        : hint
          ? <p className="text-[11px] text-gray-400 dark:text-gray-500">{hint}</p>
          : null}
    </div>
  );
}
