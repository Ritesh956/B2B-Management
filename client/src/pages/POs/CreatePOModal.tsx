import { useMemo, useState } from 'react';
import { poService } from '../../services/pos';
import type { Vendor } from '../../services/vendors';

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
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create PO');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-auto">
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Create Purchase Order</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">âœ•</button>
        </div>

        <div className="p-6 space-y-5">
          {error && <p className="text-sm text-red-400">{error}</p>}

          <div>
            <label className="block text-sm text-slate-300 mb-2">Vendor</label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white"
            >
              <option value="">Select vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.companyName}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Line Items</h3>
              <button onClick={addRow} className="text-sm text-violet-400 hover:text-violet-300">+ Add Row</button>
            </div>

            {rows.map((row, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-center">
                <input
                  value={row.description}
                  onChange={(e) => updateRow(index, { description: e.target.value })}
                  placeholder="Item description"
                  className="col-span-6 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
                <input
                  type="number"
                  min={1}
                  value={row.quantity}
                  onChange={(e) => updateRow(index, { quantity: Number(e.target.value) })}
                  className="col-span-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={row.unitPrice}
                  onChange={(e) => updateRow(index, { unitPrice: Number(e.target.value) })}
                  className="col-span-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={() => removeRow(index)}
                  disabled={rows.length === 1}
                  className="col-span-1 text-red-400 disabled:opacity-40"
                >
                  âœ•
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white/3 border border-white/10 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-slate-400">Total Amount</p>
            <p className="text-xl font-bold text-white">â‚¹ {total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300">Cancel</button>
            <button onClick={handleCreate} disabled={loading} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 rounded-xl text-white font-semibold">
              {loading ? 'Creating...' : 'Create PO'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
