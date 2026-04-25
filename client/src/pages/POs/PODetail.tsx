import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ApprovalActions from '../../components/ApprovalActions';
import { type PurchaseOrder } from '../../services/pos';
import { usePOQuery } from '../../hooks/usePOQuery';

const STATUS_STYLE: Record<string, string> = {
  PENDING_APPROVAL: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  APPROVED: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  REJECTED: 'bg-red-500/15 text-red-400 border border-red-500/30',
  DRAFT: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  CLOSED: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
};

const getApprovedAt = (po: PurchaseOrder): string | null => {
  const approvedStep = [...po.approvalSteps].reverse().find((step) => step.status === 'APPROVED');
  return approvedStep?.approvedAt ?? null;
};

const getTimeline = (po: PurchaseOrder) => {
  const latestInvoice = po.invoices?.[0] ?? null;
  const approved = po.status === 'APPROVED' || po.status === 'CLOSED';
  const matched = Boolean(latestInvoice && ['MATCHED', 'APPROVED', 'PAID'].includes(latestInvoice.status));
  const paid = Boolean(latestInvoice && latestInvoice.status === 'PAID');

  return [
    {
      title: 'PO Created',
      completed: true,
      current: false,
      meta: new Date(po.createdAt).toLocaleDateString('en-IN'),
    },
    {
      title: 'Approved',
      completed: approved,
      current: !approved,
      meta: approved ? (getApprovedAt(po) ? new Date(getApprovedAt(po)!).toLocaleDateString('en-IN') : 'Approved') : 'Pending approval',
    },
    {
      title: 'Invoice Submitted',
      completed: Boolean(latestInvoice),
      current: approved && !latestInvoice,
      meta: latestInvoice ? new Date(latestInvoice.submittedAt).toLocaleDateString('en-IN') : 'Waiting for invoice',
    },
    {
      title: 'Matched',
      completed: matched,
      current: Boolean(latestInvoice) && !matched,
      meta: latestInvoice ? latestInvoice.status : 'Waiting for invoice',
    },
    {
      title: 'Paid',
      completed: paid,
      current: matched && !paid,
      meta: paid ? 'Paid' : 'Awaiting payment',
    },
  ];
};

export default function PODetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const { data, isLoading, error } = usePOQuery(id ?? '');

  useEffect(() => {
    if (data?.po) setPO(data.po);
  }, [data]);

  if (isLoading && !po) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (error || !po) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg font-semibold">{error instanceof Error ? error.message : 'PO not found'}</p>
          <button onClick={() => navigate('/pos')} className="mt-4 text-violet-400 hover:text-violet-300 text-sm">&lt;- Back to POs</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/pos" className="text-slate-400 hover:text-white">&lt;-</Link>
          <div>
            <h1 className="text-2xl font-bold">{po.poNumber}</h1>
            <p className="text-slate-400 text-sm">Vendor: {po.vendor.companyName}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[po.status] || STATUS_STYLE.DRAFT}`}>{po.status}</span>
      </div>

      <div className="px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">PO to Invoice to Payment Timeline</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              {getTimeline(po).map((step, index) => (
                <div
                  key={step.title}
                  className={`rounded-xl border p-4 ${step.completed ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : step.current ? 'border-amber-400/30 bg-amber-500/10 text-amber-200' : 'border-white/10 bg-white/5 text-slate-400'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${step.completed ? 'border-emerald-400/30 bg-emerald-500/20 text-emerald-200' : step.current ? 'border-amber-400/30 bg-amber-500/20 text-amber-100' : 'border-white/10 bg-white/5 text-slate-400'}`}>
                      {index + 1}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider">{step.completed ? 'Done' : step.current ? 'Current' : 'Pending'}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">{step.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{step.meta}</p>
                </div>
              ))}
            </div>
            {po.invoices?.[0] && (
              <p className="mt-4 text-xs text-slate-500">
                Latest invoice {po.invoices[0].invoiceNumber} is {po.invoices[0].status.toLowerCase()} for Rs. {po.invoices[0].amount.toLocaleString('en-IN')}.
              </p>
            )}
          </div>

          <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Line Items</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['Description', 'Qty', 'Unit Price', 'Line Total'].map((h) => (
                    <th key={h} className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {po.items.map((item, index) => (
                  <tr key={index} className="border-b border-white/5">
                    <td className="py-3 text-white">{item.description}</td>
                    <td className="py-3 text-slate-300">{item.quantity}</td>
                    <td className="py-3 text-slate-300">Rs. {item.unitPrice.toLocaleString('en-IN')}</td>
                    <td className="py-3 text-slate-300">Rs. {item.lineTotal.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-right">
              <p className="text-slate-400 text-sm">Total</p>
              <p className="text-xl font-bold">Rs. {po.totalAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Approval Chain Progress</h2>
            <div className="space-y-3">
              {po.approvalSteps.map((step) => (
                <div key={step.step} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${step.status === 'APPROVED' ? 'bg-emerald-400' : step.status === 'REJECTED' ? 'bg-red-400' : step.isCurrent ? 'bg-amber-400' : 'bg-slate-600'}`} />
                  <div className="flex-1">
                    <p className="text-sm text-white">{step.role}</p>
                    <p className="text-xs text-slate-500">{step.status}{step.isCurrent ? ' - Current approver' : ''}</p>
                  </div>
                  {step.approvedAt && (
                    <p className="text-xs text-slate-500">{new Date(step.approvedAt).toLocaleString('en-IN')}</p>
                  )}
                </div>
              ))}
            </div>

            {po.rejectionReason && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-xs text-red-300 uppercase tracking-wider">Rejection Reason</p>
                <p className="text-sm text-red-200 mt-1">{po.rejectionReason}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Summary</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500">Created By</p>
                <p className="text-white">{po.createdBy.name} ({po.createdBy.role})</p>
              </div>
              <div>
                <p className="text-slate-500">Vendor Email</p>
                <p className="text-white">{po.vendor.email}</p>
              </div>
              <div>
                <p className="text-slate-500">Created At</p>
                <p className="text-white">{new Date(po.createdAt).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-slate-500">Current Approver</p>
                <p className="text-white">{po.currentApproverRole ?? '-'}</p>
              </div>
            </div>
          </div>

          <ApprovalActions po={po} onUpdated={setPO} />
        </div>
      </div>
    </div>
  );
}
