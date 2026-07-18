import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import RoleGate from '../../components/RoleGate';
import { useAuthStore, Role } from '../../store/authStore';
import { vendorService, type VendorPerformanceRow } from '../../services/vendors';

const formatPercent = (value: number): string => `${value.toFixed(0)}%`;
type SortKey = 'companyName' | 'performanceScore' | 'totalPOs' | 'mismatchRate';

// performanceScore is on a 0–5 scale everywhere in the product (see VendorDetail,
// seed data). Thresholds below are the 5-point equivalents of "under 40%" / "under 70%".
const MAX_SCORE = 5;

const scoreTier = (score: number | null): { bar: string; badgeColor: string; badgeBg: string; badgeBorder: string } => {
  const value = score ?? 0;
  if (value < 2) return { bar: 'linear-gradient(to right, #f43f5e, #ef4444)', badgeColor: '#fda4af', badgeBg: 'rgba(244,63,94,0.1)', badgeBorder: 'rgba(244,63,94,0.3)' };
  if (value <= 3.5) return { bar: 'linear-gradient(to right, #fbbf24, #f59e0b)', badgeColor: '#fcd34d', badgeBg: 'rgba(245,158,11,0.1)', badgeBorder: 'rgba(245,158,11,0.3)' };
  return { bar: 'linear-gradient(to right, #34d399, #06b6d4)', badgeColor: '#6ee7b7', badgeBg: 'rgba(16,185,129,0.1)', badgeBorder: 'rgba(16,185,129,0.3)' };
};

const scoreBarWidth = (score: number): number => Math.max(0, Math.min(100, (score / MAX_SCORE) * 100));

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
    if (Number.isNaN(parsed) || parsed < 0 || parsed > MAX_SCORE) {
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
    <th
      onClick={() => toggleSort(key)}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      {label}
      {sortKey === key ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );

  const renderScoreCell = (vendor: VendorPerformanceRow) => {
    const score = vendor.performanceScore ?? 0;
    const tier = scoreTier(vendor.performanceScore);

    if (editingId === vendor.id && isAdmin) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            autoFocus
            type="number"
            min={0}
            max={MAX_SCORE}
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
            className="input-base"
            style={{ width: 96 }}
          />
          <button
            onClick={() => void handleSaveScore(vendor.id)}
            disabled={savingId === vendor.id}
            className="btn-secondary"
            style={{ padding: '8px 12px', fontSize: 12.5 }}
          >
            {savingId === vendor.id ? 'Saving...' : 'Save'}
          </button>
        </div>
      );
    }

    const scoreBar = (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 11.5, color: 'var(--text-muted)' }}>
          <span>{isAdmin ? 'Click to edit' : 'Score'}</span>
          <span style={{
            borderRadius: 999, border: `1px solid ${tier.badgeBorder}`, background: tier.badgeBg,
            padding: '2px 8px', fontSize: 10, fontWeight: 700, color: tier.badgeColor,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {score.toFixed(1)} / {MAX_SCORE}
          </span>
        </div>
        <div style={{ marginTop: 8, height: 6, borderRadius: 999, overflow: 'hidden', background: 'var(--border-dim)' }}>
          <div style={{ height: '100%', borderRadius: 999, background: tier.bar, width: `${scoreBarWidth(score)}%`, transition: 'width 300ms ease' }} />
        </div>
      </div>
    );

    if (!isAdmin) {
      return <div style={{ width: '100%', textAlign: 'left' }}>{scoreBar}</div>;
    }

    return (
      <button
        type="button"
        onClick={() => startEditing(vendor)}
        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        {scoreBar}
      </button>
    );
  };

  return (
    <RoleGate roles={[Role.ADMIN, Role.PROCUREMENT, Role.MANAGER, Role.FINANCE]}>
      <div className="page-root animate-in">
        <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <Link to="/vendors" className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12, borderRadius: 20 }}>
              ← Back to Vendors
            </Link>
            <h1 className="page-title">Vendor Performance</h1>
            <p className="page-subtitle">Manual score control plus computed operational metrics in a single review table.</p>
          </div>
          <button onClick={loadVendors} className="btn-secondary">
            Refresh
          </button>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                {scoreHeader('Vendor Name', 'companyName')}
                {scoreHeader('Performance Score', 'performanceScore')}
                {scoreHeader('Total POs', 'totalPOs')}
                {scoreHeader('Invoice Mismatch Rate (%)', 'mismatchRate')}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading performance metrics...</td>
                </tr>
              ) : sortedVendors.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>No vendors found.</td>
                </tr>
              ) : (
                sortedVendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      <div className="cell-primary">{vendor.companyName}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{vendor.id.slice(0, 8)}</div>
                    </td>
                    <td style={{ minWidth: 200 }}>{renderScoreCell(vendor)}</td>
                    <td>{vendor.totalPOs}</td>
                    <td>{formatPercent(vendor.mismatchRate)}</td>
                    <td>
                      <Link to={`/vendors/${vendor.id}`} style={{ color: '#22d3ee', fontWeight: 500, fontSize: 12.5 }}>
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
