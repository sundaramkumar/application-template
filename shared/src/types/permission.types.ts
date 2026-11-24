import type { ModuleKey } from '../config/modules';

export type RecordScope     = 'own' | 'role' | 'all';
export type PermissionAction = 'read' | 'create' | 'update' | 'delete';
export type RoleType        = 'admin' | 'user';

/** Effective permission for one module. */
export interface ModulePermission {
  read:   boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  scope:  RecordScope;
}

/** Resolved permissions for the current principal (user session or API key). */
export interface UserPermissions {
  isAdmin: boolean;                              // admin role type → full bypass
  modules: Record<string, ModulePermission>;
}

/** A persisted role_permissions row (one per role × module). */
export interface RolePermissionRow {
  module:     ModuleKey | string;
  can_read:   boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  scope:      RecordScope;
}
