export type FilterType = 'text' | 'select' | 'user' | 'date' | 'number';

export const BOOLEAN_FILTER_OPTIONS = ['true', 'false'];

export function fieldTypeToFilterType(type: string): FilterType {
  if (['dropdown', 'multi_select', 'radio', 'boolean'].includes(type)) return 'select';
  if (type === 'user') return 'user';
  if (['date', 'datetime'].includes(type)) return 'date';
  if (['number', 'decimal', 'integer', 'currency', 'percent', 'rating'].includes(type)) return 'number';
  return 'text';
}

/** Returns filter options for a field, injecting defaults for types that have no stored options (e.g. boolean). */
export function fieldFilterOptions(f: { type: string; options?: string[] | null }): string[] | undefined {
  if (f.type === 'boolean') return BOOLEAN_FILTER_OPTIONS;
  return f.options?.length ? f.options : undefined;
}
