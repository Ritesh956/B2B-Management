import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ApprovalActions from '../../components/ApprovalActions';
import { type PurchaseOrder } from '../../services/pos';
import { usePOQuery } from '../../hooks/usePOQuery';
import ActivityFeed from '../../components/ActivityFeed';
import { DetailPageSkeleton } from '../../components/Skeletons';
import { formatCurrency } from '../../utils/currency';

const HorizontalTimeline = ({ po }: { po: PurchaseOrder }) => {
  const latestInvoice = po.invoices?.[0] ?? null;

  const approved = po.status === 'APPROVED' || po.status === 'CLOSED';
  const rejected = po.status === 'REJECTED';
  const invoiceExists = Boolean(latestInvoice);

  const matched = Boolean(latestInvoice && ['MATCHED', 'APPROVED', 'PAID'].includes(latestInvoice.status));
  const mismatched = Boolean(latestInvoice && latestInvoice.status === 'MISMATCHED');

  const paid = Boolean(latestInvoice && latestInvoice.status === 'PAID');

  const approvedStep = [...po.approvalSteps].reverse().find((step) => step.status === 'APPROVED');
  const approvalDate = approvedStep?.approvedAt ? new Date(approvedStep.approvedAt).toLocaleDateString('en-IN') : null;
  const rejectionDate = po.rejectedAt ? new Date(po.rejectedAt).toLocaleDateString('en-IN') : null;

  const invoiceSubmittedDate = latestInvoice?.submittedAt ? new Date(latestInvoice.submittedAt).toLocaleDateString('en-IN') : null;
  const invoicePaidDate = latestInvoice?.paidAt ? new Date(latestInvoice.paidAt).toLocaleDateString('en-IN') : null;

  const stages = [
    {
      label: 'PO Created',
      date: new Date(po.createdAt).toLocaleDateString('en-IN'),
      state: 'completed',
    },
    {
      label: 'Approved',
      date: rejected ? (rejectionDate ? `Rejected on ${rejectionDate}` : 'Rejected') : (approved ? (approvalDate ?? 'Approved') : 'Pending Approval'),
      state: rejected ? 'rejected' : (approved ? 'completed' : 'current'),
    },
    {
      label: 'Invoice Submitted',
      date: invoiceSubmittedDate ?? (rejected ? 'PO Rejected' : 'Waiting for invoice'),
      state: invoiceExists ? 'completed' : (approved && !rejected ? 'current' : 'pending'),
    },
    {
      label: 'Invoice Matched',
      date: mismatched ? 'Mismatch' : (matched ? (invoiceSubmittedDate ?? 'Matched') : 'Waiting for invoice'),
      state: mismatched ? 'rejected' : (matched ? 'completed' : (invoiceExists && !mismatched ? 'current' : 'pending')),
    },
    {
      label: 'Payment Made',
      date: paid ? (invoicePaidDate ?? 'Paid') : 'Awaiting payment',
      state: paid ? 'completed' : (matched ? 'current' : 'pending'),
    },
  ];

  const completedCount = stages.filter((s) => s.state === 'completed').length;
  const progressPercents: Record<number, string> = { 5: '80%', 4: '60%', 3: '40%', 2: '20%', 1: '0%', 0: '0%' };
  const progressWidth = progressPercents[completedCount] ?? '0%';

  return (
    <div className="card">
      <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '24px' }}>
        PO Lifecycle Timeline
      </h2>
      <div style={{ position: 'relative', padding: '16px 8px' }}>
        {/* Track */}
        <div style={{
          position: 'absolute', left: '10%', right: '10%', top: '34px',
          height: '3px', background: 'var(--border-dim)', borderRadius: '9999px', zIndex: 0
        }} />
        {/* Progress fill */}
        <div style={{
          position: 'absolute', left: '10%', top: '34px',
          height: '3px', width: progressWidth,
          background: 'linear-gradient(to right, #10b981, #06b6d4)',
          borderRadius: '9999px', zIndex: 0, transition: 'width 0.5s ease'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          {stages.map((stage) => {
            let circleStyle: React.CSSProperties = {
              background: 'var(--bg-card)',
              border: '2px solid var(--border-dim)',
              color: 'var(--text-muted)',
            };
            let icon: React.ReactNode = <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--border-dim)' }} />;

            if (stage.state === 'completed') {
              circleStyle = { background: '#10b981', border: '2px solid #34d399', boxShadow: '0 0 15px rgba(16,185,129,0.3)' };
              icon = (
                <svg style={{ width: '20px', height: '20px', color: '#fff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                </svg>
              );
            } else if (stage.state === 'current') {
              circleStyle = { background: '#2563eb', border: '2px solid #60a5fa', boxShadow: '0 0 15px rgba(37,99,235,0.4)' };
              icon = (
                <span style={{ position: 'relative', display: 'flex', width: '14px', height: '14px' }}>
                  <span style={{ position: 'absolute', display: 'inline-flex', width: '100%', height: '100%', borderRadius: '50%', background: '#bfdbfe', opacity: 0.75, animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }} />
                  <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', width: '14px', height: '14px', background: '#fff' }} />
                </span>
              );
            } else if (stage.state === 'rejected') {
              circleStyle = { background: '#f43f5e', border: '2px solid #fb7185', boxShadow: '0 0 15px rgba(244,63,94,0.3)' };
              icon = (
                <svg style={{ width: '20px', height: '20px', color: '#fff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              );
            }

            return (
              <div key={stage.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '48px', height: '48px', borderRadius: '50%',
                  position: 'relative', zIndex: 10, transition: 'all 0.3s',
                  ...circleStyle
                }}>
                  {icon}
                </div>
                <p style={{
                  marginTop: '12px', fontSize: '11px', fontWeight: 600, textAlign: 'center',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
                  color: stage.state === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)'
                }}>
                  {stage.label}
                </p>
                <p style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', padding: '0 4px' }}>
                  {stage.date}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function PODetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const posListPath = location.pathname.startsWith('/vendor') ? '/vendor/pos' : '/pos';
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const { data, isLoading, error } = usePOQuery(id ?? '');

  const [prevData, setPrevData] = useState(data);
  if (data !== prevData) {
    setPrevData(data);
    if (data?.po) setPO(data.po);
  }

  if (isLoading && !po) return <DetailPageSkeleton />;

  if (error || !po) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#ef4444' }}>
            {error instanceof Error ? error.message : 'PO not found'}
          </p>
          <button onClick={() => navigate(posListPath)} className="btn-ghost" style={{ marginTop: '16px' }}>
            ← Back to POs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-root">
      {/* Header */}
      <div className="surface" style={{ padding: '24px 32px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link to={posListPath} className="btn-ghost" style={{ padding: '8px 12px', textDecoration: 'none', fontSize: '16px' }}>←</Link>
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>{po.poNumber}</h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Vendor: {po.vendor.companyName}
              </p>
            </div>
          </div>
          <span className={`badge badge-${po.status.toLowerCase()}`}>{po.status}</span>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Line Items */}
            <div className="card">
              <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
                Line Items
              </h2>
              <table className="data-table">
                <thead>
                  <tr>
                    {['Description', 'Qty', 'Unit Price', 'Line Total'].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((item, index) => (
                    <tr key={index}>
                      <td style={{ color: 'var(--text-primary)' }}>{item.description}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '16px', textAlign: 'right' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatCurrency(po.totalAmount)}
                </p>
              </div>
            </div>

            {/* Timeline */}
            <HorizontalTimeline po={po} />

            {/* Approval Chain */}
            <div className="card">
              <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
                Approval Chain Progress
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {po.approvalSteps.map((step) => (
                  <div key={step.step} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                      background: step.status === 'APPROVED' ? '#10b981'
                        : step.status === 'REJECTED' ? '#ef4444'
                        : step.isCurrent ? '#f59e0b'
                        : 'var(--border-dim)'
                    }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{step.role}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {step.status}{step.isCurrent ? ' — Current approver' : ''}
                      </p>
                      {step.overriddenBy && (
                        <p style={{ fontSize: '11px', color: '#f59e0b', marginTop: '2px' }}>
                          Admin override — {step.overriddenBy.reason}
                        </p>
                      )}
                    </div>
                    {step.approvedAt && (
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(step.approvedAt).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {po.rejectionReason && (
                <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <p style={{ fontSize: '11px', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rejection Reason</p>
                  <p style={{ fontSize: '13px', color: '#fca5a5', marginTop: '4px' }}>{po.rejectionReason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Summary */}
            <div className="card">
              <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
                Summary
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Created By', value: `${po.createdBy.name} (${po.createdBy.role})` },
                  { label: 'Vendor Email', value: po.vendor.email },
                  { label: 'Created At', value: new Date(po.createdAt).toLocaleString('en-IN') },
                  { label: 'Current Approver', value: po.currentApproverRole ?? '-' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <ApprovalActions po={po} onUpdated={setPO} />

            <div style={{ height: '384px' }}>
              <ActivityFeed entity="PurchaseOrder" entityId={id!} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
