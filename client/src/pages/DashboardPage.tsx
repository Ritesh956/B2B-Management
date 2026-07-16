import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useAuthStore } from '../store/authStore';
import { dashboardService, type DashboardResponse } from '../services/dashboard';
import { ShoppingCart, UserPlus, FileText } from 'lucide-react';

const PIE_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const formatRupees = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

const actionColor = (action: string) => {
  const a = action.toUpperCase();
  if (a.includes('CREATE') || a.includes('SUBMIT')) return '#34d399';
  if (a.includes('APPROVE') || a.includes('VERIFY')) return '#60a5fa';
  if (a.includes('REJECT') || a.includes('TERMINATE')) return '#f87171';
  if (a.includes('UPDATE') || a.includes('STATUS')) return '#fbbf24';
  if (a.includes('PAY')) return '#22d3ee';
  return 'var(--text-secondary)';
};

function StatCard({ label, value, accent, icon }: { label: string; value: number; accent: string; icon: React.ReactNode }) {
  return (
    <div className="stat-card animate-in" style={{ borderLeftColor: accent, borderLeftWidth: 3, background: 'var(--bg-card)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle, ${accent}18, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <p className="stat-label">{label}</p>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${accent}18`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
          {icon}
        </div>
      </div>
      <p className="stat-value" style={{ color: accent === '#6366f1' ? '#a5b4fc' : accent === '#06b6d4' ? '#22d3ee' : accent === '#10b981' ? '#34d399' : '#fbbf24' }}>
        {value}
      </p>
    </div>
  );
}

const CHART_STYLE = { fontSize: 12, fill: 'var(--text-muted)' };
const CHART_GRID = { stroke: 'rgba(255,255,255,0.05)', strokeDasharray: '4 4' };
const TOOLTIP_STYLE = { background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 13 };

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [statsResponse, topVendorsResponse, oldestPendingResponse] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getTopVendors(),
          dashboardService.getOldestPendingPO(),
        ]);
        setData({ ...statsResponse, topVendorsByPOValue: topVendorsResponse.vendors, oldestPendingPO: oldestPendingResponse.oldestPendingPO });
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statCards = useMemo(() => [
    { label: 'Active Vendors',        value: data?.stats.totalActiveVendors ?? 0,       accent: '#6366f1', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { label: 'Awaiting Your Approval', value: data?.stats.posPendingMyApproval ?? 0,    accent: '#f59e0b', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { label: 'Invoices Under Review',  value: data?.stats.invoicesPendingReview ?? 0,   accent: '#06b6d4', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
    { label: 'Contracts Expiring',     value: data?.stats.contractsExpiringThisMonth ?? 0, accent: '#10b981', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"/><polygon points="18 2 22 6 12 16 8 16 8 12 18 2"/></svg> },
  ], [data]);

  return (
    <div className="page-root animate-in">
      {/* ─── Hero ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(6,182,212,0.05) 100%)',
        border: '1px solid var(--border-dim)',
        borderRadius: 18,
        padding: '28px 32px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 999, fontSize: 11, fontWeight: 600, color: '#a5b4fc', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: 'pulse 2s ease-in-out infinite' }} />
              Live Overview
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
              {greeting}, <span style={{ background: 'linear-gradient(135deg, #a5b4fc, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.name?.split(' ')[0]}</span>
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
              Your operational command center — vendors, POs, invoices &amp; contracts.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Status', value: 'Operational' },
              { label: 'Role', value: user?.role ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 11, padding: '10px 16px', minWidth: 100 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Stat Cards ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="stat-card">
                <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 36, width: '40%' }} />
              </div>
            ))
          : statCards.map((card) => <StatCard key={card.label} {...card} />)
        }
      </div>

      {/* ─── Pending PO Alert ──────────────────────────────────── */}
      {data?.oldestPendingPO && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 14, padding: '16px 20px', marginBottom: 24,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Oldest Pending Approval</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{data.oldestPendingPO.poNumber} · {data.oldestPendingPO.vendorName}</div>
            <div style={{ fontSize: 12.5, color: '#fbbf24', opacity: 0.8, marginTop: 2 }}>Awaiting for {data.oldestPendingPO.daysWaiting} day{data.oldestPendingPO.daysWaiting === 1 ? '' : 's'}</div>
          </div>
          <Link to="/pos" style={{ fontSize: 12.5, fontWeight: 600, color: '#fbbf24', padding: '7px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, whiteSpace: 'nowrap' }}>
            Review →
          </Link>
        </div>
      )}

      {/* ─── Quick Actions ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Create Purchase Order', href: '/pos', icon: <ShoppingCart size={18} strokeWidth={2.5} />,  color: '#6366f1' },
          { label: 'Add New Vendor',        href: '/vendors', icon: <UserPlus size={18} strokeWidth={2.5} />, color: '#06b6d4' },
          { label: 'Upload Contract',       href: '/contracts', icon: <FileText size={18} strokeWidth={2.5} />, color: '#10b981' },
        ].map(({ label, href, icon, color }) => (
          <Link key={href} to={href} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 18px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-dim)',
            borderRadius: 13,
            fontSize: 13.5, fontWeight: 600,
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            transition: 'all 200ms',
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
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
              {icon}
            </div>
            {label}
          </Link>
        ))}
      </div>

      {/* ─── Charts Row ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Bar chart */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>PO Volume · Last 6 Months</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={data?.charts.poVolumeByMonth ?? []} barSize={28}>
                <CartesianGrid {...CHART_GRID} vertical={false} />
                <XAxis dataKey="month" tick={CHART_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={CHART_STYLE} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Invoice Breakdown</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie data={data?.charts.invoiceStatusBreakdown ?? []} dataKey="count" nameKey="status" cx="50%" cy="45%" outerRadius={80} strokeWidth={0}>
                  {(data?.charts.invoiceStatusBreakdown ?? []).map((entry, index) => (
                    <Cell key={entry.status} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} formatter={(val) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── Spend Chart ───────────────────────────────────────── */}
      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total PO Spend (₹) · Monthly</h3>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <LineChart data={data?.stats.spendByMonth ?? []}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="month" tick={CHART_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={CHART_STYLE} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => formatRupees(Number(v))} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatRupees(Number(v ?? 0))} />
              <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2.5} dot={{ fill: '#06b6d4', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Top Vendors table ─────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border-dim)' }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top 5 Vendors by PO Value</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Vendor</th>
              <th style={{ textAlign: 'right' }}>Total Spend</th>
              <th style={{ textAlign: 'right' }}>POs</th>
            </tr>
          </thead>
          <tbody>
            {(data?.topVendorsByPOValue ?? []).map((v, i) => (
              <tr key={v.vendorId}>
                <td><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>#{i + 1}</span></td>
                <td><span className="cell-primary">{v.vendorName}</span></td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: '#34d399' }}>{formatRupees(v.totalSpend)}</td>
                <td style={{ textAlign: 'right' }}>{v.poCount}</td>
              </tr>
            ))}
            {!loading && (data?.topVendorsByPOValue.length ?? 0) === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 13 }}>No PO spend data yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Recent Activity ───────────────────────────────────── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border-dim)' }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Activity</h3>
        </div>
        <div style={{ padding: '8px 0' }}>
          {(data?.recentActivity ?? []).map((item, idx) => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '11px 20px',
              borderBottom: idx < (data?.recentActivity.length ?? 0) - 1 ? '1px solid var(--border-dim)' : 'none',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: actionColor(item.action), flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.user?.name || 'System'}</span>
                {' '}
                <span style={{ color: actionColor(item.action) }}>{item.action}</span>
                {' '}
                {item.entity}
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(item.timestamp).toLocaleString()}</span>
            </div>
          ))}
          {!loading && (data?.recentActivity.length ?? 0) === 0 && (
            <p style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No recent activity.</p>
          )}
        </div>
      </div>
    </div>
  );
}
