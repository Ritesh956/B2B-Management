import { useMemo, useState } from 'react';
import { poService, type PurchaseOrder } from '../services/pos';
import { useAuthStore } from '../store/authStore';

interface Props {
  po: PurchaseOrder;
  onUpdated: (po: PurchaseOrder) => void;
}

export default function ApprovalActions({ po, onUpdated }: Props) {
  const user = useAuthStore((s) => s.user);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canAct = useMemo(() => {
    return !!user && po.status === 'PENDING_APPROVAL' && po.currentApproverRole === user.role;
  }, [po, user]);

  const handleApprove = async () => {
    if (!canAct) return;
    setLoading(true);
    setError('');
    try {
      const { po: updated } = await poService.approve(po.id);
      onUpdated(updated);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to approve PO');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!canAct) return;
    if (!reason.trim()) {
      setError('Please enter a rejection reason');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { po: updated } = await poService.reject(po.id, reason);
      onUpdated(updated);
      setReason('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to reject PO');
    } finally {
      setLoading(false);
    }
  };

  if (!canAct) return null;

  return (
    <div className="bg-white/3 border border-white/10 rounded-2xl p-6 space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Approval Actions</h3>

      <p className="text-sm text-slate-400">
        You are the current approver for this purchase order.
      </p>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required only for reject)"
        className="w-full min-h-22.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 rounded-xl text-sm font-semibold transition"
        >
          Approve
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 rounded-xl text-sm font-semibold transition"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
