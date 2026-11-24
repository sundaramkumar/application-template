import { Menu, LogOut, PanelLeftOpen } from 'lucide-react';
import { useState, useEffect, useContext } from 'react';
import { ConfirmDialog } from '@/shared/components/ui';
import ThemePicker from './ThemePicker';
import type { AuthUser } from '@/shared/types/api.types';
import { SidebarContext } from '@/App';

interface Props {
  title:         string;
  subtitle?:     string;
  onMenuToggle?: () => void;
  onLogout?:     () => void;
  user?:         AuthUser | null;
}

/* ── Live clock — aligned to real second boundary ── */
function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Fire at the next exact second boundary, then tick every 1000 ms
    const msUntilNext = 1000 - (Date.now() % 1000);
    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 1000);
    }, msUntilNext);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, []);

  const timeParts = now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  }).split(':');

  const hh     = timeParts[0] ?? '00';
  const mm     = timeParts[1] ?? '00';
  const secAmp = (timeParts[2] ?? '00 AM').split(' ');
  const ss     = secAmp[0] ?? '00';
  const ampm   = (secAmp[1] ?? 'AM').toUpperCase();

  return (
    <div
      className="hidden lg:flex items-center gap-0.5 tabular-nums px-3 h-8 rounded-lg select-none"
      style={{
        background: 'color-mix(in srgb, var(--accent-600) 8%, var(--color-surface))',
        border:     '1px solid color-mix(in srgb, var(--accent-600) 18%, transparent)',
      }}
    >
      <span className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--accent-700)' }}>
        {hh}:{mm}
      </span>
      <span className="text-[10px] font-semibold" style={{ color: 'var(--accent-600)', opacity: 0.7 }}>
        :{ss}
      </span>
      <span
        className="text-[9px] font-bold uppercase tracking-wide ml-0.5"
        style={{ color: 'var(--accent-600)', opacity: 0.55 }}
      >
        {ampm}
      </span>
    </div>
  );
}

export default function Topbar({ title, subtitle, onMenuToggle, onLogout, user }: Props) {
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [userMenuOpen,  setUserMenuOpen]  = useState(false);
  const sidebarContext = useContext(SidebarContext);

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 flex-shrink-0 h-14 flex items-center gap-3">

      {/* ── Left: hamburger + page title ── */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex-shrink-0"
        >
          <Menu size={20} />
        </button>

        <div
          className="w-[3px] h-7 rounded-full flex-shrink-0"
          style={{ background: 'linear-gradient(to bottom, var(--sidebar-from), var(--sidebar-to))' }}
        />
        <div className="min-w-0">
          <h1 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block leading-tight truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* ── Right: menu toggle + store context + clock + theme + user ── */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Desktop Menu Toggle Button */}
        {sidebarContext && (
          <div className="relative group hidden md:block">
            <button
              onClick={sidebarContext.toggleSidebar}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-2)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--accent-600)';
                e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-600) 8%, var(--color-surface))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-2)';
                e.currentTarget.style.background = '';
              }}
            >
              <PanelLeftOpen size={16} />
            </button>
            {/* Custom tooltip */}
            <div className="absolute right-0 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[9999] pointer-events-none">
              <div className="bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                {sidebarContext.sidebarHidden ? "Show menu" : "Hide menu"}
              </div>
              <div className="absolute bottom-full right-3 w-2 h-2 bg-gray-900 transform rotate-45 translate-y-1"></div>
            </div>
          </div>
        )}

        <LiveClock />

        <ThemePicker />

        {/* User section */}
        {user && (
          <div className="relative flex items-center gap-2 pl-2 ml-1 border-l border-gray-200 dark:border-gray-700">
            <div className="hidden md:block min-w-0 text-right">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight truncate max-w-[90px]">
                {user.full_name}
              </p>
              {user.role_name && (
                <p className="text-[10px] font-medium leading-tight" style={{ color: 'var(--accent-600)' }}>
                  {user.role_name}
                </p>
              )}
            </div>
            <button
              onClick={e => { e.stopPropagation(); setUserMenuOpen(o => !o); }}
              title="Account menu"
              className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 transition-all hover:opacity-80 hover:scale-105"
              style={{
                background: 'var(--accent-600)',
                boxShadow: userMenuOpen ? '0 0 0 2px var(--accent-50), 0 0 0 3.5px var(--accent-600)' : undefined,
              }}
            >
              {initials}
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
                  style={{ minWidth: 200 }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--accent-600)' }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate">
                          {user.full_name}
                        </p>
                        {user.role_name && (
                          <p className="text-[11px] font-medium leading-tight mt-0.5" style={{ color: 'var(--accent-600)' }}>
                            {user.role_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="py-1">
                    <button
                      onClick={() => { setUserMenuOpen(false); setLogoutConfirm(true); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut size={15} />
                      <span className="font-medium">Sign out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </div>

      <ConfirmDialog
        open={logoutConfirm}
        title="Sign out?"
        message="You will be signed out of the current session. Any unsaved changes will be lost."
        confirmLabel="Sign out"
        variant="warning"
        onConfirm={() => { setLogoutConfirm(false); onLogout?.(); }}
        onCancel={() => setLogoutConfirm(false)}
      />
    </header>
  );
}
