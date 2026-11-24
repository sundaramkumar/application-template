import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Pencil, Trash2, History } from 'lucide-react';
import type { AuditLog, AuditAction } from '@shared';
import { listAuditApi } from '../api/audit.api';
import { fmtChangeValue, fmtField } from '../format';

/* Colour is the only signal that differs per action: icon node + label.
   Everything else in the feed stays neutral so the colours carry meaning. */
const ACTION_STYLE: Record<AuditAction, { label: string; icon: typeof Plus; node: string; text: string }> = {
  create: { label: 'Created', icon: Plus,   node: 'bg-emerald-50 text-emerald-600 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-800', text: 'text-emerald-700 dark:text-emerald-400' },
  update: { label: 'Updated', icon: Pencil, node: 'bg-sky-50 text-sky-600 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:ring-sky-800',                 text: 'text-sky-700 dark:text-sky-400' },
  delete: { label: 'Deleted', icon: Trash2, node: 'bg-red-50 text-red-600 ring-red-200 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-800',                 text: 'text-red-700 dark:text-red-400' },
};

function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Field-by-field diff: label column + old (struck, red) → new (green), aligned in a grid. */
function Changes({ changes }: { changes: AuditLog['changes'] }) {
  const keys = Object.keys(changes);
  if (!keys.length) return null;
  return (
    <dl className="mt-2 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 px-3 py-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
      {keys.map(k => (
        <div key={k} className="contents">
          <dt className="text-[11px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtField(k)}</dt>
          <dd className="text-[11px] min-w-0 flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-red-600/80 dark:text-red-400/80 line-through decoration-red-300 dark:decoration-red-700 break-all">{fmtChangeValue(changes[k].old)}</span>
            <span className="text-gray-300 dark:text-gray-600">→</span>
            <span className="font-medium text-emerald-700 dark:text-emerald-400 break-all">{fmtChangeValue(changes[k].new)}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Compact colour key for the timeline — visible even before any history exists. */
export function AuditLegend() {
  return (
    <div className="flex items-center gap-2.5">
      {(Object.keys(ACTION_STYLE) as AuditAction[]).map(k => (
        <span key={k} className={`flex items-center gap-1 text-[10px] font-medium ${ACTION_STYLE[k].text}`}>
          <span className={`w-2 h-2 rounded-full ring-1 ${ACTION_STYLE[k].node}`} />
          {ACTION_STYLE[k].label}
        </span>
      ))}
    </div>
  );
}

/** Reusable per-record activity feed, fed by the audit log. */
export function AuditTimeline({ recordType, recordId }: { recordType: string; recordId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['audit', recordType, recordId],
    queryFn:  () => listAuditApi({ record_type: recordType, record_id: recordId, limit: 50 }),
    staleTime: 30_000,
  });
  const entries = data?.data ?? [];

  if (isLoading) {
    return <div className="py-6 flex justify-center"><Loader2 size={18} className="animate-spin text-gray-400" /></div>;
  }
  if (!entries.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-8 flex flex-col items-center gap-2 text-center">
        <History size={18} className="text-gray-300 dark:text-gray-600" />
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">No activity yet</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 max-w-[220px]">Every save is recorded here, with each changed field shown old → new.</p>
      </div>
    );
  }
  return (
    <ol>
      {entries.map((a, i) => {
        const st = ACTION_STYLE[a.action];
        const Icon = st.icon;
        const last = i === entries.length - 1;
        const hasChanges = a.action === 'update' && Object.keys(a.changes).length > 0;
        return (
          <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
            {/* Connector runs through the centre of the 24px icon node */}
            {!last && <span aria-hidden className="absolute left-3 top-6 bottom-0 w-px -translate-x-1/2 bg-gray-200 dark:bg-gray-700" />}
            <span className={`relative z-[1] w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ${st.node}`}>
              <Icon size={12} strokeWidth={2.5} />
            </span>

            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs text-gray-600 dark:text-gray-300 min-w-0 truncate">
                  <span className={`font-semibold ${st.text}`}>{st.label}</span>
                  <span className="text-gray-400"> by </span>
                  <span className="font-medium text-gray-800 dark:text-gray-100">{a.actor_name ?? 'System'}</span>
                </p>
                {a.created_at && (
                  <time dateTime={a.created_at} title={new Date(a.created_at).toLocaleString()}
                    className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0 tabular-nums">
                    {timeAgo(a.created_at)}
                  </time>
                )}
              </div>
              {hasChanges
                ? <Changes changes={a.changes} />
                : a.action === 'update' && <p className="text-[11px] text-gray-400 mt-0.5">No field changes recorded</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
