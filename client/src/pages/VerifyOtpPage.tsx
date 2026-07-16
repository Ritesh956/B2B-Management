import { useState, useRef, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const navigate = useNavigate();
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  
  const tempToken = sessionStorage.getItem('tempToken');

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  if (!tempToken) {
    return <Navigate to="/login" replace />;
  }

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pasted = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pasted.forEach((char, i) => {
        if (index + i < 6) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyOtp(tempToken, otpString);
      sessionStorage.removeItem('tempToken');
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === 'VENDOR') {
        navigate('/vendor/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid OTP');
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
        {/* Icon */}
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
          Two-Factor Authentication
        </h2>
        <p style={{ marginTop: 8, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Enter the 6-digit code sent to your email.
        </p>

        {/* Error message */}
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

        <form onSubmit={handleSubmit} style={{ marginTop: 28 }}>
          {/* OTP digit inputs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                maxLength={6} // allow paste
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                style={{
                  width: 46,
                  height: 54,
                  borderRadius: 10,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-hover)',
                  textAlign: 'center',
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#6366f1';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: 24 }}
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          Didn&apos;t receive a code?{' '}
          <button
            onClick={() => window.location.reload()}
            style={{ color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, padding: 0 }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#818cf8')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#6366f1')}
          >
            Go back
          </button>
        </p>
      </div>
    </div>
  );
}
