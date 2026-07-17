import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const schema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  companyAddress: z.string().min(5, 'Please enter a valid address'),
  name: z.string().min(2, 'Your name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });


  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'VENDOR',
        companyName: data.companyName,
        companyAddress: data.companyAddress,
      });
      navigate('/login', { state: { registered: true } });
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Registration failed. Please try again.';
      setError('root', { message: msg });
    }
  };

  const Field = ({
    label,
    name,
    type = 'text',
    placeholder,
  }: {
    label: string;
    name: keyof FormData;
    type?: string;
    placeholder?: string;
  }) => (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        className="input-base"
        style={{ width: '100%' }}
      />
      {errors[name] && (
        <p style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors[name]?.message as string}</p>
      )}
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      {/* Subtle grid overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(148,163,184,0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 1100,
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
          gap: 32,
          alignItems: 'start',
        }}
      >
        {/* Left info panel */}
        <section
          className="card animate-in"
          style={{ padding: '40px 36px' }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 99,
              border: '1px solid rgba(99,102,241,0.25)',
              background: 'rgba(99,102,241,0.08)',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: '#818cf8',
            }}
          >
            Create workspace
          </span>

          <h1 style={{ marginTop: 28, fontSize: 28, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            Register as a vendor
          </h1>
          <p style={{ marginTop: 12, fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
            This form creates an external vendor account. Staff accounts (Admin, Finance, Procurement, Manager) can only be created by an administrator from User Management.
          </p>

          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'Every new account gets a real API token and profile.',
              'Company details are saved with the user on signup.',
              'Staff access requires an admin-issued invite.',
            ].map((item) => (
              <div
                key={item}
                style={{
                  borderRadius: 10,
                  border: '1px solid var(--border-dim)',
                  background: 'var(--bg-hover)',
                  padding: '10px 14px',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <span style={{ color: '#6366f1', marginTop: 1 }}>✦</span>
                {item}
              </div>
            ))}
          </div>
        </section>

        {/* Right form panel */}
        <section
          className="card animate-in"
          style={{ padding: '36px 32px' }}
        >
          {/* Icon + title */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
                boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
              }}
            >
              <svg style={{ width: 26, height: 26, color: '#fff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 style={{ marginTop: 16, fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Create account
            </h2>
            <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>
              Set up your VendorHub workspace
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Root error */}
            {errors.root && (
              <div
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.08)',
                  padding: '10px 14px',
                }}
              >
                <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{errors.root.message}</p>
              </div>
            )}

            {/* Section label */}
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Company info
            </p>
            <Field label="Company Name" name="companyName" placeholder="Acme Corp" />
            <Field label="Company Address" name="companyAddress" placeholder="123 Business Ave, Mumbai" />

            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', margin: '8px 0 0' }}>
              Your details
            </p>
            <Field label="Your Full Name" name="name" placeholder="John Doe" />
            <Field label="Email Address" name="email" type="email" placeholder="john@acme.com" />
            <Field label="Password" name="password" type="password" placeholder="Min 8 characters" />
            <Field label="Confirm Password" name="confirmPassword" type="password" placeholder="Re-enter password" />

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ width: '100%', marginTop: 8 }}
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link
              to="/login"
              style={{ color: '#6366f1', fontWeight: 500, textDecoration: 'none' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#818cf8')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#6366f1')}
            >
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
