import { useState, useRef, useEffect } from 'react';
import { BRAND } from '@/shared/config/brand.config';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ChevronDown, X, Search } from 'lucide-react';
import { HOME_NAV, NAV_GROUPS } from '@/shared/config/nav.config';
import type { NavItem } from '@/shared/config/nav.config';
import { Tooltip } from '@/shared/components/ui';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { SidebarWaves } from './SidebarWaves';

interface Props {
  active:         string;
  onNav:          (key: string) => void;
  mobileOpen?:    boolean;
  onMobileClose?: () => void;
  hidden?:        boolean;
}

/* ── Local types for sidebar (supports sub-groups) ───────────────── */
interface SidebarSubGroup {
  type:  'subgroup';
  label: string;
  icon:  React.ElementType;
  items: NavItem[];
}
type SidebarEntry = NavItem | SidebarSubGroup;
interface SidebarGroup {
  group: string;
  icon:  React.ElementType;
  items: SidebarEntry[];
}

function isSubGroup(e: SidebarEntry): e is SidebarSubGroup {
  return 'type' in e && (e as SidebarSubGroup).type === 'subgroup';
}

// Static nav groups → sidebar groups (no dynamic menu tree)
const SIDEBAR_GROUPS: SidebarGroup[] = NAV_GROUPS.map(g => ({
  group: g.group,
  icon:  g.icon,
  items: g.items,
}));

