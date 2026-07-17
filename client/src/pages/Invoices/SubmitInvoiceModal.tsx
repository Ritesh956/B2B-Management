import { useEffect, useState } from 'react';
import { poService } from '../../services/pos';
import { invoiceService } from '../../services/invoices';
import { formatCurrency } from '../../utils/currency';

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
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--border-dim)'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Submit Invoice
          </h2>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <p style={{ fontSize: '13px', color: '#ef4444', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}

          {/* PO Select */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Purchase Order
            </label>
            <select
              value={poId}
              onChange={(e) => setPoId(e.target.value)}
              className="input-base"
            >
              <option value="">Select PO</option>
              {pos.map((po) => (
                <option key={po.id} value={po.id}>{po.poNumber}</option>
              ))}
            </select>
            {selectedPO && (
              <p style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                PO Total: {formatCurrency(selectedPO.totalAmount)}
              </p>
            )}
          </div>

          {/* Invoice Amount */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Invoice Amount
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="input-base"
              placeholder="Enter amount"
            />
          </div>

          {/* Invoice PDF */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Invoice PDF
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="input-base"
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={onSubmit} disabled={loading} className="btn-primary">
              {loading ? 'Submitting…' : 'Submit Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
