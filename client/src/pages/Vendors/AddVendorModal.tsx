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

export default function AddVendorModal({ onClose, onSuccess }: Props) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = useCallback(async (data: FormData) => {
    setApiError('');
    try {
      const fd = new FormData();
      fd.append('companyName', data.companyName);
      fd.append('contactName', data.contactName);
      fd.append('email', data.email);
      fd.append('phone', data.phone);
      if (files) {
        Array.from(files).forEach((f) => fd.append('documents', f));
      }
      await vendorService.create(fd);
      onSuccess();
      onClose();
    } catch (err: any) {
      setApiError(err?.response?.data?.error || 'Failed to create vendor');
    }
  }, [files, onClose, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Add New Vendor</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {apiError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
              <p className="text-red-400 text-sm">{apiError}</p>
            </div>
          )}

          {[
            { label: 'Company Name', name: 'companyName' as const, placeholder: 'Acme Supplies Ltd.' },
            { label: 'Contact Person', name: 'contactName' as const, placeholder: 'Jane Smith' },
            { label: 'Email', name: 'email' as const, placeholder: 'vendor@email.com' },
            { label: 'Phone', name: 'phone' as const, placeholder: '+91 98765 43210' },
          ].map(({ label, name, placeholder }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
              <input
                {...register(name)}
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition text-sm"
              />
              {errors[name] && <p className="text-red-400 text-xs mt-1">{errors[name]?.message}</p>}
            </div>
          ))}

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Documents <span className="text-slate-500">(PDF, Images â€” max 5)</span>
            </label>
            <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center hover:border-violet-500/50 transition cursor-pointer" onClick={() => document.getElementById('vendor-docs')?.click()}>
              <input
                id="vendor-docs"
                type="file"
                multiple
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => setFiles(e.target.files)}
              />
              {files && files.length > 0 ? (
                <div className="text-sm text-slate-300 space-y-1">
                  {Array.from(files).map((f) => (
                    <p key={f.name} className="truncate">{f.name}</p>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 text-sm">
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Click to upload documents
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium rounded-xl transition text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm shadow-lg shadow-violet-500/25"
            >
              {isSubmitting ? 'Creatingâ€¦' : 'Create Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
