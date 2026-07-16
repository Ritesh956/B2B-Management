import { useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { type POStatus } from '../../services/pos';
import { Role } from '../../store/authStore';
import { useAuthStore } from '../../store/authStore';
import RoleGate from '../../components/RoleGate';
import CreatePOModal from './CreatePOModal';
import EmptyState from '../../components/EmptyState';
import { downloadBlob } from '../../utils/csv';
import { usePOsQuery } from '../../hooks/usePOQuery';
import { useVendorsQuery } from '../../hooks/useVendorsQuery';
import { TableSkeleton } from '../../components/Skeletons';
import FilterPanel, { type FilterValues, countActiveFilters, getFilterPills } from '../../components/FilterPanel';
import CopyToClipboard from '../../components/CopyToClipboard';
import toast from 'react-hot-toast';

const EMPTY_FILTERS: FilterValues = {
  statuses: [], vendorId: '', minAmount: '', maxAmount: '', fromDate: '', toDate: '', createdById: '',
};

function filtersToParams(f: FilterValues) {
  const p: Record<string, string> = {};
  if (f.statuses.length > 0) p.status = f.statuses.join(',');
  if (f.vendorId) p.vendorId = f.vendorId;
  if (f.minAmount) p.minAmount = f.minAmount;
  if (f.maxAmount) p.maxAmount = f.maxAmount;
  if (f.fromDate) p.fromDate = f.fromDate;
  if (f.toDate) p.toDate = f.toDate;
  if (f.createdById) p.createdById = f.createdById;
  return p;
}

function paramsToFilters(params: URLSearchParams): FilterValues {
  return {
    statuses: params.get('status') ? params.get('status')!.split(',') : [],
    vendorId: params.get('vendorId') || '',
    minAmount: params.get('minAmount') || '',
    maxAmount: params.get('maxAmount') || '',
    fromDate: params.get('fromDate') || '',
    toDate: params.get('toDate') || '',
    createdById: params.get('createdById') || '',
  };
}

export default function POList() {
  const userRole = useAuthStore((s) => s.user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const filters = paramsToFilters(searchParams);

  const handleFiltersChange = useCallback((newFilters: FilterValues) => {
    const params = filtersToParams(newFilters);
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const apiParams: Record<string, string> = filtersToParams(filters);

  const { data: poData, isLoading, refetch: refetchPOs } = usePOsQuery(
    { status: apiParams.status as POStatus | undefined, ...apiParams } as any
  );
  const { data: vendorData } = useVendorsQuery({ limit: 100 });
  const pos = poData?.pos ?? [];
  const vendors = vendorData?.vendors ?? [];
  const approvedCount = pos.filter((po) => po.status === 'APPROVED').length;
  const pendingCount = pos.filter((po) => po.status === 'PENDING_APPROVAL').length;
  const activeFilterCount = countActiveFilters(filters);
  const filterPills = getFilterPills(filters, handleFiltersChange, vendors.map(v => ({ id: v.id, name: v.companyName })));

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams(apiParams);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/pos/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to export CSV');
      const blob = await res.blob();
      downloadBlob(blob, 'purchase-orders.csv');
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="page-root">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h1 className="page-title">Purchase Orders</h1>
              <p className="page-subtitle">Review approval flow, vendor linkage, and creation history from one place.</p>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', minWidth: '300px' }}>
              <div className="stat-card">
                <p className="stat-label">Total</p>
                <p className="stat-value">{pos.length}</p>
              </div>
              <div className="stat-card" style={{ borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.08)' }}>
                <p className="stat-label" style={{ color: '#f59e0b' }}>Pending</p>
                <p className="stat-value">{pendingCount}</p>
              </div>
              <div className="stat-card" style={{ borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.08)' }}>
                <p className="stat-label" style={{ color: '#10b981' }}>Approved</p>
                <p className="stat-value">{approvedCount}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <button onClick={exportCsv} className="btn-secondary">
              Export CSV
            </button>
            <button
              onClick={() => setFilterOpen(true)}
              className={activeFilterCount > 0 ? 'btn-secondary' : 'btn-secondary'}
              style={activeFilterCount > 0 ? { borderColor: 'rgba(6,182,212,0.4)', color: '#06b6d4', background: 'rgba(6,182,212,0.08)' } : {}}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: '#06b6d4', fontSize: '10px', fontWeight: 700, color: '#fff'
                  }}>
                    {activeFilterCount}
                  </span>
                )}
              </span>
            </button>
            <RoleGate roles={[Role.PROCUREMENT, Role.ADMIN]} fallback={null}>
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                New PO
              </button>
            </RoleGate>
          </div>
        </div>
      </div>

      {/* Active filter pills */}
      {filterPills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active filters:</span>
          {filterPills.map((pill, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              borderRadius: '9999px', border: '1px solid rgba(6,182,212,0.25)',
              background: 'rgba(6,182,212,0.08)', padding: '2px 10px',
              fontSize: '11px', color: '#06b6d4'
            }}>
              {pill.label}
              <button onClick={pill.onRemove} style={{ color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
            </span>
          ))}
          <button
            onClick={() => handleFiltersChange(EMPTY_FILTERS)}
            style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Table */}
      <div>
        {isLoading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : pos.length === 0 ? (
          <EmptyState
            title="No purchase orders yet"
            description="Create the first purchase order to start your approval and invoice flow."
            actionLabel={(userRole === Role.PROCUREMENT || userRole === Role.ADMIN) ? 'Create your first PO' : undefined}
            onAction={(userRole === Role.PROCUREMENT || userRole === Role.ADMIN) ? () => setShowCreate(true) : undefined}
          />
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['PO Number', 'Vendor', 'Total', 'Status', 'Current Approver', 'Created', ''].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pos.map((po) => (
                  <tr key={po.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {po.poNumber}
                        <CopyToClipboard text={po.poNumber} label="Copy PO Number" />
                      </div>
                    </td>
                    <td>{po.vendor.companyName}</td>
                    <td>Rs. {po.totalAmount.toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`badge badge-${po.status.toLowerCase()}`}>
                        {po.status}
                      </span>
                    </td>
                    <td>{po.currentApproverRole ?? '-'}</td>
                    <td>{new Date(po.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <Link to={`/pos/${po.id}`} style={{ color: '#6366f1', fontWeight: 500, fontSize: '12px' }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FilterPanel
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        config={{
          availableStatuses: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DRAFT', 'CLOSED'],
          vendors: vendors.map((v) => ({ id: v.id, name: v.companyName })),
        }}
        values={filters}
        onChange={handleFiltersChange}
        savedFilterKey="pos"
      />

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
