import { useMemo, useState } from 'react';
import { poService } from '../../services/pos';
import type { Vendor } from '../../services/vendors';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/apiError';

interface Props {
  vendors: Vendor[];
  onClose: () => void;
  onCreated: () => void;
}

type ItemRow = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export default function CreatePOModal({ vendors, onClose, onCreated }: Props) {
  const [vendorId, setVendorId] = useState('');
  const [rows, setRows] = useState<ItemRow[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.quantity || 0) * Number(row.unitPrice || 0), 0),
    [rows]
  );

  const updateRow = (index: number, patch: Partial<ItemRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => setRows((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));

  const handleCreate = async () => {
    setError('');

    if (!vendorId) {
      setError('Please select a vendor');
      return;
    }

    if (rows.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    const invalid = rows.some((r) => !r.description.trim() || r.quantity <= 0 || r.unitPrice <= 0);
    if (invalid) {
      setError('Each line item must have description, quantity > 0 and unit price > 0');
      return;
    }

    setLoading(true);
    try {
      await poService.create({
        vendorId,
        items: rows.map((r) => ({
          description: r.description.trim(),
          quantity: Number(r.quantity),
          unitPrice: Number(r.unitPrice),
        })),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create PO'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--border-dim)'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Create Purchase Order
          </h2>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <p style={{ fontSize: '13px', color: '#ef4444', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}

          {/* Vendor Select */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Vendor
            </label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="input-base"
            >
              <option value="">Select vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.companyName}</option>
              ))}
            </select>
          </div>

          {/* Line Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Line Items
              </h3>
              <button
                onClick={addRow}
                style={{ fontSize: '13px', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                + Add Row
              </button>
            </div>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '6fr 2fr 3fr 1fr', gap: '10px' }}>
              {['Description', 'Qty', 'Unit Price', ''].map((h) => (
                <span key={h} style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
              ))}
            </div>

            {rows.map((row, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '6fr 2fr 3fr 1fr', gap: '10px', alignItems: 'center' }}>
                <input
                  value={row.description}
                  onChange={(e) => updateRow(index, { description: e.target.value })}
                  placeholder="Item description"
                  className="input-base"
                />
                <input
                  type="number"
                  min={1}
                  value={row.quantity}
                  onChange={(e) => updateRow(index, { quantity: Number(e.target.value) })}
                  className="input-base"
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={row.unitPrice}
                  onChange={(e) => updateRow(index, { unitPrice: Number(e.target.value) })}
                  className="input-base"
                />
                <button
                  onClick={() => removeRow(index)}
                  disabled={rows.length === 1}
                  style={{
                    color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '16px', opacity: rows.length === 1 ? 0.4 : 1
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Amount</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatCurrency(total, { decimals: true })}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleCreate} disabled={loading} className="btn-primary">
              {loading ? 'Creating…' : 'Create PO'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
