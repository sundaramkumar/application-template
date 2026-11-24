import { ArrowLeft, Activity, Info } from 'lucide-react';
import { Button, Field } from '@/shared/components/ui';
import { AuditTimeline, AuditLegend } from '@/features/audit/components/AuditTimeline';
import { shortId } from '@/shared/lib/ids';

/* Building blocks shared by every record page (view / create / edit) and master list,
   so Users, Roles and future modules look and align the same way. */

/** Fixed white card; the ground behind it follows the theme background (--color-bg). */
export function Panel({ icon, title, action, bodyClassName = 'p-4', children }: {
  icon?: React.ReactNode; title?: string; action?: React.ReactNode; bodyClassName?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">{icon}{title}</h3>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

/** Pane ground painted with the user-chosen page background. */
export function PaneGround({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`min-h-full ${className}`} style={{ backgroundColor: 'var(--color-bg)' }}>{children}</div>;
}

/** Read-only value in the exact footprint of an Input/Select (42px), so view and edit
    modes share one layout and nothing shifts when switching between them. */
export function ReadValue({ label, children, muted, className }: {
  label: string; children?: React.ReactNode; muted?: boolean; className?: string;
}) {
  const has = children !== null && children !== undefined && children !== '';
  return (
    <Field label={label} className={className}>
      <div className={`h-[42px] flex items-center px-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-sm truncate ${
        has && !muted ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
        {has ? children : '—'}
      </div>
    </Field>
  );
}

export function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  const has = value !== null && value !== undefined && value !== '';
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-xs font-medium text-right tabular-nums ${has ? 'text-gray-800 dark:text-gray-100' : 'text-gray-300 dark:text-gray-600'}`}>
        {has ? value : '—'}
      </span>
    </div>
  );
}

/** Initials in an accent-tinted circle; `icon` is shown for a new record or when there's no name. */
export function IdentityAvatar({ name, icon }: { name?: string; icon: React.ReactNode }) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const initials = parts.length ? (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() : '';
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
      style={{ background: 'color-mix(in srgb, var(--accent-600) 12%, transparent)', color: 'var(--accent-600)' }}>
      {initials || icon}
    </div>
  );
}

/** Record page top bar: back · avatar · title + badges / subtitle · actions. */
export function RecordHeader({ onBack, avatar, title, badges, subtitle, actions }: {
  onBack: () => void; avatar: React.ReactNode; title: string; badges?: React.ReactNode;
  subtitle?: string; actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-3 min-w-0">
        <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={15} />}>Back</Button>
        <span aria-hidden className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
        {avatar}
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">{title}</h2>
            {badges}
          </div>
          {subtitle && <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

/** Card footer for create/edit forms: dirty indicator left, Cancel / Save right. Sticky. */
export function FormFooter({ isDirty, mode, pending, submitLabel, submitDisabled, onCancel }: {
  isDirty: boolean; mode: 'create' | 'edit'; pending: boolean;
  submitLabel: string; submitDisabled?: boolean; onCancel: () => void;
}) {
  return (
    <div className="sticky bottom-0 flex items-center gap-2 px-6 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur rounded-b-xl">
      <span className={`mr-auto flex items-center gap-1.5 text-xs font-medium ${isDirty ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isDirty ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
        {isDirty ? 'Unsaved changes' : mode === 'edit' ? 'No changes yet' : 'Fields marked * are required'}
      </span>
      <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={onCancel}>Cancel</Button>
      <Button type="submit" variant="primary" size="sm" loading={pending} disabled={submitDisabled}>{submitLabel}</Button>
    </div>
  );
}

/** Created/updated audit fields shared by every record. */
export interface AuditStamp {
  id: string;
  created_at?: string | null; created_by_name?: string | null;
  updated_at?: string | null; updated_by_name?: string | null;
}

/** Right pane: Details card (record-specific rows + audit stamps) and Activity card. */
export function RecordInfoPane({ record, recordType, children }: {
  record: AuditStamp | null; recordType: string; children?: React.ReactNode;
}) {
  const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : null);
  return (
    <PaneGround className="p-4 space-y-4">
      {!record ? (
        <Panel icon={<Activity size={13} />} title="Activity">
          <p className="text-xs text-gray-400 py-4 text-center">Save to create the record — its details and history will appear here.</p>
        </Panel>
      ) : (
        <>
          <Panel icon={<Info size={13} />} title="Details" bodyClassName="px-4 py-1">
            <InfoRow label="Record ID" value={<span className="font-mono" title={record.id}>{shortId(record.id)}…</span>} />
            {children}
            <InfoRow label="Created At" value={when(record.created_at)} />
            <InfoRow label="Created By" value={record.created_by_name ?? 'System'} />
            <InfoRow label="Updated At" value={when(record.updated_at)} />
            <InfoRow label="Updated By" value={record.updated_by_name ?? 'System'} />
          </Panel>
          <Panel icon={<Activity size={13} />} title="Activity" action={<AuditLegend />}>
            <AuditTimeline recordType={recordType} recordId={record.id} />
          </Panel>
        </>
      )}
    </PaneGround>
  );
}

/* ── List cells for the audit columns ─────────────────────────────── */

export function DateTimeCell({ iso }: { iso?: string | null }) {
  if (!iso) return <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>—</span>;
  const d = new Date(iso);
  return (
    <span className="flex flex-col leading-tight whitespace-nowrap" title={d.toLocaleString()}>
      <span className="text-xs" style={{ color: 'var(--color-text-1)' }}>{d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      <span className="text-[11px] tabular-nums" style={{ color: 'var(--color-text-3)' }}>{d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
    </span>
  );
}

/** Creator / editor name; a null actor means the record came from the system (seed, import). */
export function ActorCell({ name }: { name?: string | null }) {
  return name
    ? <span className="text-xs whitespace-nowrap" style={{ color: 'var(--color-text-1)' }}>{name}</span>
    : <span className="text-xs italic" style={{ color: 'var(--color-text-3)' }}>System</span>;
}
