import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { type POStatus } from '../../services/pos';
import { Role } from '../../store/authStore';
import { useAuthStore } from '../../store/authStore';
import RoleGate from '../../components/RoleGate';
import CreatePOModal from './CreatePOModal';
import EmptyState from '../../components/EmptyState';
import { downloadBlob } from '../../utils/csv';
import { formatCurrency } from '../../utils/currency';
import { usePOsQuery } from '../../hooks/usePOQuery';
import { useVendorsQuery } from '../../hooks/useVendorsQuery';
import { TableSkeleton } from '../../components/Skeletons';

import CopyToClipboard from '../../components/CopyToClipboard';
import toast from 'react-hot-toast';

type FilterValues = { statuses: string[]; vendorId: string; minAmount: string; maxAmount: string; fromDate: string; toDate: string; createdById: string; };

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
  const [searchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const filters = paramsToFilters(searchParams);

  const apiParams: Record<string, string> = filtersToParams(filters);

  const { data: poData, isLoading, refetch: refetchPOs } = usePOsQuery(
    { status: apiParams.status as POStatus | undefined, ...apiParams, page, limit } as any
  );
  const { data: vendorData } = useVendorsQuery({ limit: 100 });
  const pos = poData?.pos ?? [];
  const vendors = vendorData?.vendors ?? [];
  const total = poData?.total ?? 0;
  const approvedCount = poData?.approvedCount ?? 0;
  const pendingCount = poData?.pendingCount ?? 0;
  const totalPages = Math.ceil(total / limit);

  useEffect(() => { setPage(1); }, [JSON.stringify(apiParams)]);

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
                <p className="stat-value">{total}</p>
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
            <RoleGate roles={[Role.PROCUREMENT, Role.ADMIN]} fallback={null}>
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                New PO
              </button>
            </RoleGate>
          </div>
        </div>
      </div>


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
                    <td>{formatCurrency(po.totalAmount)}</td>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} · {total} purchase orders
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost"
                style={{ fontSize: 13, opacity: page === 1 ? 0.4 : 1 }}
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-ghost"
                style={{ fontSize: 13, opacity: page === totalPages ? 0.4 : 1 }}
              >
                Next →
              </button>
            </div>
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
