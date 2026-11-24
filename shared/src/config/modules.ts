/* Single source of truth for RBAC modules. `ownable` = records have an owner_id,
   so the own/role/all data scope applies; non-ownable modules ignore scope. */
export type ModuleKey = 'users' | 'roles' | 'audit' | 'apikeys';

export interface ModuleDef {
  key:     ModuleKey;
  label:   string;
  ownable: boolean;
}

export const MODULES: ModuleDef[] = [
  { key: 'users',   label: 'Users',      ownable: false },
  { key: 'roles',   label: 'Roles',      ownable: false },
  { key: 'audit',   label: 'Audit Logs', ownable: false },
  { key: 'apikeys', label: 'API Keys',   ownable: false },
];

export const MODULE_KEYS: ModuleKey[] = MODULES.map(m => m.key);

export function isOwnableModule(key: string): boolean {
  return MODULES.find(m => m.key === key)?.ownable ?? false;
}
