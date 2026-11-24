interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      {...props}
      className={[
        'w-full rounded-lg border px-3 py-2.5 text-sm',
        'border-gray-200 dark:border-gray-700',
        'bg-white dark:bg-gray-800',
        'text-gray-900 dark:text-white',
        'placeholder-gray-400 dark:placeholder-gray-500',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition',
        className,
      ].join(' ')}
    />
  );
}
