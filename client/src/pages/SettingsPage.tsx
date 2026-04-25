import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { accountService, type AccountNotificationPreferences } from '../services/account';

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

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setPreferences({ ...defaultPreferences, ...(user.notificationPreferences ?? {}) });
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
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-white md:px-8">
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-bold">Profile & Settings</h1>
        <p className="mt-1 text-slate-400">Update your name, login email, password, and notification preferences.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Profile</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">New Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current password" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Confirm Password</span>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={onSave} disabled={saving} className="rounded-xl bg-linear-to-r from-violet-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:from-violet-500 hover:to-purple-500 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {message && <p className="mt-4 text-sm text-emerald-300">{message}</p>}
          {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Email Notifications</h2>
          <div className="mt-5 space-y-4">
            {[
              { key: 'emailEnabled', label: 'Enable email notifications' },
              { key: 'poApprovals', label: 'Purchase order approvals' },
              { key: 'invoiceUpdates', label: 'Invoice updates' },
              { key: 'contractReminders', label: 'Contract reminders' },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-sm text-slate-200">{item.label}</span>
                <input type="checkbox" checked={preferences[item.key as keyof AccountNotificationPreferences]} onChange={() => updatePreference(item.key as keyof AccountNotificationPreferences)} className="h-4 w-4 rounded border-white/20 bg-slate-950 text-violet-500 focus:ring-violet-500" />
              </label>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/3 p-4 text-sm text-slate-400">
            Changes apply immediately after save and are synced to your account profile.
          </div>
        </div>
      </div>
    </div>
  );
}