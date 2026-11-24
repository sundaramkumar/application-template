import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'danger-soft' | 'ghost';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  /** Shows a spinner and disables the button */
  loading?:   boolean;
  /** Icon rendered before the label */
  leftIcon?:  React.ReactNode;
  /** Icon rendered after the label */
  rightIcon?: React.ReactNode;
  /** Stretch to fill the container width */
  block?:     boolean;
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
};

/* Variants use CSS theme vars (var(--accent-*)) so they follow the active accent.
   Non-accent variants use Tailwind classes for hover. */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:   'text-white border-transparent',
  secondary: 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border-transparent',
  danger:    'text-white bg-red-600 hover:bg-red-700 border-transparent',
  /* Muted destructive action for toolbars/headers (the confirm dialog stays solid red). */
  'danger-soft': 'text-[#a02b2b] bg-white border-[#a02b2b]/25 hover:bg-[#a02b2b]/[0.06] hover:border-[#a02b2b]/40 dark:text-red-400 dark:bg-transparent dark:border-red-900/60 dark:hover:bg-red-950/40',
  ghost:     'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, leftIcon, rightIcon, block,
    disabled, className = '', children, style, ...props },
  ref,
) {
  const isPrimary = variant === 'primary';
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center font-semibold border rounded-lg',
        'transition disabled:opacity-60 disabled:cursor-not-allowed',
        SIZES[size],
        VARIANTS[variant],
        block ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={isPrimary ? { background: 'var(--accent-600,#2563eb)', ...style } : style}
      onMouseEnter={isPrimary && !disabled && !loading
        ? (e) => { e.currentTarget.style.background = 'var(--accent-700,#1d4ed8)'; }
        : undefined}
      onMouseLeave={isPrimary
        ? (e) => { e.currentTarget.style.background = 'var(--accent-600,#2563eb)'; }
        : undefined}
      {...props}
    >
      {loading ? <Loader2 size={size === 'sm' ? 14 : 15} className="animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
