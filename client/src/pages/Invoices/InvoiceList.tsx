import { useState } from 'react';
import { Link } from 'react-router-dom';
import RoleGate from '../../components/RoleGate';
import { Role } from '../../store/authStore';
import { useAuthStore } from '../../store/authStore';
import SubmitInvoiceModal from './SubmitInvoiceModal';
import EmptyState from '../../components/EmptyState';
import { downloadCsv } from '../../utils/csv';
import { useInvoicesQuery } from '../../hooks/useInvoicesQuery';

const STATUS_STYLE: Record<string, string> = {
  SUBMITTED: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  MATCHED: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  MISMATCHED: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  APPROVED: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  PAID: 'bg-green-500/20 text-green-300 border border-green-500/30',
};

export default function InvoiceList() {
  const userRole = useAuthStore((s) => s.user?.role);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const { data, isLoading, refetch } = useInvoicesQuery();
  const invoices = data?.invoices ?? [];

  const exportCsv = () => {
    downloadCsv(
      'invoices.csv',
      ['Invoice #', 'PO #', 'Vendor', 'Amount', 'Status', 'Submitted'],
      invoices.map((invoice) => [
        invoice.invoiceNumber,
        invoice.po.poNumber,
        invoice.vendor.companyName,
        invoice.amount,
        invoice.status,
        new Date(invoice.submittedAt).toLocaleDateString('en-IN'),
      ])
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-slate-400 text-sm mt-0.5">{invoices.length} invoices</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white hover:bg-white/10 transition"
          >
            Export CSV
          </button>
          <RoleGate roles={[Role.VENDOR]} fallback={null}>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-2.5 bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl text-sm font-semibold"
            >
              + Submit Invoice
            </button>
          </RoleGate>
        </div>
      </div>

      <div className="px-8 py-6">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="Submit your first invoice against an approved purchase order to start the finance flow."
            actionLabel={userRole === Role.VENDOR ? 'Submit your first invoice' : undefined}
            onAction={userRole === Role.VENDOR ? () => setShowSubmitModal(true) : undefined}
          />
        ) : (
          <div className="bg-white/3 border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['Invoice #', 'PO #', 'Vendor', 'Amount', 'Status', 'Submitted', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="px-5 py-4 text-white font-medium">{inv.invoiceNumber}</td>
                    <td className="px-5 py-4 text-slate-300">{inv.po.poNumber}</td>
                    <td className="px-5 py-4 text-slate-300">{inv.vendor.companyName}</td>
                    <td className="px-5 py-4 text-slate-300">Rs. {inv.amount.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[inv.status] || STATUS_STYLE.SUBMITTED}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{new Date(inv.submittedAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-4">
                      <Link to={`/invoices/${inv.id}`} className="text-violet-400 hover:text-violet-300 font-medium text-xs">View -&gt;</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showSubmitModal && (
        <SubmitInvoiceModal
          onClose={() => setShowSubmitModal(false)}
          onSubmitted={refetch}
        />
      )}
    </div>
  );
}