/* ── SubGroupSection: collapsible sub-group inside a group ──────── */
function SubGroupSection({ entry, active, onNav }: {
  entry:  SidebarSubGroup;
  active: string;
  onNav:  (key: string) => void;
}) {
  const isSubActive = entry.items.some(item => item.key === active);
  const [expanded, setExpanded] = useState(isSubActive);
  const SubIcon = entry.icon;
  const visible = entry.items.filter(i => !i.hidden);

  useEffect(() => {
    if (isSubActive) setExpanded(true);
  }, [isSubActive]);

  if (!visible.length) return null;

  return (
    <div>
      <button
        onClick={() => setExpanded(e => !e)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
          ${isSubActive ? 'text-white font-semibold' : 'text-white/80 hover:bg-white/15 hover:text-white'}`}
      >
        <SubIcon size={18} className="flex-shrink-0" />
        <span className="flex-1 text-left">{entry.label}</span>
        <ChevronDown
          size={14}
          className={`opacity-60 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="ml-2 pl-3 border-l border-white/15 space-y-0.5">
          {visible.map(item => (
            <NavButton key={item.key} item={item} active={active} onNav={onNav} collapsed={false} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── NavButton: single leaf item ─────────────────────────────────── */
function NavButton({ item, active, onNav, collapsed }: {
  item:      NavItem;
  active:    string;
  onNav:     (key: string) => void;
  collapsed: boolean;
}) {
  const isActive = active === item.key;
  const Icon     = item.icon;

  const btn = (
    <button
      onClick={() => onNav(item.key)}
      style={isActive ? { boxShadow: '0 10px 15px -3px rgba(0,0,0,0.15)', color: 'var(--accent-600)' } : undefined}
      className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
        ${isActive ? 'bg-white font-semibold' : 'text-white/80 hover:bg-white/15 hover:text-white'}
        ${collapsed ? 'justify-center items-center' : ''}`}
    >
      <Icon size={18} className="flex-shrink-0 mt-px" />
      {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
    </button>
  );

  return collapsed ? <Tooltip label={item.label} side="right">{btn}</Tooltip> : btn;
}

/* ── GroupButton: parent group ───────────────────────────────────── */
function GroupButton({ navGroup, active, onNav, collapsed }: {
  navGroup:  SidebarGroup;
  active:    string;
  onNav:     (key: string) => void;
  collapsed: boolean;
}) {
  const isGroupActive = navGroup.items.some(entry =>
    isSubGroup(entry)
      ? entry.items.some(item => item.key === active)
      : (entry as NavItem).key === active
  );
  const Icon = navGroup.icon;

  const [expanded, setExpanded] = useState(isGroupActive);

  useEffect(() => {
    if (isGroupActive) setExpanded(true);
  }, [isGroupActive]);

  const [showFlyout, setShowFlyout] = useState(false);
  const [flyoutPos,  setFlyoutPos]  = useState<{ top: number; left: number } | null>(null);
  const btnWrapRef                  = useRef<HTMLDivElement>(null);
  const hideTimer                   = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  function showFlyoutNow() {
    clearTimeout(hideTimer.current);
    const rect = btnWrapRef.current?.getBoundingClientRect();
    if (rect) setFlyoutPos({ top: rect.top, left: rect.right + 6 });
    setShowFlyout(true);
  }

  function scheduleFlyoutHide() {
    hideTimer.current = setTimeout(() => setShowFlyout(false), 150);
  }

  /* ── Collapsed: icon only + hover flyout ── */
  if (collapsed) {
    const groupBtn = (
      <div ref={btnWrapRef} onMouseEnter={showFlyoutNow} onMouseLeave={scheduleFlyoutHide}>
        <button
          style={isGroupActive ? { boxShadow: '0 10px 15px -3px rgba(0,0,0,0.15)', color: 'var(--accent-600)' } : undefined}
          className={`w-full flex items-center justify-center px-3 py-2.5 rounded-xl text-sm transition-all duration-200
            ${isGroupActive ? 'bg-white font-semibold' : 'text-white/80 hover:bg-white/15 hover:text-white'}`}
        >
          <Icon size={18} />
        </button>
      </div>
    );

    return (
      <>
        <Tooltip label={navGroup.group} side="right">{groupBtn}</Tooltip>

        {showFlyout && flyoutPos && createPortal(
          <div
            className="fixed z-[200]"
            style={{ top: flyoutPos.top, left: flyoutPos.left }}
            onMouseEnter={() => clearTimeout(hideTimer.current)}
            onMouseLeave={scheduleFlyoutHide}
          >
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 py-2 min-w-[168px] overflow-hidden">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 pb-2">
                {navGroup.group}
              </p>
              {navGroup.items.map(entry => {
                if (isSubGroup(entry)) {
                  const visible = entry.items.filter(i => !i.hidden);
                  if (!visible.length) return null;
                  return (
                    <div key={entry.label}>
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 pt-2 pb-1">
                        {entry.label}
                      </p>
                      {visible.map(item => {
                        const ItemIcon = item.icon;
                        const isActive = active === item.key;
                        return (
                          <button
                            key={item.key}
                            onClick={() => { onNav(item.key); setShowFlyout(false); }}
                            style={isActive ? { color: 'var(--accent-600,#2563eb)', background: 'color-mix(in srgb, var(--accent-600) 8%, var(--color-surface))' } : undefined}
                            className={`w-full flex items-center gap-2.5 px-5 py-1.5 text-sm transition-colors
                              ${isActive ? 'font-semibold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}
                          >
                            <ItemIcon size={14} className="flex-shrink-0" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  );
                }
                const item = entry as NavItem;
                if (item.hidden) return null;
                const ItemIcon = item.icon;
                const isActive = active === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => { onNav(item.key); setShowFlyout(false); }}
                    style={isActive ? { color: 'var(--accent-600,#2563eb)', background: 'color-mix(in srgb, var(--accent-600) 8%, var(--color-surface))' } : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors
                      ${isActive ? 'font-semibold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    <ItemIcon size={15} className="flex-shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
      </>
    );
  }

  /* ── Expanded: inline accordion ── */
  return (
    <div>
      <button
        onClick={() => setExpanded(e => !e)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
          ${isGroupActive ? 'text-white font-semibold' : 'text-white/80 hover:bg-white/15 hover:text-white'}`}
      >
        <Icon size={18} className="flex-shrink-0" />
        <span className="flex-1 text-left">{navGroup.group}</span>
        <ChevronDown
          size={14}
          className={`opacity-60 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="ml-2 pl-3 border-l border-white/20 mt-0.5 space-y-0.5">
          {navGroup.items.map(entry => {
            if (isSubGroup(entry)) {
              return <SubGroupSection key={entry.label} entry={entry} active={active} onNav={onNav} />;
            }
            const item = entry as NavItem;
            if (item.hidden) return null;
            return <NavButton key={item.key} item={item} active={active} onNav={onNav} collapsed={false} />;
          })}
        </div>
      )}
    </div>
  );
}

/* ── NavContent ──────────────────────────────────────────────────── */
interface NavContentProps {
  mobile:        boolean;
  collapsed:     boolean;
  active:        string;
  search:        string;
  debouncedQuery: string;
  searchGroups:  { group: string; items: NavItem[] }[];
  navGroups:     SidebarGroup[];
  isLoaded:      boolean;
  onNav:         (key: string) => void;
  onMobileClose?: () => void;
  onToggleCollapse: () => void;
  onSearchChange: (v: string) => void;
  onSearchClear:  () => void;
}

function NavContent({
  mobile, collapsed, active,
  search, debouncedQuery, searchGroups,
  navGroups, isLoaded,
  onNav, onMobileClose, onToggleCollapse,
  onSearchChange, onSearchClear,
}: NavContentProps) {
  const isCollapsed = !mobile && collapsed;

  return (
    <>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b border-white/20 ${isCollapsed ? 'justify-center' : ''}`}>
        <img
          src={BRAND.mark}
          alt={BRAND.name}
          className="rounded-lg object-contain flex-shrink-0 bg-white w-9 h-9 p-1"
        />
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            {/* All capitals, like the company logo */}
            <p className="text-sm font-bold text-white leading-tight uppercase tracking-[0.08em]">{BRAND.name}</p>
            <p className="text-[9px] font-semibold text-white/60 leading-tight uppercase tracking-[0.06em] mt-0.5">{BRAND.tagline}</p>
          </div>
        )}
        <button onClick={onMobileClose} className="ml-auto md:hidden text-white/60 hover:text-white p-1">
          <X size={18} />
        </button>
      </div>

      {/* Desktop collapse toggle */}
      <button
        onClick={onToggleCollapse}
        style={{ color: 'var(--accent-600)' }}
        className="hidden md:flex absolute -right-3 top-16 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center z-10 hover:bg-gray-50 shadow-sm"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Search */}
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search menus…"
              className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder-white/40 text-xs rounded-lg pl-7 pr-7 py-2 outline-none transition border border-transparent focus:border-white/20"
            />
            {search && (
              <button
                onClick={onSearchClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav
        className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}
      >
        {debouncedQuery ? (
          searchGroups.length > 0 ? (
            searchGroups.map(group => (
              <div key={group.group} className="mb-1">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-3 py-1.5">
                  {group.group}
                </p>
                {group.items.map(item => (
                  <NavButton
                    key={item.key}
                    item={item}
                    active={active}
                    onNav={(key) => { onNav(key); onSearchClear(); }}
                    collapsed={false}
                  />
                ))}
              </div>
            ))
          ) : (
            <p className="text-white/40 text-xs text-center py-6">No menus found</p>
          )
        ) : !isLoaded ? (
          <div className="space-y-1 px-2 py-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-9 rounded-xl animate-pulse"
                style={{ background: 'rgba(255,255,255,0.12)', width: i % 3 === 2 ? '70%' : '100%' }}
              />
            ))}
          </div>
        ) : (
          <>
            <NavButton item={HOME_NAV} active={active} onNav={onNav} collapsed={isCollapsed} />
            {navGroups.map(navGroup => (
              <GroupButton
                key={navGroup.group}
                navGroup={navGroup}
                active={active}
                onNav={onNav}
                collapsed={isCollapsed}
              />
            ))}
          </>
        )}
      </nav>

    </>
  );
}

/* ── Sidebar ─────────────────────────────────────────────────────── */
export default function Sidebar({ active, onNav, mobileOpen = false, onMobileClose, hidden = false }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { can } = usePermissions();
  const isLoaded = true;

  // Hide nav items the user can't read (items without a module are always shown).
  const allow = (i: NavItem) => !i.hidden && (!i.module || can(i.module, 'read'));
  const navGroups = SIDEBAR_GROUPS
    .map(g => ({
      ...g,
      items: g.items
        .map(e => isSubGroup(e) ? { ...e, items: e.items.filter(allow) } : e)
        .filter(e => isSubGroup(e) ? e.items.length > 0 : allow(e as NavItem)),
    }))
    .filter(g => g.items.length > 0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const searchGroups = debouncedQuery
    ? navGroups
        .map(g => ({
          group: g.group,
          items: g.items
            .flatMap(entry => isSubGroup(entry) ? entry.items : [entry as NavItem])
            .filter(item => !item.hidden && item.label.toLowerCase().includes(debouncedQuery)),
        }))
        .filter(g => g.items.length > 0)
    : [];

  const sidebarStyle = {
    background: `
      linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.12) 100%),
      linear-gradient(to bottom, var(--sidebar-from), var(--sidebar-via), var(--sidebar-to))
    `,
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
  };

  function handleNav(key: string) {
    onNav(key);
    onMobileClose?.();
  }

  const navContentProps = {
    active,
    search,
    debouncedQuery,
    searchGroups,
    navGroups,
    isLoaded,
    onNav:            handleNav,
    onMobileClose,
    onToggleCollapse: () => setCollapsed(c => !c),
    onSearchChange:   (v: string) => setSearch(v),
    onSearchClear:    () => { setSearch(''); setDebouncedQuery(''); },
  };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onMobileClose} />
      )}

      {/* Mobile sidebar */}
      <aside
        style={sidebarStyle}
        className={`fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col transition-transform duration-200 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <NavContent {...navContentProps} mobile collapsed={collapsed} />
      </aside>

      {/* Desktop sidebar */}
      {!hidden && (
        // The shell behind it (gradient / dark / light, see index.css) shows through; waves sit under the menu.
        <aside
          style={{ minHeight: '100vh' }}
          className={`sidebar-skin hidden md:flex ${collapsed ? 'w-16' : 'w-60'} flex-shrink-0 text-white flex-col transition-all duration-200 relative`}
        >
          <SidebarWaves />
          <div className="relative z-10 flex flex-col flex-1 min-w-0 min-h-0">
            <NavContent {...navContentProps} mobile={false} collapsed={collapsed} />
          </div>
        </aside>
      )}
    </>
  );
}

