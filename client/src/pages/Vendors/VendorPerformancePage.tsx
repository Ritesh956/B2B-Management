import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import RoleGate from '../../components/RoleGate';
import { useAuthStore, Role } from '../../store/authStore';
import { vendorService, type VendorPerformanceRow } from '../../services/vendors';

const formatPercent = (value: number): string => `${value.toFixed(0)}%`;
type SortKey = 'companyName' | 'performanceScore' | 'totalPOs' | 'mismatchRate';

const scoreTone = (score: number | null): string => {
  const value = score ?? 0;
  if (value < 40) return 'from-rose-500 to-red-500';
  if (value <= 70) return 'from-amber-400 to-orange-400';
  return 'from-emerald-400 to-cyan-400';
};

const scoreLabelTone = (score: number | null): string => {
  const value = score ?? 0;
  if (value < 40) return 'text-rose-200 border-rose-500/30 bg-rose-500/10';
  if (value <= 70) return 'text-amber-200 border-amber-500/30 bg-amber-500/10';
  return 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10';
};

export default function VendorPerformancePage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === Role.ADMIN;

  const [vendors, setVendors] = useState<VendorPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('performanceScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftScore, setDraftScore] = useState('');

  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await vendorService.listPerformance();
      setVendors(data.vendors);
    } catch (err) {
      console.error('Failed to load vendor performance', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const sortedVendors = useMemo(() => {
    const list = [...vendors];
    list.sort((a, b) => {
      let left = 0;
      let right = 0;

      switch (sortKey) {
        case 'companyName':
          return sortDirection === 'asc'
            ? a.companyName.localeCompare(b.companyName)
            : b.companyName.localeCompare(a.companyName);
        case 'performanceScore':
          left = a.performanceScore ?? -1;
          right = b.performanceScore ?? -1;
          break;
        case 'totalPOs':
          left = a.totalPOs;
          right = b.totalPOs;
          break;
        case 'mismatchRate':
          left = a.mismatchRate;
          right = b.mismatchRate;
          break;
      }

      return sortDirection === 'asc' ? left - right : right - left;
    });
    return list;
  }, [vendors, sortKey, sortDirection]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection(key === 'companyName' ? 'asc' : 'desc');
  };

  const startEditing = (vendor: VendorPerformanceRow) => {
    setEditingId(vendor.id);
    setDraftScore(vendor.performanceScore?.toFixed(1) ?? '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftScore('');
  };

  const handleSaveScore = async (vendorId: string) => {
    const parsed = Number(draftScore);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      return;
    }

    try {
      setSavingId(vendorId);
      const updated = await vendorService.updatePerformanceScore(vendorId, parsed);
      setVendors((current) => current.map((vendor) => (vendor.id === vendorId ? { ...vendor, performanceScore: updated.vendor.performanceScore } : vendor)));
      cancelEditing();
    } catch (err) {
      console.error('Failed to update performance score', err);
    } finally {
      setSavingId(null);
    }
  };

  const scoreHeader = (label: string, key: SortKey) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300"
    >
      {label}
      <span className="text-[10px]">{sortKey === key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );

  const renderScoreCell = (vendor: VendorPerformanceRow) => {
    const score = vendor.performanceScore ?? 0;

    if (editingId === vendor.id && isAdmin) {
      return (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={draftScore}
            onChange={(e) => setDraftScore(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handleSaveScore(vendor.id);
              }
              if (e.key === 'Escape') {
                cancelEditing();
              }
            }}
            onBlur={() => {
              if (!savingId) {
                cancelEditing();
              }
            }}
            className="w-24 rounded-2xl border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
          />
          <button
            onClick={() => void handleSaveScore(vendor.id)}
            disabled={savingId === vendor.id}
            className="rounded-2xl border border-cyan-400/20 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {savingId === vendor.id ? 'Saving...' : 'Save'}
          </button>
        </div>
      );
    }

    if (!isAdmin) {
      return (
        <div className="w-full text-left">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
            <span className="text-slate-500">Score</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] ${scoreLabelTone(vendor.performanceScore)}`}>
              {Math.round(score)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full bg-linear-to-r ${scoreTone(vendor.performanceScore)} transition-all`}
              style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
            />
          </div>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => startEditing(vendor)}
        className="group w-full text-left"
      >
        <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
          <span>Click to edit</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] ${scoreLabelTone(vendor.performanceScore)}`}>
            {Math.round(score)}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-full rounded-full bg-linear-to-r ${scoreTone(vendor.performanceScore)} transition-all`}
            style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
          />
        </div>
      </button>
    );
  };

  return (
    <RoleGate roles={[Role.ADMIN, Role.PROCUREMENT, Role.MANAGER, Role.FINANCE]}>
      <div className="space-y-6 px-6 py-6 text-white md:px-8">
        <section className="rounded-4xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/10 backdrop-blur-xl md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link to="/vendors" className="text-sm font-medium text-cyan-300 hover:text-cyan-200">← Back to Vendors</Link>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Vendor Performance</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Manual score control plus computed operational metrics in a single review table.</p>
            </div>
            <button
              onClick={loadVendors}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Refresh
            </button>
          </div>
        </section>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d1117] shadow-lg shadow-black/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-slate-900/80">
                <th className="px-5 py-3.5 text-left">{scoreHeader('Vendor Name', 'companyName')}</th>
                <th className="px-5 py-3.5 text-left">{scoreHeader('Performance Score', 'performanceScore')}</th>
                <th className="px-5 py-3.5 text-left">{scoreHeader('Total POs', 'totalPOs')}</th>
                <th className="px-5 py-3.5 text-left">{scoreHeader('Invoice Mismatch Rate (%)', 'mismatchRate')}</th>
                <th className="px-5 py-3.5 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">Loading performance metrics...</td>
                </tr>
              ) : sortedVendors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">No vendors found.</td>
                </tr>
              ) : (
                sortedVendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-white/5 transition hover:bg-white/5">
                    <td className="px-5 py-4">
                      <div className="font-medium text-white">{vendor.companyName}</div>
                      <div className="text-xs text-slate-500">{vendor.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-5 py-4">{renderScoreCell(vendor)}</td>
                    <td className="px-5 py-4 text-slate-300">{vendor.totalPOs}</td>
                    <td className="px-5 py-4 text-slate-300">{formatPercent(vendor.mismatchRate)}</td>
                    <td className="px-5 py-4">
                      <Link to={`/vendors/${vendor.id}`} className="text-cyan-300 font-medium text-xs hover:text-cyan-200">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RoleGate>
  );
}
