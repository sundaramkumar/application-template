import { HardHat } from 'lucide-react';

export function UnderConstruction({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--accent-50,#eff6ff)' }}
      >
        <HardHat size={36} style={{ color: 'var(--accent-400,#60a5fa)' }} />
      </div>
      <h2 className="text-lg font-semibold text-gray-600 dark:text-gray-300">{label}</h2>
      <p className="text-sm text-gray-400 dark:text-gray-500">
        This module is under construction. Coming soon.
      </p>
    </div>
  );
}
