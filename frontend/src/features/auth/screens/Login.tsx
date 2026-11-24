import { useState } from 'react';
import { BRAND } from '@/shared/config/brand.config';
import { Eye, EyeOff, LayoutDashboard, BarChart3, ShieldCheck, Users } from 'lucide-react';
import { useLogin } from '../hooks/useAuth';
import { useTheme } from '@/shared/contexts/ThemeContext';

const features = [
  { icon: LayoutDashboard, text: 'Everything your team needs in one place' },
  { icon: BarChart3,   text: 'Track trends and analytics in real time'   },
  { icon: Users,       text: 'Manage users and teams with ease'          },
  { icon: ShieldCheck, text: 'Secure, role-based access for your staff'  },
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');

  const login = useLogin();
  const busy  = login.isPending;
  const { accent } = useTheme();
  void accent; // consumed only to trigger re-render when theme changes

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login.mutateAsync({ username, password });
      window.location.replace('/');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: branding ── */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: `
            linear-gradient(to bottom right, transparent 50%, rgba(0,0,0,0.12) 100%),
            linear-gradient(135deg, var(--sidebar-from) 0%, var(--sidebar-via) 50%, var(--sidebar-to) 100%)
          `,
        }}
      >
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-16 w-[30rem] h-[30rem] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }} />

        <div className="relative z-10">
          <img src={BRAND.logo} alt={BRAND.name} className="h-16 w-auto rounded-xl object-contain bg-white px-3 py-1" />
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
              {BRAND.name},<br />
              <span className="text-white/70">simplified.</span>
            </h2>
            <p className="mt-4 text-white/60 text-base leading-relaxed max-w-sm">
              Everything your team needs to manage users, roles and access — and grow your business.
            </p>
          </div>

          <ul className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-white/70" />
                </div>
                <span className="text-sm text-white/60">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <p className="text-white/40 text-xs">© {new Date().getFullYear()} {BRAND.name}</p>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-sm">

          <div className="lg:hidden flex items-center gap-2 mb-8">
            <img src={BRAND.logo} alt={BRAND.name} className="h-12 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Sign in
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">

            <div className="space-y-1.5">
              <label htmlFor="login-username" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Username
              </label>
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-600)] focus:border-transparent transition shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-600)] focus:border-transparent transition shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                <span className="mt-0.5 text-red-500 flex-shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="relative w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden group"
              style={{
                background: busy
                  ? 'var(--accent-700)'
                  : 'linear-gradient(135deg, var(--accent-700) 0%, var(--accent-600) 100%)',
                boxShadow: busy ? 'none' : '0 4px 15px rgba(0,0,0,0.25)',
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {busy ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Signing in…
                  </>
                ) : 'Sign In'}
              </span>
              {!busy && (
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600">
            Protected by enterprise-grade security
          </p>
        </div>
      </div>
    </div>
  );
}
