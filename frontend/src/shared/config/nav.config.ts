import { Home, Layers, Users, KeyRound, ShieldCheck, ScrollText, KeySquare, BookOpen } from 'lucide-react';

export interface NavItem {
  key:          string;             // route key → /<key>; '' = home
  label:        string;             // display name everywhere
  icon:         React.ElementType;  // lucide-react icon
  description:  string;             // Home screen card subtitle (longer)
  subtitle?:    string;             // Topbar subtitle (shorter)
  implemented:  boolean;            // false → UnderConstruction screen
  hidden?:      boolean;            // true → hidden from sidebar and home (route still works)
  module?:      string;             // RBAC module key; item requires <module>:read
}

export interface NavGroup {
  group: string;            // label shown in flyout header and expanded sidebar
  icon:  React.ElementType; // icon for the group button in the sidebar
  items: NavItem[];
}

// Home is always first — rendered without a group, navigates directly
export const HOME_NAV: NavItem = {
  key:         '',
  label:       'Home',
  icon:        Home,
  description: 'Dashboard and quick access to all modules',
  implemented: true,
};

export const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Master',
    icon:  Layers,
    items: [
      {
        key:         'users',
        label:       'Users',
        icon:        Users,
        description: 'Manage system users, their roles and access.',
        subtitle:    'Manage system users',
        implemented: true,
        module:      'users',
      },
      {
        key:         'roles',
        label:       'Roles',
        icon:        KeyRound,
        description: 'Manage roles that can be assigned to users.',
        subtitle:    'Manage user roles',
        implemented: true,
        module:      'roles',
      },
      // Add more Master items here as they are scaffolded
    ],
  },
  {
    group: 'System',
    icon:  ShieldCheck,
    items: [
      {
        key:         'audit',
        label:       'Audit Logs',
        icon:        ScrollText,
        description: 'System-wide change history across all modules.',
        subtitle:    'Audit trail',
        implemented: true,
        module:      'audit',
      },
      {
        key:         'apikeys',
        label:       'API Keys',
        icon:        KeySquare,
        description: 'Issue role-bound keys for programmatic API access.',
        subtitle:    'Programmatic access',
        implemented: true,
        module:      'apikeys',
      },
      {
        key:         'api-docs',
        label:       'API Docs',
        icon:        BookOpen,
        description: 'Interactive REST API reference (OpenAPI / Scalar).',
        subtitle:    'API reference',
        implemented: true,
      },
    ],
  },
];

// Flat list of every item — used by App.tsx to generate routes + pageMeta
export const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap(g => g.items),
];
