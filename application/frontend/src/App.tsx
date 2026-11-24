import { lazy, Suspense, createElement, useState, createContext } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/shared/components/layout/Sidebar';
import Topbar  from '@/shared/components/layout/Topbar';
import Login   from '@/features/auth/screens/Login';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useLogout } from '@/features/auth/hooks/useAuth';
import { getMeApi } from '@/features/auth/api/auth.api';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { ALL_NAV_ITEMS } from '@/shared/config/nav.config';
import { UnderConstruction } from '@/shared/components/ui';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { Loader2, Lock } from 'lucide-react';

const UserMaster   = lazy(() => import('@/features/master/user/screens/UserMaster'));
const UserFormPage = lazy(() => import('@/features/master/user/screens/UserFormPage'));
const RoleMaster   = lazy(() => import('@/features/master/role/screens/RoleMaster'));
const RoleFormPage = lazy(() => import('@/features/master/role/screens/RoleFormPage'));
const AuditLog     = lazy(() => import('@/features/audit/screens/AuditLog'));
const ApiKeys      = lazy(() => import('@/features/apikeys/screens/ApiKeys'));
const ApiDocs      = lazy(() => import('@/features/apikeys/screens/ApiDocs'));

// Context for sidebar toggle
export const SidebarContext = createContext<{
  toggleSidebar: () => void;
  sidebarHidden: boolean;
} | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SCREEN_MAP: Record<string, React.ComponentType<any>> = {
  users: UserMaster,
  roles: RoleMaster,
  audit: AuditLog,
  apikeys: ApiKeys,
  'api-docs': ApiDocs,
};

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin" size={28} style={{ color: 'var(--accent-600)' }} />
    </div>
  );
}

function NoAccess() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
      <Lock size={30} className="text-gray-300 dark:text-gray-600" />
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">No access</p>
      <p className="text-xs text-gray-400 max-w-xs">You don’t have permission to view this page. Contact an administrator if you need access.</p>
    </div>
  );
}

const pageMeta = Object.fromEntries(
  ALL_NAV_ITEMS.map(item => [`/${item.key}`, { title: item.label, subtitle: item.subtitle }])
);

function getMeta(pathname: string): { title: string; subtitle?: string } {
  if (pageMeta[pathname]) return pageMeta[pathname];
  // Sub-routes (e.g. /users/new, /users/:id) inherit the section's meta.
  const first = pathname.split('/').filter(Boolean)[0];
  if (first && pageMeta[`/${first}`]) return pageMeta[`/${first}`];
  return { title: pathname.replace('/', '') };
}

function AppShell() {
  const user     = useAuthStore(s => s.user);
  const clear    = useAuthStore(s => s.clear);
  const logout   = useLogout();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const { can } = usePermissions();

  // Validate the session on load / when a persisted user exists.
  useQuery({
    queryKey: ['me'],
    queryFn: () => getMeApi().catch((err: { status?: number }) => { if (err?.status === 401) clear(); return null; }),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!user) return <Login />;

  // Render an element only if the user can read the module it belongs to.
  const guard = (module: string | undefined, el: React.ReactNode) =>
    (!module || can(module, 'read')) ? el : <NoAccess />;

  const segments  = location.pathname.split('/').filter(Boolean);
  const meta      = getMeta(location.pathname);
  const activeKey = segments[0] ?? '';

  return (
    <SidebarContext.Provider value={{ toggleSidebar: () => setSidebarHidden(!sidebarHidden), sidebarHidden }}>
      <div className="shell-skin flex h-screen overflow-hidden">
        <Sidebar
          active={activeKey}
          onNav={key => { navigate(key === '' ? '/' : `/${key}`); setMobileSidebarOpen(false); }}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          hidden={sidebarHidden}
        />
        {/* The content sits in a rounded panel over the coloured shell (shell style: Appearance → Navigation style). */}
        <div className={`flex-1 flex flex-col overflow-hidden min-w-0 md:my-2 md:mr-2 md:rounded-xl md:shadow-lg ${sidebarHidden ? 'md:ml-2' : ''}`}
          style={{ backgroundColor: 'var(--color-bg)' }}>
          <Topbar
            title={meta.title}
            subtitle={meta.subtitle ? `${meta.subtitle}, ${user.full_name}` : undefined}
            onMenuToggle={() => setMobileSidebarOpen(true)}
            onLogout={logout}
            user={user}
          />
          <main className="flex-1 overflow-hidden min-h-0">
            <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<PageSpinner />}>
              <div key={location.pathname} className="h-full page-enter">
                <Routes>
                  {/* Routed record pages (must precede the generated list routes) */}
                  <Route path="/users/new"       element={guard('users', <UserFormPage mode="create" />)} />
                  <Route path="/users/:id/edit"  element={guard('users', <UserFormPage mode="edit" />)} />
                  <Route path="/users/:id"       element={guard('users', <UserFormPage mode="view" />)} />
                  <Route path="/roles/new"       element={guard('roles', <RoleFormPage mode="create" />)} />
                  <Route path="/roles/:id/edit"  element={guard('roles', <RoleFormPage mode="edit" />)} />
                  <Route path="/roles/:id"       element={guard('roles', <RoleFormPage mode="view" />)} />
                  {ALL_NAV_ITEMS.map(item => (
                    <Route
                      key={item.key}
                      path={`/${item.key}`}
                      element={
                        item.implemented && SCREEN_MAP[item.key]
                          ? guard(item.module, createElement(SCREEN_MAP[item.key]))
                          : <UnderConstruction label={item.label} />
                      }
                    />
                  ))}
                  <Route path="/" element={<Navigate to="/users" replace />} />
                  <Route path="*" element={<Navigate to="/users" replace />} />
                </Routes>
              </div>
            </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

export default function App() {
  return <AppShell />;
}
