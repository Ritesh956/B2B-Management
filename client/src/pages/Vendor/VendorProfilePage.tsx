import { useEffect, useState } from 'react';
import { vendorPortalService } from '../../services/vendorPortal';

export default function VendorProfilePage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    contactName: '',
    phone: '',
    companyName: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { profile } = await vendorPortalService.getProfile();
        setForm({
          name: profile.name,
          email: profile.email,
          contactName: profile.contactName,
          phone: profile.phone,
          companyName: profile.companyName,
        });
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      setSaving(true);
      const { profile } = await vendorPortalService.updateProfile({
        name: form.name,
        email: form.email,
        contactName: form.contactName,
        phone: form.phone,
      });
      setForm((prev) => ({ ...prev, ...profile, companyName: profile.companyName }));
      setMessage('Profile updated successfully');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-white">Loading profile...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6 text-white">
      <h1 className="mb-2 text-3xl font-bold">Vendor Profile</h1>
      <p className="mb-6 text-slate-400">Manage your contact information.</p>

      <form onSubmit={onSave} className="space-y-4 rounded-xl border border-white/10 bg-slate-900 p-5">
        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div>
          <label className="mb-1 block text-sm text-slate-300">Company</label>
          <input value={form.companyName} disabled className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 opacity-70" />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Account Name</label>
          <input name="name" value={form.name} onChange={onChange} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Email</label>
          <input name="email" value={form.email} onChange={onChange} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Vendor Contact Name</label>
          <input name="contactName" value={form.contactName} onChange={onChange} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Phone</label>
          <input name="phone" value={form.phone} onChange={onChange} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
        </div>

        <button type="submit" disabled={saving} className="rounded-lg bg-violet-600 px-4 py-2 font-semibold hover:bg-violet-500 disabled:opacity-60">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
