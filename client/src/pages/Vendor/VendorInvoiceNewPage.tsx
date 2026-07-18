import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { usePOsQuery } from '../../hooks/usePOQuery';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/apiError';

const invoiceSchema = z.object({
  poId: z.string().min(1, 'Please select a Purchase Order'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  file: z.any()
    .refine((file) => file?.length === 1, 'Invoice PDF is required')
    .refine((file) => file?.[0]?.type === 'application/pdf', 'Only PDF files are accepted'),
});

// zod's `.coerce.number()` on `amount` means the raw form input (a string
// from the number field) and the parsed/submitted value (a number) are
// different shapes - react-hook-form's third generic carries that through
// so handleSubmit's callback gets the post-coercion type without a cast.
type InvoiceFormInput = z.input<typeof invoiceSchema>;
type InvoiceFormValues = z.output<typeof invoiceSchema>;

export default function VendorInvoiceNewPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: posData, isLoading: isLoadingPOs } = usePOsQuery({ status: 'APPROVED', limit: 100 });

  // Only show APPROVED POs
  const availablePOs = posData?.pos || [];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormInput, unknown, InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
  });

  const selectedPoId = watch('poId');
  const selectedPO = availablePOs.find((po) => po.id === selectedPoId);

  const onSubmit = async (data: InvoiceFormValues) => {
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('poId', data.poId);
      formData.append('invoiceNumber', data.invoiceNumber);
      formData.append('amount', data.amount.toString());
      formData.append('invoicePdf', data.file[0]);

      await api.post('/invoices', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Invoice submitted successfully');
      navigate('/vendor/dashboard');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to submit invoice'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-root animate-in" style={{ maxWidth: 680 }}>
      <div className="page-header">
        <h1 className="page-title">Submit New Invoice</h1>
        <p className="page-subtitle">Submit an invoice against an approved purchase order.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* PO Selection */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Select Purchase Order
          </label>
          <select {...register('poId')} className="input-base">
            <option value="">Select an approved PO</option>
            {availablePOs.map((po) => (
              <option key={po.id} value={po.id}>
                {po.poNumber} — {formatCurrency(po.totalAmount)}
              </option>
            ))}
          </select>
          {isLoadingPOs && <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>Loading your purchase orders...</p>}
          {errors.poId && <p style={{ marginTop: 8, fontSize: 12.5, color: '#f87171' }}>{errors.poId.message}</p>}
        </div>

        {selectedPO && (
          <div style={{ borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', padding: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#34d399', margin: 0 }}>PO Details Reference</p>
            <p style={{ marginTop: 4, fontSize: 12.5, color: 'var(--text-secondary)' }}>
              Total Approved Amount: {formatCurrency(selectedPO.totalAmount)}
            </p>
          </div>
        )}

        {/* Invoice Number */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Invoice Number
          </label>
          <input
            type="text"
            {...register('invoiceNumber')}
            placeholder="e.g. INV-2026-001"
            className="input-base"
          />
          {errors.invoiceNumber && <p style={{ marginTop: 8, fontSize: 12.5, color: '#f87171' }}>{errors.invoiceNumber.message}</p>}
        </div>

        {/* Invoice Amount */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Invoice Amount (₹)
          </label>
          <input
            type="number"
            step="0.01"
            {...register('amount')}
            placeholder="0.00"
            className="input-base"
          />
          {errors.amount && <p style={{ marginTop: 8, fontSize: 12.5, color: '#f87171' }}>{errors.amount.message}</p>}
        </div>

        {/* PDF Upload */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Invoice PDF
          </label>
          <input
            type="file"
            accept=".pdf"
            {...register('file')}
            className="input-base"
          />
          {errors.file && <p style={{ marginTop: 8, fontSize: 12.5, color: '#f87171' }}>{errors.file.message as string}</p>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 8, paddingTop: 20, borderTop: '1px solid var(--border-dim)' }}>
          <button type="button" onClick={() => navigate('/vendor/dashboard')} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Submitting...' : 'Submit Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
