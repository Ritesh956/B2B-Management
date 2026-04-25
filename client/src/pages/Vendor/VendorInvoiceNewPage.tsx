import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService } from '../../services/invoices';
import { vendorPortalService } from '../../services/vendorPortal';

export default function VendorInvoiceNewPage() {
  const navigate = useNavigate();
  const [pos, setPOs] = useState<Array<{ id: string; poNumber: string; totalAmount: number }>>([]);
  const [poId, setPoId] = useState('');
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    vendorPortalService.getDashboard()
      .then((d) => setPOs(d.approvedPOs))
      .catch(() => setError('Failed to load approved POs'));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!poId) {
      setError('Please choose an approved PO');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }

    if (!file) {
      setError('Please upload invoice PDF');
      return;
    }

    try {
      setLoading(true);
      await invoiceService.submit({ poId, amount: Number(amount), invoicePdf: file });
      navigate('/vendor/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to submit invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6 text-white">
      <h1 className="mb-2 text-3xl font-bold">Submit Invoice</h1>
      <p className="mb-6 text-slate-400">Submit an invoice against an approved purchase order.</p>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-white/10 bg-slate-900 p-5">
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div>
          <label className="mb-1 block text-sm text-slate-300">Approved PO</label>
          <select
            value={poId}
            onChange={(e) => setPoId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
          >
            <option value="">Select PO</option>
            {pos.map((po) => (
              <option key={po.id} value={po.id}>{po.poNumber} (Total: {po.totalAmount.toFixed(2)})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Invoice Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Invoice PDF</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-violet-600 px-4 py-2 font-semibold hover:bg-violet-500 disabled:opacity-60"
          >
            {loading ? 'Submitting...' : 'Submit Invoice'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/vendor/dashboard')}
            className="rounded-lg border border-white/15 px-4 py-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
