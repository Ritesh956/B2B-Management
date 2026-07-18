import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { invoiceService } from '../../services/invoices';
import { useAuthStore, Role } from '../../store/authStore';
import { useInvoiceQuery } from '../../hooks/useInvoicesQuery';
import ActivityFeed from '../../components/ActivityFeed';
import { DetailPageSkeleton } from '../../components/Skeletons';
import { formatCurrency } from '../../utils/currency';
import { withAuthToken } from '../../utils/fileUrl';
import { getErrorMessage } from '../../utils/apiError';

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { data, isLoading, refetch } = useInvoiceQuery(id ?? '');
  const invoice = data?.invoice ?? null;
  const invoicesListPath = location.pathname.startsWith('/vendor') ? '/vendor/invoices' : '/invoices';

  const onApprove = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      await invoiceService.approve(invoice.id);
      await refetch();
    } catch (err) {
      setError(getErrorMessage(err, 'Approve failed'));
    } finally {
      setActionLoading(false);
    }
  };

  const onPay = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      await invoiceService.pay(invoice.id);
      await refetch();
    } catch (err) {
      setError(getErrorMessage(err, 'Pay action failed'));
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) return <DetailPageSkeleton />;

  if (error || !invoice) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#ef4444' }}>{error || 'Invoice not found'}</p>
          <Link to={invoicesListPath} className="btn-ghost" style={{ marginTop: '16px', display: 'inline-block', textDecoration: 'none' }}>
            ← Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  const isFinance = user?.role === Role.FINANCE;
  const canApprove = isFinance && invoice.status === 'MATCHED';
  const canPay = isFinance && invoice.status === 'APPROVED';

  return (
    <div className="page-root">
      {/* Header */}
      <div className="surface" style={{ padding: '24px 32px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link to={invoicesListPath} className="btn-ghost" style={{ padding: '8px 12px', textDecoration: 'none', fontSize: '16px' }}>←</Link>
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>{invoice.invoiceNumber}</h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Linked PO: {invoice.po.poNumber}
              </p>
            </div>
          </div>
          <span className={`badge badge-${invoice.status.toLowerCase()}`}>{invoice.status}</span>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start', marginTop: '24px' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Linked PO Summary */}
          <div className="card">
            <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
              Linked PO Summary
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { label: 'PO Number', value: invoice.po.poNumber },
                { label: 'PO Total', value: formatCurrency(invoice.po.totalAmount) },
                { label: 'Invoice Amount', value: formatCurrency(invoice.amount) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>{value}</p>
                </div>
              ))}
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Amount Difference</p>
                <p style={{
                  fontSize: '13px', fontWeight: 600, marginTop: '2px',
                  color: invoice.amountDiff === 0 ? '#10b981' : '#f59e0b'
                }}>
                  {formatCurrency(invoice.amountDiff, { decimals: true })}
                </p>
              </div>
            </div>

            {invoice.status === 'MISMATCHED' && (
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <p style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 500 }}>Mismatch warning</p>
                <p style={{ fontSize: '12px', color: '#fcd34d', marginTop: '4px' }}>
                  Invoice amount differs from PO total by{' '}
                  {formatCurrency(Math.abs(invoice.amountDiff), { decimals: true })}
                </p>
              </div>
            )}
          </div>

          {/* Invoice PDF Preview */}
          <div className="card">
            <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
              Invoice PDF Preview
            </h2>
            {invoice.fileUrl ? (
              <iframe
                src={withAuthToken(invoice.fileUrl)}
                title="Invoice PDF Preview"
                style={{
                  width: '100%', height: '520px', borderRadius: '10px',
                  border: '1px solid var(--border-dim)', background: 'var(--bg-card)'
                }}
              />
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No invoice file uploaded</p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Invoice Actions */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Invoice Actions
            </h2>

            {error && (
              <p style={{ fontSize: '12px', color: '#ef4444', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px' }}>
                {error}
              </p>
            )}

            <button
              onClick={onApprove}
              disabled={!canApprove || actionLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: canApprove ? 'pointer' : 'not-allowed',
                background: canApprove ? 'var(--accent-success)' : 'var(--bg-hover)',
                color: canApprove ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s',
                boxShadow: canApprove ? '0 4px 15px rgba(16,185,129,0.2)' : 'none'
              }}
            >
              Approve Invoice
            </button>

            <button
              onClick={onPay}
              disabled={!canPay || actionLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: canPay ? 'pointer' : 'not-allowed',
                background: canPay ? 'var(--accent-secondary)' : 'var(--bg-hover)',
                color: canPay ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s',
                boxShadow: canPay ? '0 4px 15px rgba(6,182,212,0.2)' : 'none'
              }}
            >
              Mark as Paid
            </button>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {isFinance
                ? 'Finance can approve only MATCHED invoices and pay only APPROVED invoices.'
                : 'Only finance users can approve or mark payment.'}
            </p>
          </div>

          <div style={{ height: '384px' }}>
            <ActivityFeed entity="Invoice" entityId={id!} />
          </div>
        </div>
      </div>
    </div>
  );
}
