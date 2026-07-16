import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { vendorService } from '../../services/vendors';

const schema = z.object({
  companyName: z.string().min(2, 'Required'),
  contactName: z.string().min(2, 'Required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(7, 'Invalid phone'),
});
type FormData = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const FIELDS = [
  { label: 'Company Name', name: 'companyName' as const, placeholder: 'Acme Supplies Ltd.' },
  { label: 'Contact Person', name: 'contactName' as const, placeholder: 'Jane Smith' },
  { label: 'Email', name: 'email' as const, placeholder: 'vendor@email.com' },
  { label: 'Phone', name: 'phone' as const, placeholder: '+91 98765 43210' },
];

export default function AddVendorModal({ onClose, onSuccess }: Props) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [apiError, setApiError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = useCallback(async (data: FormData) => {
    setApiError('');
    try {
      const fd = new FormData();
      fd.append('companyName', data.companyName);
      fd.append('contactName', data.contactName);
      fd.append('email', data.email);
      fd.append('phone', data.phone);
      if (files) Array.from(files).forEach((f) => fd.append('documents', f));
      await vendorService.create(fd);
      onSuccess();
      onClose();
    } catch (err: any) {
      setApiError(err?.response?.data?.error || 'Failed to create vendor');
    }
  }, [files, onClose, onSuccess]);

  return (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: 520 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Add New Vendor</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, transition: 'color 150ms' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {apiError && (
            <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 13, color: '#f87171' }}>
              {apiError}
            </div>
          )}

          {FIELDS.map(({ label, name, placeholder }) => (
            <div key={name}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>
                {label}
              </label>
              <input {...register(name)} placeholder={placeholder} className="input-base" />
              {errors[name] && <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 4 }}>{errors[name]?.message}</p>}
            </div>
          ))}

          {/* File upload */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>
              Documents <span style={{ textTransform: 'none', fontWeight: 400 }}>(PDF, Images – max 5)</span>
            </label>
            <div
              onClick={() => document.getElementById('vendor-docs')?.click()}
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: 12, padding: '20px 16px', textAlign: 'center',
                cursor: 'pointer', transition: 'border-color 200ms',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'}
            >
              <input id="vendor-docs" type="file" multiple accept=".pdf,image/*" style={{ display: 'none' }} onChange={(e) => setFiles(e.target.files)} />
              {files && files.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {Array.from(files).map((f) => (
                    <p key={f.name} style={{ fontSize: 12.5, color: '#34d399', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>✓ {f.name}</p>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  <svg style={{ width: 32, height: 32, margin: '0 auto 8px', opacity: 0.5, display: 'block' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Click to upload documents
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1 }}>
              {isSubmitting ? 'Creating…' : 'Create Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
