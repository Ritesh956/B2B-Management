import { useState } from 'react';
import { Link } from 'react-router-dom';
import { type POStatus } from '../../services/pos';
import { Role } from '../../store/authStore';
import { useAuthStore } from '../../store/authStore';
import RoleGate from '../../components/RoleGate';
import CreatePOModal from './CreatePOModal';
import EmptyState from '../../components/EmptyState';
import { downloadCsv } from '../../utils/csv';
import { usePOsQuery } from '../../hooks/usePOQuery';
import { useVendorsQuery } from '../../hooks/useVendorsQuery';

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  PENDING_APPROVAL: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  APPROVED: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  REJECTED: 'bg-red-500/15 text-red-400 border border-red-500/30',
  CLOSED: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
};

const FILTERS: Array<POStatus | ''> = ['', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'];

export default function POList() {
  const userRole = useAuthStore((s) => s.user?.role);
  const [statusFilter, setStatusFilter] = useState<POStatus | ''>('');
  const [showCreate, setShowCreate] = useState(false);
  const { data: poData, isLoading, refetch: refetchPOs } = usePOsQuery({ status: statusFilter || undefined });
  const { data: vendorData } = useVendorsQuery({ status: 'VERIFIED', limit: 100 });
  const pos = poData?.pos ?? [];
  const vendors = vendorData?.vendors ?? [];

  const exportCsv = () => {
    downloadCsv(
      'purchase-orders.csv',
      ['PO Number', 'Vendor', 'Total', 'Status', 'Current Approver', 'Created'],
      pos.map((po) => [
        po.poNumber,
        po.vendor.companyName,
        po.totalAmount,
        po.status,
        po.currentApproverRole ?? '',
        new Date(po.createdAt).toLocaleDateString('en-IN'),
      ])
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-slate-400 text-sm mt-0.5">{pos.length} records</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white hover:bg-white/10 transition"
          >
            Export CSV
          </button>
          <RoleGate roles={[Role.PROCUREMENT]} fallback={null}>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2.5 bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl text-sm font-semibold"
            >
              + New PO
            </button>
          </RoleGate>
        </div>
      </div>

      <div className="px-8 py-4 border-b border-white/5 flex gap-2">
        {FILTERS.map((status) => (
          <button
            key={status || 'ALL'}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm border transition ${
              statusFilter === status
                ? 'bg-violet-600 border-violet-500 text-white'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      <div className="px-8 py-6">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pos.length === 0 ? (
          <EmptyState
            title="No purchase orders yet"
            description="Create the first purchase order to start your approval and invoice flow."
            actionLabel={userRole === Role.PROCUREMENT ? 'Create your first PO' : undefined}
            onAction={userRole === Role.PROCUREMENT ? () => setShowCreate(true) : undefined}
          />
        ) : (
          <div className="bg-white/3 border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['PO Number', 'Vendor', 'Total', 'Status', 'Current Approver', 'Created', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pos.map((po) => (
                  <tr key={po.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="px-5 py-4 text-white font-medium">{po.poNumber}</td>
                    <td className="px-5 py-4 text-slate-300">{po.vendor.companyName}</td>
                    <td className="px-5 py-4 text-slate-300">Rs. {po.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[po.status] || STATUS_STYLE.DRAFT}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{po.currentApproverRole ?? '-'}</td>
                    <td className="px-5 py-4 text-slate-400">{new Date(po.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-4">
                      <Link to={`/pos/${po.id}`} className="text-violet-400 hover:text-violet-300 font-medium text-xs">View -&gt;</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreatePOModal
          vendors={vendors}
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            await refetchPOs();
          }}
        />
      )}
    </div>
  );
}
