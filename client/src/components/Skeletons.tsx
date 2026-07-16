import { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export { SkeletonTheme };

export function StatCardSkeleton() {
  return (
    <div className="stat-card animate-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="skeleton" style={{ width: 80, height: 12, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
      </div>
      <div className="skeleton" style={{ width: 110, height: 28, borderRadius: 6, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: 60, height: 10, borderRadius: 6 }} />
    </div>
  );
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  const widths = [120, 100, 140, 80, 70, 50];
  return (
    <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '14px 20px' }}>
          <div
            className="skeleton"
            style={{ width: widths[i % widths.length], height: 14, borderRadius: 6 }}
          />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="card animate-in" style={{ overflow: 'hidden', padding: 0 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} style={{ padding: '12px 20px', textAlign: 'left' }}>
                <div className="skeleton" style={{ width: 60, height: 10, borderRadius: 4 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '24px 32px' }}>
      {/* Header card */}
      <div className="card" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: 200, height: 24, borderRadius: 8, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 120, height: 13, borderRadius: 6 }} />
          </div>
          <div className="skeleton" style={{ width: 80, height: 26, borderRadius: 20 }} />
        </div>
      </div>

      {/* Body grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr' }}>
          {/* Main section */}
          <div className="card" style={{ padding: '24px 28px' }}>
            <div className="skeleton" style={{ width: 100, height: 11, borderRadius: 4, marginBottom: 20 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: 120 + i * 20, height: 14, borderRadius: 6 }} />
                  <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 6 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Side section */}
          <div className="card" style={{ padding: '24px 28px' }}>
            <div className="skeleton" style={{ width: 80, height: 11, borderRadius: 4, marginBottom: 18 }} />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div className="skeleton" style={{ width: 60, height: 10, borderRadius: 4, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: 130, height: 14, borderRadius: 6 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
