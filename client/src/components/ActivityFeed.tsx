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

const getActionStyle = (action: string): React.CSSProperties => {
  const act = action.toUpperCase();
  if (act.includes('CREATE')) return { background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' };
  if (act.includes('APPROVE') || act.includes('MATCH')) return { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' };
  if (act.includes('REJECT') || act.includes('MISMATCH')) return { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' };
  if (act.includes('UPDATE') || act.includes('EDIT')) return { background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' };
  if (act.includes('UPLOAD')) return { background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' };
  return { background: 'rgba(100,116,139,0.15)', color: 'var(--text-secondary)', border: '1px solid var(--border-dim)' };
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#8b5cf6',
  FINANCE: '#3b82f6',
  PROCUREMENT: '#10b981',
  MANAGER: '#f59e0b',
  VENDOR: '#f43f5e',
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

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Activity Feed</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {loading && logs.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', padding: '16px 0' }}>Loading activity...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', padding: '16px 0' }}>No activity recorded yet</div>
        ) : (
          <div style={{ position: 'relative', borderLeft: '1px solid var(--border-dim)', marginLeft: 16, display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 16 }}>
            {logs.map((log) => (
              <div key={log.id} style={{ position: 'relative', paddingLeft: 24 }}>
                <div style={{
                  position: 'absolute', left: -16, top: 2,
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#fff',
                  background: ROLE_COLORS[log.user.role] ?? '#64748b',
                  boxShadow: '0 0 0 4px var(--bg-card)',
                }}>
                  {log.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{log.user.name}</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      ...getActionStyle(log.action),
                    }}>
                      {log.action}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div style={{
                      marginTop: 8, borderRadius: 10, background: 'var(--bg-surface)',
                      border: '1px solid var(--border-dim)', padding: 12,
                      fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
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
