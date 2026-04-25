import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-violet-500/20 text-violet-300',
  FINANCE: 'bg-blue-500/20 text-blue-300',
  PROCUREMENT: 'bg-emerald-500/20 text-emerald-300',
  MANAGER: 'bg-amber-500/20 text-amber-300',
  VENDOR: 'bg-rose-500/20 text-rose-300',
};

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', roles: ['ADMIN', 'FINANCE', 'PROCUREMENT', 'MANAGER'] },
  { label: 'Vendors', href: '/vendors', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', roles: ['ADMIN', 'PROCUREMENT', 'MANAGER', 'FINANCE'] },
  { label: 'Purchase Orders', href: '/pos', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z', roles: ['ADMIN', 'FINANCE', 'PROCUREMENT', 'MANAGER'] },
  { label: 'Invoices', href: '/invoices', icon: 'M9 17v-2a4 4 0 018 0v2m-4-6a3 3 0 100-6 3 3 0 000 6M5 3h7l5 5v13a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z', roles: ['ADMIN', 'FINANCE', 'PROCUREMENT', 'MANAGER'] },
  { label: 'Contracts', href: '/contracts', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z', roles: ['ADMIN', 'PROCUREMENT', 'MANAGER'] },
  { label: 'Audit Logs', href: '/audit-logs', icon: 'M9 17v-6m3 6V7m3 10V4M5 20h14a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1z', roles: ['ADMIN'] },
  { label: 'Settings', href: '/settings', icon: 'M12 8V4m0 16v-4m8-4h-4M8 12H4m13.657 5.657l-2.828-2.828M9.171 9.171 6.343 6.343m12.314 0-2.828 2.828M9.171 14.829l-2.828 2.828', roles: ['ADMIN', 'FINANCE', 'PROCUREMENT', 'MANAGER', 'VENDOR'] },
  { label: 'Vendor Dashboard', href: '/vendor/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', roles: ['VENDOR'] },
  { label: 'Submit Invoice', href: '/vendor/invoices/new', icon: 'M9 12h6m-6 4h6m2-12H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V8l-4-4z', roles: ['VENDOR'] },
  { label: 'Vendor Profile', href: '/vendor/profile', icon: 'M5.121 17.804A9.956 9.956 0 0112 15c2.203 0 4.24.713 5.879 1.922M15 11a3 3 0 11-6 0 3 3 0 016 0z', roles: ['VENDOR'] },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <aside className="fixed left-0 top-0 z-20 h-screen w-64 bg-slate-900 border-r border-white/5 flex flex-col">
        <div className="px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">VendorHub</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role ?? 'VENDOR')).map(({ label, href, icon }) => {
            const active = location.pathname === href || (href !== '/dashboard' && location.pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                to={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm font-medium group ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <svg className={`w-4 h-4 transition ${active ? 'text-violet-400' : 'group-hover:text-violet-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLOR[user?.role ?? 'VENDOR']}`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      <main className="ml-64 min-h-screen w-[calc(100%-16rem)] overflow-x-hidden">
        <header className="sticky top-0 z-10 border-b border-white/5 bg-slate-950/90 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <GlobalSearch />
            </div>
            <NotificationBell />
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}