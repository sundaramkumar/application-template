import { Store } from 'lucide-react';
import { Tooltip } from './Tooltip';

/**
 * Drop this into the `storeFilter` slot of DataTable for screens that have
 * no store concept — shows a crossed-out store icon indicating global data.
 */
export function GlobalDataBadge() {
  return (
    <Tooltip label="Common across all stores">
      <div
        className="relative h-8 w-8 flex items-center justify-center rounded-lg select-none cursor-default"
        style={{
          background:  'var(--color-hover)',
          border:      '1px solid var(--color-border)',
          color:       'var(--color-text-3)',
        }}
      >
        <Store size={13} />
        {/* Diagonal slash overlay */}
        <div
          className="absolute pointer-events-none"
          style={{
            width:        '1.5px',
            height:       '18px',
            background:   'currentColor',
            transform:    'rotate(-45deg)',
            borderRadius: '1px',
          }}
        />
      </div>
    </Tooltip>
  );
}
