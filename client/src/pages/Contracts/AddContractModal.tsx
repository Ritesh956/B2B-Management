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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full max-h-96 overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">New Contract</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-50"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Vendor Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Vendor
            </label>
            <select
              {...register('vendorId')}
              disabled={vendorsLoading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a vendor...</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.companyName}
                </option>
              ))}
            </select>
            {errors.vendorId && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.vendorId.message}</p>}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contract Title
            </label>
            <input
              {...register('title')}
              type="text"
              placeholder="e.g., Service Agreement 2024"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              {...register('startDate')}
              type="date"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.startDate && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startDate.message}</p>}
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              {...register('endDate')}
              type="date"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.endDate && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.endDate.message}</p>}
          </div>

          {/* PDF Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contract PDF (optional)
            </label>
            <input
              {...register('contractPdf')}
              type="file"
              accept=".pdf"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {filePreview && (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">✓ File selected: {selectedFile?.name}</p>
            )}
            {errors.contractPdf && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.contractPdf.message}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
            >
              {submitting ? 'Creating...' : 'Create Contract'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-50 px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
