/* Record ids are UUIDs (v7 for app-created rows). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A route `:id` param as a UUID, or null when missing/malformed (→ "couldn't load"). */
export function parseRouteId(id: string | undefined): string | null {
  return id && UUID_RE.test(id) ? id : null;
}

/** Compact display form — first block of the UUID (full value belongs in a tooltip). */
export const shortId = (id: string) => id.split('-')[0];
