import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Role } from '../../store/authStore';
import type { Contract } from '../../services/contracts';
import RoleGate from '../../components/RoleGate';
import { TableSkeleton } from '../../components/Skeletons';
import AddContractModal from './AddContractModal';
import { useContractsQuery } from '../../hooks/useContractsQuery';
import EmptyState from '../../components/EmptyState';

export default function ContractList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const expiringSoonOnly = searchParams.get('expiringSoon') === '1';
  const currentFilter = searchParams.get('filter') || (expiringSoonOnly ? 'expiring' : 'all');

  const [searchVendor, setSearchVendor] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const { data, isLoading, refetch } = useContractsQuery({
    searchVendor: searchVendor || undefined,
    page: pagination.page,
    limit: pagination.limit,
    filter: currentFilter !== 'all' ? currentFilter : undefined,
  });

  const contracts = data?.contracts ?? [];
  const paginationState = data?.pagination ?? { page: pagination.page, limit: pagination.limit, total: 0, pages: 1 };
  const activeCount = contracts.filter((contract) => contract.status === 'ACTIVE').length;
  const expiringCount = contracts.filter((contract) => contract.isExpiringSoon).length;
  const expiredCount = contracts.filter((contract) => contract.isExpired).length;

  const getStatusBadge = (contract: Contract) => {
    if (contract.isExpired) {
      const days = Math.abs(contract.daysUntilExpiry);
      return (
        <span className="badge badge-rejected">
          Expired {days} day{days === 1 ? '' : 's'} ago
        </span>
      );
    }
    if (contract.isExpiringSoon) {
      return (
        <span className="badge badge-pending">
          Expires in {contract.daysUntilExpiry} day{contract.daysUntilExpiry === 1 ? '' : 's'}
        </span>
      );
    }
    return (
      <span className="badge badge-active">
        Expires in {contract.daysUntilExpiry} day{contract.daysUntilExpiry === 1 ? '' : 's'}
      </span>
    );
  };

  return (
    <div className="page-root">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h1 className="page-title">Contracts</h1>
          <p className="page-subtitle">Track vendor agreements, expiry risk, and the contracts that need attention now.</p>
          {expiringSoonOnly && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', marginTop: '8px',
              padding: '4px 12px', borderRadius: '999px',
              border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)',
              fontSize: '11px', fontWeight: 500, color: '#fbbf24', width: 'fit-content'
            }}>
              Showing expiring contracts sorted by nearest expiry
            </span>
          )}
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '420px' }}>
          <div className="stat-card">
            <span className="stat-label">Total</span>
            <span className="stat-value">{contracts.length}</span>
          </div>
          <div className="stat-card" style={{ borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.08)' }}>
            <span className="stat-label" style={{ color: 'rgba(52,211,153,0.8)' }}>Active</span>
            <span className="stat-value" style={{ color: '#34d399' }}>{activeCount}</span>
          </div>
          <div className="stat-card" style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.08)' }}>
            <span className="stat-label" style={{ color: 'rgba(251,191,36,0.8)' }}>Attention</span>
            <span className="stat-value" style={{ color: '#fbbf24' }}>{expiringCount + expiredCount}</span>
          </div>
        </div>

        <RoleGate roles={[Role.ADMIN, Role.PROCUREMENT]}>
          <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ width: 'fit-content' }}>
            + New Contract
          </button>
        </RoleGate>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex', gap: '24px', marginBottom: '8px',
        borderBottom: '1px solid var(--border-dim)'
      }}>
        {[
          { id: 'all', label: 'All' },
          { id: 'expiring', label: 'Expiring Soon (\u226430 days)' },
          { id: 'expired', label: 'Expired' },
          { id: 'active', label: 'Active' },
        ].map((tab) => {
          const active = currentFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSearchParams((prev) => {
                  prev.set('filter', tab.id);
                  prev.delete('expiringSoon');
                  return prev;
                });
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              style={{
                paddingBottom: '14px',
                fontSize: '13px',
                fontWeight: 600,
                position: 'relative',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: active ? '#06b6d4' : 'var(--text-muted)',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
              {active && (
                <span style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '2px', borderRadius: '2px',
                  background: 'linear-gradient(90deg, #38bdf8, #06b6d4, #8b5cf6)'
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Search Filter */}
      <div className="card-sm" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: '1' }}>
          <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-muted)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search vendor..."
            value={searchVendor}
            onChange={(e) => setSearchVendor(e.target.value)}
            className="input-base"
            style={{ paddingLeft: '38px', width: '100%', border: 'none', background: 'transparent', boxShadow: 'none' }}
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : contracts.length === 0 ? (
        <EmptyState
          title="No contracts found"
          description="Upload a contract to track vendor agreements, expiry risk, and renewals."
          actionLabel="Upload a contract"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Contract Title</th>
                <th>Vendor</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr
                  key={contract.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/contracts/${contract.id}`)}
                >
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{contract.title}</td>
                  <td>{contract.vendor.companyName}</td>
                  <td>{new Date(contract.endDate).toLocaleDateString()}</td>
                  <td>{getStatusBadge(contract)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/contracts/${contract.id}`)}
                      style={{ color: '#a78bfa', fontWeight: 600, fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      View &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {paginationState.pages > 1 && (
        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <button
            onClick={() => setPagination((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}
            disabled={paginationState.page === 1}
            className="btn-secondary"
            style={{ opacity: paginationState.page === 1 ? 0.4 : 1 }}
          >
            Previous
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Page {paginationState.page} of {paginationState.pages}
          </span>
          <button
            onClick={() => setPagination((current) => ({ ...current, page: Math.min(paginationState.pages, current.page + 1) }))}
            disabled={paginationState.page === paginationState.pages}
            className="btn-secondary"
            style={{ opacity: paginationState.page === paginationState.pages ? 0.4 : 1 }}
          >
            Next
          </button>
        </div>
      )}

      {/* Add Contract Modal */}
      {showAddModal && <AddContractModal onClose={() => setShowAddModal(false)} onSuccess={async () => {
        setShowAddModal(false);
        await refetch();
      }} />}
    </div>
  );
}
