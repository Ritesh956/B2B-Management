import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/passwordReset';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      // Always show the same confirmation, whether or not the email has an
      // account — the backend responds identically either way.
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        padding: 16,
      }}
    >
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
        className="card animate-in"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 420,
          padding: 36,
          borderRadius: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
              boxShadow: '0 8px 24px rgba(6,182,212,0.25)',
            }}
          >
            <svg style={{ width: 24, height: 24, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
          Forgot your password?
        </h2>
        <p style={{ marginTop: 8, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Enter your account email and we&apos;ll send you a link to reset it.
        </p>

        {error && (
          <div
            style={{
              marginTop: 18,
              borderRadius: 10,
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.08)',
              padding: '10px 14px',
              fontSize: 13,
              color: '#ef4444',
            }}
          >
            {error}
          </div>
        )}

        {submitted ? (
          <div
            style={{
              marginTop: 24,
              borderRadius: 10,
              border: '1px solid rgba(16,185,129,0.3)',
              background: 'rgba(16,185,129,0.08)',
              padding: '14px 16px',
              fontSize: 13.5,
              color: '#10b981',
              lineHeight: 1.6,
            }}
          >
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link to it. The link expires in 30 minutes.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Email address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="input-base"
              style={{ width: '100%' }}
            />

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: 20 }}>
              {loading ? 'Sending link...' : 'Send reset link'}
            </button>
          </form>
        )}

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
