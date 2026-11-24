import type { RoleType, RolePermissionRow } from './permission.types';

export interface Role {
  id:          string;
  name:        string;
  type?:       RoleType;     // 'admin' (full bypass) | 'user' (governed)
  is_system?:  boolean;      // built-in role — protected from edit/delete
  created_at?:      string | null;
  updated_at?:      string | null;
  created_by?:      string | null;
  created_by_name?: string | null;   // null = system / seed
  updated_by?:      string | null;
  updated_by_name?: string | null;
}

/** Role with its permission matrix (returned by the role detail endpoint). */
export interface RoleWithPermissions extends Role {
  permissions: RolePermissionRow[];
}

export interface RoleListResponse {
  data:  Role[];
  total: number;
}

export interface RoleCreateRequest {
  name:  string;
  type?: RoleType;
}

export interface RoleUpdateRequest {
  name?: string;
  type?: RoleType;
}
