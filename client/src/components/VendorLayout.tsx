import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import NotificationBell from './NotificationBell';
import HealthIndicator from './HealthIndicator';

const VENDOR_NAV = [
  {
    label: 'Dashboard', href: '/vendor/dashboard',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    label: 'My POs', href: '/vendor/pos',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  {
    label: 'Submit Invoice', href: '/vendor/invoices/new',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  },
  {
    label: 'My Contracts', href: '/vendor/contracts',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"/><polygon points="18 2 22 6 12 16 8 16 8 12 18 2"/></svg>,
  },
  {
    label: 'My Profile', href: '/vendor/profile',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
];

export default function VendorLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };
  const currentSection = VENDOR_NAV.find(item =>
    location.pathname === item.href || (item.href !== '/vendor/dashboard' && location.pathname.startsWith(`${item.href}/`))
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* ─── Sidebar ───────────────────────────────────────────────── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 232,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-dim)',
        display: 'flex', flexDirection: 'column',
        zIndex: 30,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--border-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16,185,129,0.35)', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Vendor Portal</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Partner Access</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {VENDOR_NAV.map(({ label, href, icon }) => {
            const active = location.pathname === href || (href !== '/vendor/dashboard' && location.pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                to={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 9,
                  fontSize: 13.5, fontWeight: active ? 600 : 500,
                  color: active ? '#6ee7b7' : 'var(--text-secondary)',
                  background: active ? 'rgba(16,185,129,0.1)' : 'transparent',
                  border: active ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                  transition: 'all 160ms', textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'var(--bg-hover)';
                    el.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'transparent';
                    el.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <span style={{ color: active ? '#10b981' : 'inherit', flexShrink: 0 }}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border-dim)' }}>
          <HealthIndicator />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', background: 'var(--bg-card)',
            border: '1px solid var(--border-dim)', borderRadius: 10, marginTop: 8,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>{user?.name?.[0]?.toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <span className="badge badge-vendor" style={{ fontSize: 10, padding: '1px 7px', marginTop: 2, display: 'inline-block' }}>VENDOR</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '9px 12px',
              background: 'transparent', border: '1px solid transparent',
              borderRadius: 9, cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              color: 'var(--text-muted)', transition: 'all 160ms', marginTop: 4,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)';
              (e.currentTarget as HTMLElement).style.color = '#f87171';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ─── Main ──────────────────────────────────────────────────── */}
      <main style={{ marginLeft: 232, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 20, height: 56,
          background: 'rgba(13,17,23,0.85)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-dim)',
          display: 'flex', alignItems: 'center',
          padding: '0 28px', gap: 16,
        }}>
          <h2 style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {currentSection?.label ?? 'Vendor Portal'}
          </h2>
          <NotificationBell />
        </header>

        {/* Page content */}
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
