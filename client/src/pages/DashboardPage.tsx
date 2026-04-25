import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuthStore } from '../store/authStore';
import { dashboardService, type DashboardResponse } from '../services/dashboard';

const PIE_COLORS = ['#38bdf8', '#22c55e', '#f59e0b', '#a78bfa', '#ef4444'];

const formatRupees = (value: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const actionColor = (action: string): string => {
  const normalized = action.toUpperCase();
  if (normalized.includes('CREATE') || normalized.includes('SUBMIT')) return 'text-emerald-300';
  if (normalized.includes('APPROVE') || normalized.includes('VERIFY')) return 'text-sky-300';
  if (normalized.includes('REJECT') || normalized.includes('TERMINATE')) return 'text-rose-300';
  if (normalized.includes('UPDATE') || normalized.includes('STATUS')) return 'text-amber-300';
  if (normalized.includes('PAY')) return 'text-cyan-300';
  return 'text-slate-300';
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await dashboardService.getStats();
        setData(response);
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const statCards = useMemo(
    () => [
      {
        label: 'Total Active Vendors',
        value: data?.stats.totalActiveVendors ?? 0,
        color: 'from-violet-500/20 to-fuchsia-500/5 border-violet-400/20',
      },
      {
        label: 'POs Pending My Approval',
        value: data?.stats.posPendingMyApproval ?? 0,
        color: 'from-amber-500/20 to-orange-500/5 border-amber-400/20',
      },
      {
        label: 'Invoices Pending Review',
        value: data?.stats.invoicesPendingReview ?? 0,
        color: 'from-cyan-500/20 to-sky-500/5 border-cyan-400/20',
      },
      {
        label: 'Contracts Expiring This Month',
        value: data?.stats.contractsExpiringThisMonth ?? 0,
        color: 'from-emerald-500/20 to-green-500/5 border-emerald-400/20',
      },
    ],
    [data]
  );

  return (
    <div className="p-6 md:p-8 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Good day, {user?.name?.split(' ')[0]}</h1>
        <p className="mt-1 text-slate-400">Operational snapshot for your vendor platform.</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const content = (
            <>
              <p className="text-xs uppercase tracking-wide text-slate-300">{card.label}</p>
              <p className="mt-2 text-4xl font-bold">{loading ? '...' : card.value}</p>
            </>
          );

          return card.label === 'Contracts Expiring This Month' ? (
            <Link
              key={card.label}
              to="/contracts?expiringSoon=1"
              className={`rounded-2xl border bg-linear-to-br p-5 transition hover:-translate-y-0.5 hover:border-amber-300/40 ${card.color}`}
            >
              {content}
            </Link>
          ) : (
            <div key={card.label} className={`rounded-2xl border bg-linear-to-br p-5 ${card.color}`}>
              {content}
            </div>
          );
        })}
      </div>

      {data?.oldestPendingPO && (
        <div className="mb-8 rounded-2xl border border-amber-400/30 bg-linear-to-br from-amber-500/20 to-orange-500/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Oldest Pending PO</p>
          <p className="mt-1 text-lg font-semibold text-white">{data.oldestPendingPO.poNumber}</p>
          <p className="mt-1 text-sm text-amber-100/90">Waiting for approval for {data.oldestPendingPO.daysWaiting} day{data.oldestPendingPO.daysWaiting === 1 ? '' : 's'}.</p>
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link to="/pos" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800">
          New PO
        </Link>
        <Link to="/vendors" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800">
          Add Vendor
        </Link>
        <Link to="/contracts" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800">
          Upload Contract
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-4 xl:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">PO Volume by Month (Last 6 Months)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts.poVolumeByMonth ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#818cf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Invoice Status Breakdown</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.charts.invoiceStatusBreakdown ?? []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {(data?.charts.invoiceStatusBreakdown ?? []).map((entry, index) => (
                    <Cell key={entry.status} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-white/10 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Total PO Spend by Month (Last 6 Months)</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.charts.poSpendByMonth ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(value) => formatRupees(Number(value))} />
              <Tooltip formatter={(value) => formatRupees(Number(value ?? 0))} />
              <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-white/10 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Top 5 Vendors by PO Value</h2>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/80">
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Vendor</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total Spend</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">PO Count</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topVendorsByPOValue ?? []).map((vendor) => (
                <tr key={vendor.vendorId} className="border-b border-white/5 last:border-b-0 hover:bg-white/5">
                  <td className="px-4 py-3 text-slate-200">{vendor.vendorName}</td>
                  <td className="px-4 py-3 text-right text-slate-100">{formatRupees(vendor.totalSpend)}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{vendor.poCount}</td>
                </tr>
              ))}
              {!loading && (data?.topVendorsByPOValue.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">No PO spend data found for the last 6 months.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Recent Activity</h2>
        <div className="space-y-3">
          {(data?.recentActivity ?? []).map((item) => (
            <div key={item.id} className="rounded-lg border border-white/5 bg-slate-950 px-4 py-3">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-300">
                  <span className="font-medium text-white">{item.user?.name || 'System'}</span>{' '}
                  <span className={actionColor(item.action)}>{item.action}</span>{' '}
                  {item.entity} ({item.entityId.slice(0, 8)}...)
                </p>
                <p className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {!loading && (data?.recentActivity.length ?? 0) === 0 && <p className="text-sm text-slate-400">No recent activity found.</p>}
        </div>
      </div>
    </div>
  );
}
