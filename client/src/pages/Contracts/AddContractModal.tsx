import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as contractsService from '../../services/contracts';
import type { Vendor } from '../../services/contracts';
import { vendorService } from '../../services/vendors';

const schema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  contractPdf: z.instanceof(File).optional(),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

type FormData = z.infer<typeof schema>;

interface AddContractModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddContractModal({ onClose, onSuccess }: AddContractModalProps) {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const selectedFile = watch('contractPdf');

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  }, [selectedFile]);

  const loadVendors = async () => {
    try {
      setVendorsLoading(true);
      const result = await vendorService.list({ page: 1, limit: 100 });
      // Filter for verified vendors
      setVendors(result.vendors.filter((v: any) => v.status === 'VERIFIED'));
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setVendorsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setSubmitting(true);
      await contractsService.createContract({
        vendorId: data.vendorId,
        title: data.title,
        startDate: data.startDate,
        endDate: data.endDate,
        contractPdf: data.contractPdf,
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to create contract:', err);
      alert('Failed to create contract');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--border-dim)'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>New Contract</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1,
              padding: '4px', borderRadius: '6px', transition: 'color 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            &#x2715;
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Vendor Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Vendor
            </label>
            <select
              {...register('vendorId')}
              disabled={vendorsLoading}
              className="input-base"
              style={{ width: '100%' }}
            >
              <option value="">Select a vendor...</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.companyName}
                </option>
              ))}
            </select>
            {errors.vendorId && <p style={{ marginTop: '4px', fontSize: '12px', color: '#f87171' }}>{errors.vendorId.message}</p>}
          </div>

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Contract Title
            </label>
            <input
              {...register('title')}
              type="text"
              placeholder="e.g., Service Agreement 2024"
              className="input-base"
              style={{ width: '100%' }}
            />
            {errors.title && <p style={{ marginTop: '4px', fontSize: '12px', color: '#f87171' }}>{errors.title.message}</p>}
          </div>

          {/* Start Date */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Start Date
            </label>
            <input
              {...register('startDate')}
              type="date"
              className="input-base"
              style={{ width: '100%' }}
            />
            {errors.startDate && <p style={{ marginTop: '4px', fontSize: '12px', color: '#f87171' }}>{errors.startDate.message}</p>}
          </div>

          {/* End Date */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              End Date
            </label>
            <input
              {...register('endDate')}
              type="date"
              className="input-base"
              style={{ width: '100%' }}
            />
            {errors.endDate && <p style={{ marginTop: '4px', fontSize: '12px', color: '#f87171' }}>{errors.endDate.message}</p>}
          </div>

          {/* PDF Upload */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Contract PDF (optional)
            </label>
            <input
              {...register('contractPdf')}
              type="file"
              accept=".pdf"
              className="input-base"
              style={{ width: '100%' }}
            />
            {filePreview && (
              <p style={{ marginTop: '4px', fontSize: '12px', color: '#34d399' }}>&#10003; File selected: {selectedFile?.name}</p>
            )}
            {errors.contractPdf && <p style={{ marginTop: '4px', fontSize: '12px', color: '#f87171' }}>{errors.contractPdf.message}</p>}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ flex: 1, opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? 'Creating...' : 'Create Contract'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
