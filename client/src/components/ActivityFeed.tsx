import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';

type AuditLogUser = {
  name: string;
  role: string;
};

type AuditLog = {
  id: string;
  action: string;
  createdAt: string;
  user: AuditLogUser;
  metadata?: Record<string, unknown>;
};

export default function ActivityFeed({ entity, entityId }: { entity: string; entityId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const { data } = await api.get(`/audit-logs?entity=${entity}&entityId=${entityId}&limit=20`);
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch activity feed', err);
    } finally {
      setLoading(false);
    }
  }, [entity, entityId]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000); // refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const getActionColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE')) return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
    if (act.includes('APPROVE') || act.includes('MATCH')) return 'bg-green-500/15 text-green-400 border border-green-500/30';
    if (act.includes('REJECT') || act.includes('MISMATCH')) return 'bg-red-500/15 text-red-400 border border-red-500/30';
    if (act.includes('UPDATE') || act.includes('EDIT')) return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
    if (act.includes('UPLOAD')) return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
    return 'bg-slate-500/15 text-slate-500 dark:text-slate-500 dark:text-slate-400 border border-slate-500/30';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-violet-500 text-white';
      case 'FINANCE': return 'bg-blue-500 text-white';
      case 'PROCUREMENT': return 'bg-emerald-500 text-white';
      case 'MANAGER': return 'bg-amber-500 text-white';
      case 'VENDOR': return 'bg-rose-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="rounded-4xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/45 p-6 shadow-lg shadow-black/10 backdrop-blur-xl h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Activity Feed</h2>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-6">
        {loading && logs.length === 0 ? (
          <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">Loading activity...</div>
        ) : logs.length === 0 ? (
          <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">No activity recorded yet</div>
        ) : (
          <div className="relative border-l border-slate-200 dark:border-white/10 ml-4 space-y-8 pb-4">
            {logs.map((log) => (
              <div key={log.id} className="relative pl-6">
                <div className={`absolute -left-4 top-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-4 ring-white dark:ring-slate-950 ${getRoleColor(log.user.role)}`}>
                  {log.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{log.user.name}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-slate-500 ml-auto shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-2 rounded-xl bg-slate-50 dark:bg-white/5 p-3 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 whitespace-pre-wrap break-words">
                      {Object.entries(log.metadata)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join('\n')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
