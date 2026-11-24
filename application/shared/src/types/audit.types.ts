export type AuditAction = 'create' | 'update' | 'delete';

export interface AuditChange {
  old: unknown;
  new: unknown;
}

export interface AuditLog {
  id:          string;
  record_type: string;                       // module: 'user' | 'role' | …
  record_id:   string;
  action:      AuditAction;
  actor_id:    string | null;
  actor_name:  string | null;                // resolved at read time
  changes:     Record<string, AuditChange>;  // { field: { old, new } }
  created_at:  string | null;
}
