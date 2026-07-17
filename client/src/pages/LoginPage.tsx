import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuthStore } from '../store/authStore';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type FormData = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { label: 'Admin',       role: 'Full Access',    email: 'admin@demo.com',   password: 'Admin123', color: '#8b5cf6' },
  { label: 'Finance',     role: 'Finance Module', email: 'finance@demo.com', password: 'Fin123',   color: '#3b82f6' },
  { label: 'Procurement', role: 'PO & Vendors',   email: 'procure@demo.com', password: 'Proc123',  color: '#10b981' },
  { label: 'Vendor',      role: 'Vendor Portal',  email: 'vendor@demo.com',  password: 'Vend123',  color: '#ec4899' },
];

const FEATURES = [
  { icon: '⚡', text: 'Real-time vendor status & performance tracking' },
  { icon: '📊', text: 'Invoice matching & approval workflows' },
  { icon: '🔒', text: 'Role-based access with audit logging' },
  { icon: '📋', text: 'Contract expiry alerts & PO management' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [hoveredAccount, setHoveredAccount] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, setValue } = useForm<FormData>({ resolver: zodResolver(schema) });

  const fillDemoAccount = (email: string, password: string) => {
    setValue('email', email, { shouldDirty: true, shouldValidate: true });
    setValue('password', password, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (data: FormData) => {
    try {
      const res = await login(data.email, data.password);
      if (res?.requiresOtp && res.tempToken) {
        sessionStorage.setItem('tempToken', res.tempToken);
        navigate('/verify-otp');
      } else {
        const currentUser = useAuthStore.getState().user;
        navigate(currentUser?.role === 'VENDOR' ? '/vendor/dashboard' : '/dashboard');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Login failed. Please try again.';
      setError('root', { message: msg });
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      backgroundImage: 'radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(6,182,212,0.08) 0%, transparent 50%)',
      display: 'flex',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* ─── Left panel ──────────────────────────────── */}
      <div style={{
        flex: '0 0 460px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-dim)',
        padding: '48px 44px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }} className="hidden-mobile">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>VendorHub</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>B2B Management Platform</div>
          </div>
        </div>

        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: '0 0 12px' }}>
            Streamline your <br />
            <span style={{ background: 'linear-gradient(135deg, #a5b4fc, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>vendor operations</span>
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
            One platform for PO approvals, invoice matching, contract management and vendor analytics.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
          {FEATURES.map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 11 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
              <span style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Demo accounts */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Quick Login — Demo Accounts
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => fillDemoAccount(acc.email, acc.password)}
                onMouseEnter={() => setHoveredAccount(acc.email)}
                onMouseLeave={() => setHoveredAccount(null)}
                style={{
                  padding: '11px 13px',
                  background: hoveredAccount === acc.email ? `${acc.color}12` : 'var(--bg-card)',
                  border: `1px solid ${hoveredAccount === acc.email ? `${acc.color}35` : 'var(--border-dim)'}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 180ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: `${acc.color}18`, border: `1px solid ${acc.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: acc.color }}>
                    {acc.label[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{acc.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{acc.role}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right panel (Form) ───────────────────────── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }} className="animate-in">
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: '0 0 8px' }}>Welcome back</h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Sign in to your VendorHub workspace</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {errors.root && (
              <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, fontSize: 13.5, color: '#f87171' }}>
                {errors.root.message}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Email address</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="admin@demo.com"
                className="input-base"
              />
              {errors.email && <p style={{ fontSize: 12, color: '#f87171', marginTop: 5 }}>{errors.email.message}</p>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="input-base"
              />
              {errors.password && <p style={{ fontSize: 12, color: '#f87171', marginTop: 5 }}>{errors.password.message}</p>}
              <p style={{ marginTop: 8, textAlign: 'right' }}>
                <Link to="/forgot-password" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)' }}>
                  Forgot password?
                </Link>
              </p>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ padding: '13px', fontSize: 15, marginTop: 4 }}>
              {isSubmitting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 28, padding: '14px 18px', background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 11 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Default demo access</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>admin@demo.com</span>
              {' / '}
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Admin123</span>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13.5, color: 'var(--text-muted)' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
