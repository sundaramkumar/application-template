/* ── Shared types (re-exported for convenience) ────────────────── */

export type {
  ApiResponse,
  PaginatedMeta,
  PaginatedResponse,
  ApiError as ErrorResponse,
  FilterOperator,
  FilterParam,
  FilterGroup,
  FilterConfig,
  AuthUser,
  AuthLoginResponse,
} from '@shared';

/* ── Frontend-extended list params ────────────────────────────── */

export interface ListQueryParams {
  page?:          number;
  limit?:         number;
  sort?:          string;
  order?:         'asc' | 'desc';
  search?:        string;
  filters?:       import('@shared').FilterParam[];
  filterGroups?:  import('@shared').FilterConfig;
  hasDuplicate?:  boolean;
  duplicateGroup?: string;
}

/* ── Frontend-specific types ──────────────────────────────────── */

export interface UserPreferences {
  accent?:      string;
  mode?:        string;
  customColor?: string;
}

export type FieldPermission = 'none' | 'view' | 'edit';

export interface ModulePermission {
  canRead: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean;
  viewAll: boolean;
}

export interface UserPermissions {
  isAdmin: boolean;
  modules: Record<string, ModulePermission>;
  fields:  Record<string, Record<string, FieldPermission>>;
}

export interface Role {
  id: string; name: string; description?: string | null;
  color: string; isSystem: boolean; userCount?: number; createdAt: string;
}

export interface RoleWithPermissions extends Role {
  modules: Record<string, ModulePermission>;
  fields:  Record<string, Record<string, FieldPermission>>;
}

export interface UserWithRole {
  id: string; name: string; email: string;
  role: string; roleId: string | null;
  active: boolean;
  roleName?: string | null; roleColor?: string | null;
  createdAt: string;
}

export interface DuplicateGroup { id: string; logic: 'AND' | 'OR'; fields: string[]; }
export interface DuplicateRules { enabled: boolean; logic: 'AND' | 'OR'; groups: DuplicateGroup[]; }
export interface ScanResult { assigned: number; cleared: number; groups: number; }
export interface ContactMatchMapping { id: string; leadField: string; contactField: string; }
export interface ContactMatchRules { enabled: boolean; mappings: ContactMatchMapping[]; }
export interface MatchedContact { id: string; firstName: string | null; lastName: string | null; email: string | null; phone: string | null; contactStatus: string | null; }
export interface AccountMatchMapping { id: string; leadField: string; accountField: string; }
export interface AccountMatchRules { enabled: boolean; mappings: AccountMatchMapping[]; }
export interface MatchedAccount { id: string; name: string; phone: string | null; email: string | null; industry: string | null; type: string | null; }
