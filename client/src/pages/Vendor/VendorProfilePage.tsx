import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '../../services/api';

const profileSchema = z.object({
  contactName: z.string().min(2, 'Contact name is required'),
  phone: z.string().min(5, 'Valid phone number is required'),
  companyAddress: z.string().min(5, 'Company address is required').optional(),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{label}</p>
    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</p>
  </div>
);

export default function VendorProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/vendor/profile');
        setProfile(res.data.profile);
        reset({
          contactName: res.data.profile.contactName || '',
          phone: res.data.profile.phone || '',
          companyAddress: res.data.profile.address || '',
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsSaving(true);
      await api.patch('/vendor/profile', { contactName: data.contactName, phone: data.phone });
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border-subtle)', borderTopColor: '#10b981', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  return (
    <div className="page-root animate-in" style={{ maxWidth: 680 }}>
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Update your contact details and company information.</p>
      </div>

      {/* Read-only account info */}
      <div className="card">
        <div style={{ paddingBottom: 16, marginBottom: 20, borderBottom: '1px solid var(--border-dim)' }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: 0 }}>Account Information</h2>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>These details cannot be changed directly.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
          <InfoRow label="Company Name" value={profile?.companyName || '—'} />
          <InfoRow label="Email Address" value={profile?.email || '—'} />
          <InfoRow label="Role" value="Vendor" />
        </div>
      </div>

      {/* Editable details */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: 0 }}>Editable Details</h2>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>
              Primary Contact Name
            </label>
            <input type="text" {...register('contactName')} className="input-base" />
            {errors.contactName && <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 5 }}>{errors.contactName.message}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>
              Phone Number
            </label>
            <input type="tel" {...register('phone')} className="input-base" />
            {errors.phone && <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 5 }}>{errors.phone.message}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>
              Company Address
            </label>
            <textarea
              {...register('companyAddress')}
              rows={3}
              className="input-base"
              style={{ resize: 'vertical', fontFamily: 'var(--font-sans)' }}
            />
            {errors.companyAddress && <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 5 }}>{errors.companyAddress.message}</p>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 22px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 13.5, fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1, transition: 'all 200ms',
                boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
              }}
            >
              {isSaving ? 'Saving…' : '✓ Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
