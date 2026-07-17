import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/currency';

const STAT_ACCENTS = [
  { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  { color: '#06b6d4', bg: 'rgba(6,182,212,0.08)',  border: 'rgba(6,182,212,0.2)' },
  { color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' },
  { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
];

const POStatusColor: Record<string, string> = {
  APPROVED: '#10b981', PENDING_APPROVAL: '#f59e0b', DRAFT: '#94a3b8', REJECTED: '#ef4444', CLOSED: '#64748b',
};
const InvStatusColor: Record<string, string> = {
  PAID: '#10b981', APPROVED: '#6366f1', MATCHED: '#06b6d4', SUBMITTED: '#f59e0b', MISMATCHED: '#ef4444',
};

export default function VendorDashboardPage() {
  const [stats, setStats] = useState({ openPOs: 0, submittedInvoices: 0, paidInvoices: 0, activeContracts: 0 });
  const [recentPOs, setRecentPOs] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const dashboardRes = await api.get('/vendor/dashboard');
        if (dashboardRes.data) {
          setStats({
            openPOs: dashboardRes.data.summary?.poCount || 0,
            submittedInvoices: dashboardRes.data.summary?.submittedInvoiceCount || 0,
            paidInvoices: dashboardRes.data.summary?.paidInvoiceCount || 0,
            activeContracts: dashboardRes.data.summary?.contractSummary?.active || 0,
          });
          setRecentPOs(dashboardRes.data.pos || []);
          setRecentInvoices(dashboardRes.data.invoices || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const statCards = [
    { label: 'Open POs', value: stats.openPOs },
    { label: 'Submitted Invoices', value: stats.submittedInvoices },
    { label: 'Paid Invoices', value: stats.paidInvoices },
    { label: 'Active Contracts', value: stats.activeContracts },
  ];

  return (
    <div className="page-root animate-in">
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="stat-card">
                <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 36, width: '40%' }} />
              </div>
            ))
          : statCards.map((card, i) => {
              const accent = STAT_ACCENTS[i];
              return (
                <div key={card.label} className="stat-card" style={{ borderColor: accent.border, background: accent.bg, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 70, height: 70, background: `radial-gradient(circle, ${accent.color}20, transparent 70%)`, pointerEvents: 'none' }} />
                  <p className="stat-label" style={{ marginBottom: 10 }}>{card.label}</p>
                  <p className="stat-value" style={{ color: accent.color }}>{card.value}</p>
                </div>
              );
            })
        }
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Submit an Invoice', href: '/vendor/invoices/new', color: '#10b981' },
          { label: 'View My POs', href: '/vendor/pos', color: '#06b6d4' },
          { label: 'View My Contracts', href: '/vendor/contracts', color: '#6366f1' },
        ].map(({ label, href, color }) => (
          <Link key={href} to={href} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 18px', background: 'var(--bg-card)',
            border: '1px solid var(--border-dim)', borderRadius: 13,
            fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)',
            textDecoration: 'none', transition: 'all 200ms',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = `${color}40`;
            el.style.color = 'var(--text-primary)';
            el.style.background = `${color}08`;
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = 'var(--border-dim)';
            el.style.color = 'var(--text-secondary)';
            el.style.background = 'var(--bg-card)';
          }}
          >
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 16, flexShrink: 0 }}>→</div>
            {label}
          </Link>
        ))}
      </div>

      {/* Recent tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent POs */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid var(--border-dim)' }}>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent POs</h2>
            <Link to="/vendor/pos" style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>View all →</Link>
          </div>
          <div style={{ padding: '8px 0' }}>
            {recentPOs.length > 0 ? recentPOs.map((po: any) => (
              <Link key={po.id} to={`/vendor/pos/${po.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 20px', borderBottom: '1px solid var(--border-dim)',
                transition: 'background 150ms', textDecoration: 'none',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 3px' }}>{po.poNumber}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{formatCurrency(po.totalAmount)}</p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                  background: `${POStatusColor[po.status] || '#94a3b8'}15`,
                  color: POStatusColor[po.status] || '#94a3b8',
                  border: `1px solid ${POStatusColor[po.status] || '#94a3b8'}30`,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>{po.status}</span>
              </Link>
            )) : (
              <p style={{ padding: '20px', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No recent purchase orders.</p>
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid var(--border-dim)' }}>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Invoices</h2>
            <Link to="/vendor/invoices" style={{ fontSize: 12, fontWeight: 600, color: '#06b6d4' }}>View all →</Link>
          </div>
          <div style={{ padding: '8px 0' }}>
            {recentInvoices.length > 0 ? recentInvoices.map((inv: any) => (
              <Link key={inv.id} to={`/vendor/invoices/${inv.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 20px', borderBottom: '1px solid var(--border-dim)',
                transition: 'background 150ms', textDecoration: 'none',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 3px' }}>{inv.invoiceNumber}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{formatCurrency(inv.amount)}</p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                  background: `${InvStatusColor[inv.status] || '#94a3b8'}15`,
                  color: InvStatusColor[inv.status] || '#94a3b8',
                  border: `1px solid ${InvStatusColor[inv.status] || '#94a3b8'}30`,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>{inv.status}</span>
              </Link>
            )) : (
              <p style={{ padding: '20px', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No recent invoices.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
