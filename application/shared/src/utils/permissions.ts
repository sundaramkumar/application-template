import { MODULES, isOwnableModule } from '../config/modules';
import type { RolePermissionRow } from '../types/permission.types';

const moduleLabel = (key: string) => MODULES.find(m => m.key === key)?.label ?? key;

/** Human-readable summary of a permission set — e.g.
    "Users: Read, Create · Roles: Read". Used for audit display on both sides. */
export function summarizePermissions(rows: RolePermissionRow[]): string {
  const parts = rows
    .filter(r => r.can_read || r.can_create || r.can_update || r.can_delete)
    .map(r => {
      const acts = [
        r.can_read   && 'Read',
        r.can_create && 'Create',
        r.can_update && 'Update',
        r.can_delete && 'Delete',
      ].filter(Boolean).join(', ');
      const scope = isOwnableModule(r.module) && r.scope !== 'all' ? ` (${r.scope})` : '';
      return `${moduleLabel(r.module)}: ${acts}${scope}`;
    });
  return parts.length ? parts.join(' · ') : 'None';
}
