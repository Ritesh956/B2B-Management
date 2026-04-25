import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import RoleGate from '../../components/RoleGate';
import { Role } from '../../store/authStore';
import { auditLogService, type AuditLogItem } from '../../services/auditLogs';

const actionColor = (action: string): string => {
  const normalized = action.toUpperCase();
  if (normalized.includes('CREATE') || normalized.includes('SUBMIT')) return 'bg-emerald-500/20 text-emerald-300';
  if (normalized.includes('APPROVE') || normalized.includes('VERIFY')) return 'bg-blue-500/20 text-blue-300';
  if (normalized.includes('REJECT') || normalized.includes('TERMINATE')) return 'bg-red-500/20 text-red-300';
  if (normalized.includes('UPDATE') || normalized.includes('STATUS')) return 'bg-amber-500/20 text-amber-300';
  if (normalized.includes('PAY')) return 'bg-cyan-500/20 text-cyan-300';
  return 'bg-slate-500/20 text-slate-300';
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
      <div className="min-h-screen w-full max-w-full bg-slate-950 text-white">
        <div className="border-b border-white/5 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              Back to Dashboard
            </Link>

            <div>
              <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
              <p className="text-slate-400 text-sm mt-0.5">Track all key actions across vendors, purchase orders, invoices, and contracts.</p>
            </div>
          </div>
          <span className="text-sm text-slate-500">{logs.length} rows shown</span>
        </div>

        <div className="px-8 py-4 border-b border-white/5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search action/entity/id"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
            </div>
            <input
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              placeholder="Entity (Vendor, Invoice...)"
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
            />
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User ID"
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
            />
            <div>
              <input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                type="date"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          <div className="bg-white/3 border border-white/5 rounded-2xl">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[20%]" />
                <col className="w-[10%]" />
                <col className="w-[20%]" />
                <col className="w-[30%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Entity</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">What Changed</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-5 py-12 text-center text-slate-400" colSpan={5}>Loading audit logs...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td className="px-5 py-12 text-center text-slate-400" colSpan={5}>No audit logs found.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-5 py-4 text-slate-300 break-words">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-5 py-4 text-slate-300">
                        <div>{log.user?.name || 'System'}</div>
                        <div className="text-xs text-slate-500 break-all">{log.user?.email || log.userId || '-'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium border border-white/10 ${actionColor(log.action)}`}>{log.action}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-300 break-words">
                        <div>{log.entity}</div>
                        <div className="text-xs text-slate-500 break-all">{log.entityId}</div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-300 break-all">{metadataText(log.metadata)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => loadLogs(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 hover:text-white disabled:opacity-40 transition"
              >
                Prev
              </button>
              <button
                onClick={() => loadLogs(Math.min(pages, page + 1))}
                disabled={page >= pages}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 hover:text-white disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}
