import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInviteToken, acceptInvite } from '../../services/users';
import { getErrorMessage } from '../../utils/apiError';

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    getInviteToken(token)
      .then((data) => {
        setEmail(data.email);
        setName(data.name);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Invalid or expired invitation link.');
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError('');

    try {
      await acceptInvite(token, { name, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to accept invitation'));
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 16 }}>
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

      <div className="card animate-in" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, padding: 36, borderRadius: 16 }}>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        </div>

        <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
          Join the Team
        </h2>
        <p style={{ marginTop: 8, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Complete your profile to accept the invitation.
        </p>

        {error && (
          <div
            style={{
              marginTop: 20,
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
        {success && (
          <div
            style={{
              marginTop: 20,
              borderRadius: 10,
              border: '1px solid rgba(16,185,129,0.3)',
              background: 'rgba(16,185,129,0.08)',
              padding: '14px 16px',
              fontSize: 13.5,
              color: '#10b981',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            Invitation accepted! Redirecting to login...
          </div>
        )}

        {!success && !error.includes('Invalid') && (
          <form onSubmit={handleSubmit} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="input-base"
                style={{ width: '100%', cursor: 'not-allowed', opacity: 0.6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-base"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Create Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-base"
                style={{ width: '100%' }}
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary" style={{ width: '100%', marginTop: 4 }}>
              {submitting ? 'Creating account...' : 'Complete Registration'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
