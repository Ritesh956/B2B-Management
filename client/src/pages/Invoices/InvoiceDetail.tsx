import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { invoiceService } from '../../services/invoices';
import { useAuthStore, Role } from '../../store/authStore';
import { useInvoiceQuery } from '../../hooks/useInvoicesQuery';

const STATUS_STYLE: Record<string, string> = {
  SUBMITTED: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  MATCHED: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  MISMATCHED: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  APPROVED: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  PAID: 'bg-green-500/20 text-green-300 border border-green-500/30',
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { data, isLoading, refetch } = useInvoiceQuery(id ?? '');
  const invoice = data?.invoice ?? null;

  const onApprove = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      await invoiceService.approve(invoice.id);
      await refetch();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Approve failed');
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
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Pay action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg font-semibold">{error || 'Invoice not found'}</p>
          <Link to="/invoices" className="mt-4 inline-block text-violet-400 hover:text-violet-300 text-sm">&lt;- Back to Invoices</Link>
        </div>
      </div>
    );
  }

  const isFinance = user?.role === Role.FINANCE;
  const canApprove = isFinance && invoice.status === 'MATCHED';
  const canPay = isFinance && invoice.status === 'APPROVED';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/invoices" className="text-slate-400 hover:text-white">&lt;-</Link>
          <div>
            <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
            <p className="text-slate-400 text-sm">Linked PO: {invoice.po.poNumber}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[invoice.status] || STATUS_STYLE.SUBMITTED}`}>{invoice.status}</span>
      </div>

      <div className="px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Linked PO Summary</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">PO Number</p>
                <p className="text-white">{invoice.po.poNumber}</p>
              </div>
              <div>
                <p className="text-slate-500">PO Total</p>
                <p className="text-white">Rs. {invoice.po.totalAmount.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-slate-500">Invoice Amount</p>
                <p className="text-white">Rs. {invoice.amount.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-slate-500">Amount Difference</p>
                <p className={`font-semibold ${invoice.amountDiff === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  Rs. {invoice.amountDiff.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {invoice.status === 'MISMATCHED' && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-300 font-medium">Mismatch warning</p>
                <p className="text-xs text-amber-200 mt-1">
                  Invoice amount differs from PO total by Rs. {Math.abs(invoice.amountDiff).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>

          <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Invoice PDF Preview</h2>
            {invoice.fileUrl ? (
              <iframe
                src={invoice.fileUrl}
                title="Invoice PDF Preview"
                className="w-full h-130 rounded-xl border border-white/10 bg-slate-900"
              />
            ) : (
              <p className="text-slate-500 text-sm">No invoice file uploaded</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/3 border border-white/5 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Invoice Actions</h2>

            <button
              onClick={onApprove}
              disabled={!canApprove || actionLoading}
              className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl text-sm font-semibold"
            >
              Approve Invoice
            </button>

            <button
              onClick={onPay}
              disabled={!canPay || actionLoading}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-sm font-semibold"
            >
              Mark as Paid
            </button>

            {isFinance ? (
              <p className="text-xs text-slate-500">Finance can approve only MATCHED invoices and pay only APPROVED invoices.</p>
            ) : (
              <p className="text-xs text-slate-500">Only finance users can approve or mark payment.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
