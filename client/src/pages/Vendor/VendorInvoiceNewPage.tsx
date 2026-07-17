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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Submit New Invoice</h1>
        <p className="mt-1 text-sm text-slate-500">Submit an invoice against an approved purchase order.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-8 shadow-sm">
        <div className="space-y-6">
          {/* PO Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-300">
              Select Purchase Order
            </label>
            <select
              {...register('poId')}
              className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition ${
                errors.poId ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : 'border-slate-200 dark:border-white/10 focus:border-emerald-500/50'
              }`}
            >
              <option value="">Select an approved PO</option>
              {availablePOs.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.poNumber} — {formatCurrency(po.totalAmount)}
                </option>
              ))}
            </select>
            {isLoadingPOs && <p className="mt-2 text-xs text-slate-500">Loading your purchase orders...</p>}
            {errors.poId && <p className="mt-2 text-sm text-red-400">{errors.poId.message}</p>}
          </div>

          {selectedPO && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">PO Details Reference</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Total Approved Amount: {formatCurrency(selectedPO.totalAmount)}</p>
            </div>
          )}

          {/* Invoice Number */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-300">
              Invoice Number
            </label>
            <input
              type="text"
              {...register('invoiceNumber')}
              placeholder="e.g. INV-2026-001"
              className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition ${
                errors.invoiceNumber ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : 'border-slate-200 dark:border-white/10 focus:border-emerald-500/50'
              }`}
            />
            {errors.invoiceNumber && <p className="mt-2 text-sm text-red-400">{errors.invoiceNumber.message}</p>}
          </div>

          {/* Invoice Amount */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-300">
              Invoice Amount (₹)
            </label>
            <input
              type="number"
              step="0.01"
              {...register('amount')}
              placeholder="0.00"
              className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition ${
                errors.amount ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : 'border-slate-200 dark:border-white/10 focus:border-emerald-500/50'
              }`}
            />
            {errors.amount && <p className="mt-2 text-sm text-red-400">{errors.amount.message}</p>}
          </div>

          {/* PDF Upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-300">
              Invoice PDF
            </label>
            <input
              type="file"
              accept=".pdf"
              {...register('file')}
              className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-50 dark:file:bg-emerald-500/20 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700 dark:file:text-emerald-300 hover:file:bg-emerald-100 dark:hover:file:bg-emerald-500/30 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                errors.file ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : 'border-slate-200 dark:border-white/10 focus:border-emerald-500/50'
              }`}
            />
            {errors.file && <p className="mt-2 text-sm text-red-400">{errors.file.message as string}</p>}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-4 border-t border-slate-200 dark:border-white/10 pt-6">
          <button
            type="button"
            onClick={() => navigate('/vendor/dashboard')}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-50 dark:bg-white/5 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-slate-900 dark:text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
