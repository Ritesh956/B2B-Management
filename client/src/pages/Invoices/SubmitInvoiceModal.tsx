import { useEffect, useState } from 'react';
import { poService } from '../../services/pos';
import { invoiceService } from '../../services/invoices';

type VendorPO = {
  id: string;
  poNumber: string;
  totalAmount: number;
};

interface Props {
  onClose: () => void;
  onSubmitted: () => void;
}

export default function SubmitInvoiceModal({ onClose, onSubmitted }: Props) {
  const [pos, setPOs] = useState<VendorPO[]>([]);
  const [poId, setPoId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    poService.list().then((d) => {
      const mapped = d.pos.map((po) => ({
        id: po.id,
        poNumber: po.poNumber,
        totalAmount: po.totalAmount,
      }));
      setPOs(mapped);
    }).catch(() => setError('Failed to load your purchase orders'));
  }, []);

  const selectedPO = pos.find((p) => p.id === poId);

  const onSubmit = async () => {
    setError('');

    if (!poId) {
      setError('Please select a PO');
      return;
    }

    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!file) {
      setError('Please upload invoice PDF');
      return;
    }

    setLoading(true);
    try {
      await invoiceService.submit({ poId, amount: Number(amount), invoicePdf: file });
      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to submit invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl">
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Submit Invoice</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}

          <div>
            <label className="block text-sm text-slate-300 mb-2">Purchase Order</label>
            <select
              value={poId}
              onChange={(e) => setPoId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white"
            >
              <option value="">Select PO</option>
              {pos.map((po) => (
                <option key={po.id} value={po.id}>{po.poNumber}</option>
              ))}
            </select>
            {selectedPO && (
              <p className="mt-2 text-xs text-slate-500">PO Total: ₹ {selectedPO.totalAmount.toLocaleString('en-IN')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Invoice Amount</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white"
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Invoice PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300">Cancel</button>
            <button
              onClick={onSubmit}
              disabled={loading}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 rounded-xl text-white font-semibold"
            >
              {loading ? 'Submitting...' : 'Submit Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
