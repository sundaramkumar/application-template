interface Props {
  icon:       React.ElementType;
  iconBg?:    string;
  iconColor?: string;
  title:      string;
  subtitle?:  string;
  actions?:   React.ReactNode;
}

export function PageHeader({
  icon: Icon,
  iconBg    = 'bg-blue-100 dark:bg-blue-900/30',
  iconColor = 'text-blue-600 dark:text-blue-400',
  title,
  subtitle,
  actions,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
