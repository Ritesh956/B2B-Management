import { useState } from 'react';
import { usePOsQuery } from '../../hooks/usePOQuery';
import { Link } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeletons';
import { formatCurrency } from '../../utils/currency';

const PO_STATUS_COLOR: Record<string, string> = {
  APPROVED: '#10b981', PENDING_APPROVAL: '#f59e0b', DRAFT: '#94a3b8', REJECTED: '#ef4444', CLOSED: '#64748b',
};

export default function VendorPOList() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = usePOsQuery();
  const pos = data?.pos || [];
  const filteredPOs = pos.filter((po) => po.poNumber.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-root animate-in">
      <div className="page-header">
        <h1 className="page-title">My Purchase Orders</h1>
        <p className="page-subtitle">All purchase orders assigned to your vendor account.</p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 340, marginBottom: 4 }}>
        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--text-muted)', pointerEvents: 'none' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by PO number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base"
          style={{ paddingLeft: 36, width: '100%' }}
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : filteredPOs.length === 0 ? (
        <EmptyState title="No purchase orders" description="You don't have any purchase orders matching your search." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPOs.map((po) => {
                const statusColor = PO_STATUS_COLOR[po.status] || '#94a3b8';
                return (
                  <tr key={po.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{po.poNumber}</td>
                    <td>{formatCurrency(po.totalAmount)}</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                        background: `${statusColor}15`, color: statusColor,
                        border: `1px solid ${statusColor}30`, textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>{po.status}</span>
                    </td>
                    <td>{new Date(po.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/vendor/pos/${po.id}`} style={{ color: '#10b981', fontWeight: 600, fontSize: 12.5 }}>View Details →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
