import { useState, useEffect } from 'react';
import api from '../services/api';

export default function HealthIndicator() {
  const [status, setStatus] = useState<'ok' | 'degraded' | 'unknown'>('unknown');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get('/health');
        setStatus(res.status === 200 && res.data.status === 'ok' ? 'ok' : 'degraded');
      } catch {
        setStatus('degraded');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  const dotColor = status === 'ok' ? '#10b981' : status === 'degraded' ? '#ef4444' : '#64748b';
  const dotGlow = status === 'ok' ? '0 0 6px rgba(16,185,129,0.6)' : status === 'degraded' ? '0 0 6px rgba(239,68,68,0.6)' : 'none';
  const label = status === 'ok' ? 'Operational' : status === 'degraded' ? 'Degraded' : 'Checking…';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, boxShadow: dotGlow, flexShrink: 0 }} />
      System: {label}
    </div>
  );
}
