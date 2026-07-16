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
    setLoading(true); setError('');
    try {
      const { po: updated } = await poService.approve(po.id);
      onUpdated(updated);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to approve PO');
    } finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!canAct) return;
    if (!reason.trim()) { setError('Please enter a rejection reason'); return; }
    setLoading(true); setError('');
    try {
      const { po: updated } = await poService.reject(po.id, reason);
      onUpdated(updated);
      setReason('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to reject PO');
    } finally { setLoading(false); }
  };

  if (!canAct) return null;

  return (
    <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h3 style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Approval Actions</h3>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)' }}>
          You are the current approver for this purchase order.
        </p>
      </div>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Rejection reason (required for reject)"
        style={{
          width: '100%', minHeight: 88,
          background: 'var(--bg-input)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10, padding: '10px 14px',
          fontSize: 13.5, fontFamily: 'var(--font-sans)',
          resize: 'vertical', outline: 'none',
          transition: 'border-color 200ms',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--accent-primary)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
      />

      {error && (
        <p style={{ fontSize: 12.5, color: '#f87171', margin: 0 }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleApprove}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px',
            background: 'rgba(16,185,129,0.12)',
            color: '#34d399',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 9, fontSize: 13.5, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            transition: 'all 200ms',
          }}
          onMouseEnter={e => !loading && ((e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.2)')}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.12)'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Approve
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="btn-danger"
          style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Reject
        </button>
      </div>
    </div>
  );
}
