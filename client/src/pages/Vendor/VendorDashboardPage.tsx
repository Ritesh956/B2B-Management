import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { vendorPortalService, type VendorDashboardResponse } from '../../services/vendorPortal';

export default function VendorDashboardPage() {
  const [data, setData] = useState<VendorDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const resp = await vendorPortalService.getDashboard();
        setData(resp);
      } catch (err) {
        console.error('Failed to load vendor dashboard', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="p-6 text-white">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Vendor Dashboard</h1>
        <p className="mt-1 text-slate-400">Track your POs, invoices and contracts in one place.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
          <p className="text-xs uppercase text-slate-400">My POs</p>
          <p className="mt-2 text-3xl font-bold">{loading ? '...' : data?.summary.poCount ?? 0}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
          <p className="text-xs uppercase text-slate-400">Submitted Invoices</p>
          <p className="mt-2 text-3xl font-bold">{loading ? '...' : data?.summary.submittedInvoiceCount ?? 0}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
          <p className="text-xs uppercase text-slate-400">Contracts (Active / Expiring / Expired)</p>
          <p className="mt-2 text-2xl font-bold">
            {loading
              ? '...'
              : `${data?.summary.contractSummary.active ?? 0} / ${data?.summary.contractSummary.expiringSoon ?? 0} / ${data?.summary.contractSummary.expired ?? 0}`}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link to="/vendor/invoices/new" className="rounded-lg bg-violet-600 px-4 py-2 font-medium hover:bg-violet-500">
          Submit New Invoice
        </Link>
        <Link to="/vendor/profile" className="rounded-lg border border-white/20 px-4 py-2 font-medium hover:bg-white/5">
          Update Profile
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
          <h2 className="mb-3 text-lg font-semibold">Recent Purchase Orders</h2>
          <div className="space-y-2">
            {(data?.pos ?? []).slice(0, 5).map((po) => (
              <div key={po.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-950 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{po.poNumber}</p>
                  <p className="text-xs text-slate-400">{po.status}</p>
                </div>
                <p className="text-sm font-semibold">{po.totalAmount.toFixed(2)}</p>
              </div>
            ))}
            {(data?.pos.length ?? 0) === 0 && <p className="text-sm text-slate-400">No purchase orders yet.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
          <h2 className="mb-3 text-lg font-semibold">Recent Invoices</h2>
          <div className="space-y-2">
            {(data?.invoices ?? []).slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-950 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{invoice.invoiceNumber}</p>
                  <p className="text-xs text-slate-400">PO: {invoice.po.poNumber}</p>
                </div>
                <p className="text-xs font-semibold text-slate-300">{invoice.status}</p>
              </div>
            ))}
            {(data?.invoices.length ?? 0) === 0 && <p className="text-sm text-slate-400">No invoices yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
