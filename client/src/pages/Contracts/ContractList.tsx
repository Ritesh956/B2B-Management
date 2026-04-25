import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Role } from '../../store/authStore';
import type { Contract } from '../../services/contracts';
import RoleGate from '../../components/RoleGate';
import AddContractModal from './AddContractModal';
import { useContractsQuery } from '../../hooks/useContractsQuery';

export default function ContractList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const expiringSoonOnly = searchParams.get('expiringSoon') === '1';

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchVendor, setSearchVendor] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const { data, isLoading, refetch } = useContractsQuery({
    status: statusFilter || undefined,
    searchVendor: searchVendor || undefined,
    page: pagination.page,
    limit: pagination.limit,
    expiringSoon: expiringSoonOnly,
  });

  const contracts = data?.contracts ?? [];
  const paginationState = data?.pagination ?? { page: pagination.page, limit: pagination.limit, total: 0, pages: 1 };

  const getStatusBadge = (contract: Contract) => {
    if (contract.isExpired) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">Expired</span>;
    }
    if (contract.isExpiringSoon) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">{contract.daysUntilExpiry} days left</span>;
    }
    return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Active</span>;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contracts</h1>
          <p className="text-slate-400 text-sm mt-1">Track all vendor agreements and expiry risk.</p>
          {expiringSoonOnly && (
            <p className="mt-2 inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
              Showing expiring contracts sorted by nearest expiry
            </p>
          )}
        </div>
        <RoleGate roles={[Role.ADMIN, Role.PROCUREMENT]}>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl text-sm font-semibold"
          >
            + New Contract
          </button>
        </RoleGate>
      </div>

      <div className="px-8 py-6">
      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search vendor..."
            value={searchVendor}
            onChange={(e) => setSearchVendor(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['', 'ACTIVE', 'EXPIRED', 'TERMINATED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                statusFilter === s
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/3">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-900 border-b border-white/10">
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Contract Title</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Vendor</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">End Date</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-slate-400">
                  No contracts found
                </td>
              </tr>
            ) : (
              contracts.map((contract) => (
                <tr
                  key={contract.id}
                  className="border-t border-white/5 cursor-pointer hover:bg-white/5 transition"
                  onClick={() => navigate(`/contracts/${contract.id}`)}
                >
                  <td className="px-6 py-4 text-sm text-white font-medium">{contract.title}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{contract.vendor.companyName}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {new Date(contract.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">{getStatusBadge(contract)}</td>
                  <td className="px-6 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/contracts/${contract.id}`)}
                      className="text-violet-400 hover:text-violet-300 font-medium text-xs"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paginationState.pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPagination((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}
            disabled={paginationState.page === 1}
            className="px-3 py-2 border border-white/15 rounded-lg disabled:opacity-50 hover:bg-white/5"
          >
            Previous
          </button>
          <span className="text-sm text-slate-300">
            Page {paginationState.page} of {paginationState.pages}
          </span>
          <button
            onClick={() => setPagination((current) => ({ ...current, page: Math.min(paginationState.pages, current.page + 1) }))}
            disabled={paginationState.page === paginationState.pages}
            className="px-3 py-2 border border-white/15 rounded-lg disabled:opacity-50 hover:bg-white/5"
          >
            Next
          </button>
        </div>
      )}
      </div>

      {/* Add Contract Modal */}
      {showAddModal && <AddContractModal onClose={() => setShowAddModal(false)} onSuccess={async () => {
        setShowAddModal(false);
        await refetch();
      }} />}
    </div>
  );
}
