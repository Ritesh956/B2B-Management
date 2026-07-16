import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import RoleGate from '../../components/RoleGate';
import { Role } from '../../store/authStore';
import { auditLogService, type AuditLogItem } from '../../services/auditLogs';
import EmptyState from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeletons';

const actionColor = (action: string): React.CSSProperties => {
  const normalized = action.toUpperCase();
  if (normalized.includes('CREATE') || normalized.includes('SUBMIT'))
    return { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' };
  if (normalized.includes('APPROVE') || normalized.includes('VERIFY'))
    return { background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' };
  if (normalized.includes('REJECT') || normalized.includes('TERMINATE'))
    return { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' };
  if (normalized.includes('UPDATE') || normalized.includes('STATUS'))
    return { background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' };
  if (normalized.includes('PAY'))
    return { background: 'rgba(6,182,212,0.15)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.3)' };
  return { background: 'rgba(100,116,139,0.15)', color: 'var(--text-secondary)', border: '1px solid var(--border-dim)' };
};

const metadataText = (metadata: Record<string, unknown> | null): string => {
  if (!metadata) return '-';
  const entries = Object.entries(metadata);
  if (entries.length === 0) return '-';
  return entries
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' | ');
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [entity, setEntity] = useState('');
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');

  const filters = useMemo(
    () => ({ entity: entity || undefined, userId: userId || undefined, search: search || undefined, from: from || undefined }),
    [entity, userId, search, from]
  );

  const loadLogs = async (targetPage = 1) => {
    try {
      setLoading(true);
      const data = await auditLogService.list({
        page: targetPage,
        limit: 20,
        ...filters,
      });
      setLogs(data.logs);
      setPage(data.pagination.page);
      setPages(data.pagination.pages);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
  }, [filters]);

  return (
    <RoleGate roles={[Role.ADMIN]}>
      <div className="page-root">
        {/* Page Header */}
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              to="/dashboard"
              className="btn-ghost"
              style={{ fontSize: '12px', textDecoration: 'none' }}
            >
              &larr; Back to Dashboard
            </Link>
            <div>
              <h1 className="page-title" style={{ marginBottom: '2px' }}>Audit Logs</h1>
              <p className="page-subtitle" style={{ margin: 0 }}>Track all key actions across vendors, purchase orders, invoices, and contracts.</p>
            </div>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{logs.length} rows shown</span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div className="card-sm" style={{ display: 'flex', padding: '4px', flex: 1, minWidth: '300px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-muted)' }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search action / entity / ID..."
                className="input-base"
                style={{ paddingLeft: '38px', width: '100%', border: 'none', background: 'transparent', boxShadow: 'none' }}
              />
            </div>
            <div style={{ width: '1px', background: 'var(--border-dim)', margin: '4px 0' }} />
            <input
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              placeholder="Entity type..."
              className="input-base"
              style={{ border: 'none', background: 'transparent', boxShadow: 'none', width: '140px' }}
            />
            <div style={{ width: '1px', background: 'var(--border-dim)', margin: '4px 0' }} />
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User ID..."
              className="input-base"
              style={{ border: 'none', background: 'transparent', boxShadow: 'none', width: '140px' }}
            />
            <div style={{ width: '1px', background: 'var(--border-dim)', margin: '4px 0' }} />
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              type="date"
              className="input-base"
              style={{ border: 'none', background: 'transparent', boxShadow: 'none', width: '140px' }}
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : logs.length === 0 ? (
          <EmptyState
            title="No activity recorded yet"
            description="Audit logs will appear here once actions are taken on vendors, purchase orders, invoices, or contracts."
          />
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden', overflowX: 'auto' }}>
            <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '26%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>What Changed</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ overflowWrap: 'anywhere' }}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>
                      <div style={{ color: 'var(--text-secondary)' }}>{log.user?.name || 'System'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{log.user?.email || log.userId || '-'}</div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '3px 10px', borderRadius: '999px',
                        fontSize: '11px', fontWeight: 600,
                        ...actionColor(log.action)
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ overflowWrap: 'anywhere' }}>
                      <div style={{ color: 'var(--text-secondary)' }}>{log.entity}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{log.entityId}</div>
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{metadataText(log.metadata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Page {page} of {pages}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => loadLogs(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="btn-secondary"
              style={{ opacity: page <= 1 ? 0.4 : 1 }}
            >
              Prev
            </button>
            <button
              onClick={() => loadLogs(Math.min(pages, page + 1))}
              disabled={page >= pages}
              className="btn-secondary"
              style={{ opacity: page >= pages ? 0.4 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}
