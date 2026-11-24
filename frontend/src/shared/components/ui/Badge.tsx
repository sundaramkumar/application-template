export type BadgeVariant = 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'accent';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?:  BadgeVariant;
  size?:     BadgeSize;
  className?: string;
  children:  React.ReactNode;
}

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  danger:  'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  info:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  accent:  '',
};

const SIZES: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-[11px] px-2 py-0.5',
};

export function Badge({ variant = 'neutral', size = 'md', className = '', children }: BadgeProps) {
  const isAccent = variant === 'accent';
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full whitespace-nowrap ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      style={isAccent ? {
        background: 'color-mix(in srgb, var(--accent-600,#2563eb) 12%, transparent)',
        color:      'var(--accent-700,#1d4ed8)',
      } : undefined}
    >
      {children}
    </span>
  );
}
