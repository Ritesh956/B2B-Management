import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import RoleGate from '../../components/RoleGate';
import { Role } from '../../store/authStore';
import { vendorService, type VendorPerformanceRow } from '../../services/vendors';

const formatPercent = (value: number): string => `${value.toFixed(0)}%`;
type SortKey = 'companyName' | 'performanceScore' | 'onTimeDeliveryPct' | 'invoiceMismatchRate';

export default function VendorPerformancePage() {
  const [vendors, setVendors] = useState<VendorPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('performanceScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [draftScores, setDraftScores] = useState<Record<string, string>>({});

  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await vendorService.listPerformance();
      setVendors(data.vendors);
      setDraftScores(
        Object.fromEntries(
          data.vendors.map((vendor) => [vendor.id, vendor.performanceScore?.toFixed(1) ?? ''])
        )
      );
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
        case 'onTimeDeliveryPct':
          left = a.onTimeDeliveryPct;
          right = b.onTimeDeliveryPct;
          break;
        case 'invoiceMismatchRate':
          left = a.invoiceMismatchRate;
          right = b.invoiceMismatchRate;
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

  const handleSaveScore = async (vendorId: string) => {
    const raw = draftScores[vendorId];
    const parsed = Number(raw);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      return;
    }

    try {
      setSavingId(vendorId);
      const updated = await vendorService.updatePerformanceScore(vendorId, parsed);
      setVendors((current) => current.map((vendor) => (vendor.id === vendorId ? { ...vendor, performanceScore: updated.vendor.performanceScore } : vendor)));
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

  return (
    <RoleGate roles={[Role.ADMIN]}>
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="border-b border-white/5 px-8 py-5 flex items-center justify-between">
          <div>
            <Link to="/vendors" className="text-sm text-slate-400 hover:text-white">← Back to Vendors</Link>
            <h1 className="mt-2 text-2xl font-bold text-white">Vendor Performance</h1>
            <p className="text-slate-400 text-sm mt-0.5">Manual score control plus computed operational metrics.</p>
          </div>
          <button
            onClick={loadVendors}
            className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            Refresh
          </button>
        </div>

        <div className="px-8 py-6">
          <div className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/80">
                  <th className="px-5 py-3.5 text-left">{scoreHeader('Vendor', 'companyName')}</th>
                  <th className="px-5 py-3.5 text-left">{scoreHeader('Manual Score', 'performanceScore')}</th>
                  <th className="px-5 py-3.5 text-left">{scoreHeader('On-time Delivery %', 'onTimeDeliveryPct')}</th>
                  <th className="px-5 py-3.5 text-left">{scoreHeader('Invoice Mismatch Rate', 'invoiceMismatchRate')}</th>
                  <th className="px-5 py-3.5 text-left">POs</th>
                  <th className="px-5 py-3.5 text-left">Invoices</th>
                  <th className="px-5 py-3.5 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">Loading performance metrics...</td>
                  </tr>
                ) : sortedVendors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">No vendors found.</td>
                  </tr>
                ) : (
                  sortedVendors.map((vendor) => {
                    const scoreValue = draftScores[vendor.id] ?? '';
                    const isDirty = scoreValue !== (vendor.performanceScore?.toFixed(1) ?? '');
                    return (
                      <tr key={vendor.id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="px-5 py-4">
                          <div className="font-medium text-white">{vendor.companyName}</div>
                          <div className="text-xs text-slate-500">{vendor.email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.1"
                              value={scoreValue}
                              onChange={(e) => setDraftScores((current) => ({ ...current, [vendor.id]: e.target.value }))}
                              className="w-24 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                            <span className="text-xs text-slate-500">/100</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-300">{formatPercent(vendor.onTimeDeliveryPct)}</td>
                        <td className="px-5 py-4 text-slate-300">{formatPercent(vendor.invoiceMismatchRate)}</td>
                        <td className="px-5 py-4 text-slate-300">{vendor.approvedPOCount}</td>
                        <td className="px-5 py-4 text-slate-300">{vendor.invoiceCount}</td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => handleSaveScore(vendor.id)}
                            disabled={savingId === vendor.id || !isDirty}
                            className="rounded-lg border border-violet-400/20 bg-violet-500/15 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {savingId === vendor.id ? 'Saving...' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}
