import { useState } from 'react';
import { useContractsQuery } from '../../hooks/useContractsQuery';
import { Download } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeletons';
import { withAuthToken } from '../../utils/fileUrl';

const CONTRACT_STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#10b981', EXPIRED: '#ef4444', TERMINATED: '#f59e0b', DRAFT: '#94a3b8',
};

export default function VendorContractList() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useContractsQuery({});
  const contracts = data?.contracts || [];
  const filteredContracts = contracts.filter((c: any) => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-root animate-in">
      <div className="page-header">
        <h1 className="page-title">My Contracts</h1>
        <p className="page-subtitle">All vendor agreements and their current status.</p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 340, marginBottom: 4 }}>
        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--text-muted)', pointerEvents: 'none' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by contract title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base"
          style={{ paddingLeft: 36, width: '100%' }}
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : filteredContracts.length === 0 ? (
        <EmptyState title="No contracts found" description="You don't have any active contracts matching your search." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((c: any) => {
                const statusColor = CONTRACT_STATUS_COLOR[c.status] || '#94a3b8';
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.title}</td>
                    <td>{new Date(c.startDate).toLocaleDateString()}</td>
                    <td>{new Date(c.endDate).toLocaleDateString()}</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                        background: `${statusColor}15`, color: statusColor,
                        border: `1px solid ${statusColor}30`, textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>{c.status}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {c.fileUrl && (
                        <a href={withAuthToken(c.fileUrl)} target="_blank" rel="noreferrer" style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontSize: 12.5, fontWeight: 600, color: '#10b981',
                          textDecoration: 'none', transition: 'color 150ms',
                        }}>
                          <Download size={13} /> Download PDF
                        </a>
                      )}
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
