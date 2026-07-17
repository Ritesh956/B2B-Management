import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { accountService, type AccountNotificationPreferences } from '../services/account';
import api from '../services/api';
import toast from 'react-hot-toast';
import DeletedItemsSection from '../components/DeletedItemsSection';
import { getErrorMessage } from '../utils/apiError';

const defaultPreferences: AccountNotificationPreferences = {
  emailEnabled: true,
  poApprovals: true,
  invoiceUpdates: true,
  contractReminders: true,
};

export default function SettingsPage() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preferences, setPreferences] = useState<AccountNotificationPreferences>(defaultPreferences);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [saving2fa, setSaving2fa] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setPreferences({ ...defaultPreferences, ...(user.notificationPreferences ?? {}) });
    setIsTwoFactorEnabled(user.isTwoFactorEnabled ?? false);
  }, [user]);

  const updatePreference = (key: keyof AccountNotificationPreferences) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  };

  const onSave = async () => {
    setMessage('');
    setError('');

    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setSaving(true);
      await accountService.updateMe({
        name,
        email,
        password: password || undefined,
        notificationPreferences: preferences,
      });
      await hydrate();
      setPassword('');
      setConfirmPassword('');
      setMessage('Settings saved successfully');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const onToggle2fa = async (enabled: boolean) => {
    try {
      setSaving2fa(true);
      await api.patch('/auth/2fa/toggle', { isTwoFactorEnabled: enabled });
      setIsTwoFactorEnabled(enabled);
      await hydrate();
      toast?.success(enabled ? 'Two-Factor Authentication enabled' : 'Two-Factor Authentication disabled');
    } catch (err) {
      toast?.error(getErrorMessage(err, 'Failed to toggle 2FA'));
      setIsTwoFactorEnabled(!enabled); // revert
    } finally {
      setSaving2fa(false);
    }
  };

  return (
    <div className="page-root">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h1 className="page-title">Profile &amp; Settings</h1>
          <p className="page-subtitle">Update your identity, secure your account, and control how VendorHub reaches you.</p>
        </div>
        {/* Identity summary pills */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div className="card-sm" style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)' }}>Signed in as</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.email}</span>
          </div>
          <div className="card-sm" style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)' }}>Role</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1.2fr 0.8fr' }}>

        {/* Profile Section */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Profile
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input-base" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="input-base" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>New Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current" className="input-base" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Confirm Password</span>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-base" />
            </label>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={onSave} disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!user) return;
                setName(user.name);
                setEmail(user.email);
                setPassword('');
                setConfirmPassword('');
                setPreferences({ ...defaultPreferences, ...(user.notificationPreferences ?? {}) });
                setMessage('Reset to current profile values');
                setError('');
              }}
              className="btn-secondary"
            >
              Reset
            </button>
          </div>

          {message && <p style={{ marginTop: '16px', fontSize: '13px', color: '#34d399' }}>{message}</p>}
          {error && <p style={{ marginTop: '16px', fontSize: '13px', color: '#f87171' }}>{error}</p>}
        </div>

        {/* Notifications Section */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Email Notifications
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { key: 'emailEnabled', label: 'Enable email notifications' },
              { key: 'poApprovals', label: 'Purchase order approvals' },
              { key: 'invoiceUpdates', label: 'Invoice updates' },
              { key: 'contractReminders', label: 'Contract reminders' },
            ].map((item) => (
              <label
                key={item.key}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: '10px',
                  border: '1px solid var(--border-dim)', background: 'var(--bg-hover)',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              >
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                <input
                  type="checkbox"
                  checked={preferences[item.key as keyof AccountNotificationPreferences]}
                  onChange={() => updatePreference(item.key as keyof AccountNotificationPreferences)}
                  style={{ width: '16px', height: '16px', accentColor: '#06b6d4', cursor: 'pointer' }}
                />
              </label>
            ))}
          </div>

          <div style={{
            marginTop: '16px', padding: '12px 16px', borderRadius: '10px',
            border: '1px solid var(--border-dim)', background: 'var(--bg-hover)',
            fontSize: '12px', color: 'var(--text-muted)'
          }}>
            Changes apply immediately after save and are synced to your account profile.
          </div>
        </div>

        {/* Security Section — full width */}
        <div className="card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Security
          </h2>
          <div style={{ maxWidth: '640px' }}>
            <label
              style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                padding: '16px', borderRadius: '10px',
                border: '1px solid var(--border-dim)', background: 'var(--bg-hover)',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            >
              <div>
                <span style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  Two-Factor Authentication (Email)
                </span>
                <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  When enabled, you'll receive a 6-digit verification code via email each time you log in.
                </span>
              </div>
              <div style={{ marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  disabled={saving2fa}
                  checked={isTwoFactorEnabled}
                  onChange={(e) => onToggle2fa(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#06b6d4', cursor: 'pointer', opacity: saving2fa ? 0.5 : 1 }}
                />
              </div>
            </label>
          </div>
        </div>

        {/* Deleted Items Section — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <DeletedItemsSection />
        </div>
      </div>
    </div>
  );
}