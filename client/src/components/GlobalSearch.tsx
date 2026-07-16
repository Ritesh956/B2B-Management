import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { searchService, type CategorizedSearchResponse } from '../services/search';

const getStatusBadgeColor = (status: string): React.CSSProperties => {
  const s = status.toUpperCase();
  if (['VERIFIED', 'APPROVED', 'PAID', 'ACTIVE'].includes(s)) {
    return { background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' };
  }
  if (['PENDING', 'PENDING_APPROVAL', 'SUBMITTED', 'MATCHED'].includes(s)) {
    return { background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' };
  }
  if (['REJECTED', 'MISMATCHED', 'EXPIRED', 'TERMINATED'].includes(s)) {
    return { background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' };
  }
  return { background: 'rgba(100,116,139,0.12)', color: 'var(--text-muted)', border: '1px solid var(--border-dim)' };
};

const VENDOR_ICON = (
  <svg style={{ width: 15, height: 15, color: '#06b6d4' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const PO_ICON = (
  <svg style={{ width: 15, height: 15, color: '#a78bfa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
  </svg>
);

const INVOICE_ICON = (
  <svg style={{ width: 15, height: 15, color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 018 0v2m-4-6a3 3 0 100-6 3 3 0 000 6M5 3h7l5 5v13a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" />
  </svg>
);

const CONTRACT_ICON = (
  <svg style={{ width: 15, height: 15, color: '#f59e0b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
  </svg>
);

const SECTION_COLORS: Record<string, string> = {
  Vendors: '#06b6d4',
  'Purchase Orders': '#a78bfa',
  Invoices: '#10b981',
  Contracts: '#f59e0b',
};

export default function GlobalSearch() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CategorizedSearchResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setResults(null);
        setIsOpen(false);
        return;
      }

      try {
        setLoading(true);
        const data = await searchService.globalSearch(trimmed);
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        console.error('Failed to run global search', err);
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const flatResults = useMemo(() => {
    if (!results) return [];
    const list: Array<{ id: string; label: string; href: string; type: string; status: string }> = [];
    results.vendors.forEach((v) => list.push({ id: v.id, label: v.companyName, href: `/vendors/${v.id}`, type: 'Vendor', status: v.status }));
    results.purchaseOrders.forEach((p) => list.push({ id: p.id, label: p.poNumber, href: `/pos/${p.id}`, type: 'PurchaseOrder', status: p.status }));
    results.invoices.forEach((i) => list.push({ id: i.id, label: i.invoiceNumber, href: `/invoices/${i.id}`, type: 'Invoice', status: i.status }));
    results.contracts.forEach((c) => list.push({ id: c.id, label: c.title, href: `/contracts/${c.id}`, type: 'Contract', status: c.status }));
    return list;
  }, [results]);

  const totalResultsCount = flatResults.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
    if (e.key === 'Enter') {
      if (flatResults.length > 0) {
        navigate(flatResults[0].href);
        setIsOpen(false);
        setQuery('');
      }
    }
  };

  const hasAnyResults = results && (
    results.vendors.length > 0 ||
    results.purchaseOrders.length > 0 ||
    results.invoices.length > 0 ||
    results.contracts.length > 0
  );

  const ResultRow = ({ icon, label, status, to }: { icon: React.ReactNode; label: string; status: string; to: string }) => (
    <Link
      to={to}
      onClick={() => { setIsOpen(false); setQuery(''); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        textDecoration: 'none',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--bg-hover)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = '')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {icon}
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </div>
      <span
        style={{
          flexShrink: 0,
          fontSize: 9,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 99,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginLeft: 8,
          ...getStatusBadgeColor(status),
        }}
      >
        {status}
      </span>
    </Link>
  );

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%', maxWidth: 560 }}>
      {/* Input wrapper */}
      <div className="surface" style={{ position: 'relative', borderRadius: 10, display: 'flex', alignItems: 'center' }}>
        {/* Search icon */}
        <svg
          style={{ position: 'absolute', left: 12, width: 15, height: 15, color: 'var(--text-muted)', pointerEvents: 'none', flexShrink: 0 }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.2-5.2m1.7-4.3a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
        </svg>

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results && hasAnyResults && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search vendors, POs, invoices, contracts..."
          data-global-search
          className="input-base"
          style={{
            paddingLeft: 36,
            paddingRight: 56,
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
          }}
        />

        {/* Keyboard shortcut badge */}
        <div style={{ position: 'absolute', right: 10, display: 'flex', alignItems: 'center' }}>
          <kbd
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              height: 20,
              padding: '0 6px',
              borderRadius: 5,
              border: '1px solid var(--border-dim)',
              background: 'var(--bg-hover)',
              fontFamily: 'monospace',
              fontSize: 10,
              fontWeight: 500,
              color: 'var(--text-muted)',
              letterSpacing: '0.01em',
            }}
          >
            <span style={{ fontSize: 11 }}>⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Results dropdown */}
      {isOpen && (
        <div
          className="card-sm"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 'calc(100% + 8px)',
            zIndex: 40,
            border: '1px solid var(--border-subtle)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Results header */}
          <div
            style={{
              padding: '8px 16px',
              borderBottom: '1px solid var(--border-dim)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, color: 'var(--text-muted)' }}>
              {loading ? 'Searching...' : 'Search Results'}
            </span>
            {!loading && totalResultsCount > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                {totalResultsCount} found
              </span>
            )}
          </div>

          {/* Results body */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border-subtle)', borderTopColor: '#6366f1', animation: 'spin 0.7s linear infinite' }} />
                Searching records...
              </div>
            ) : !hasAnyResults ? (
              <div style={{ padding: '24px 16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 500 }}>
                No results found for &ldquo;{query}&rdquo;
              </div>
            ) : (
              <>
                {results!.vendors?.length > 0 && (
                  <div>
                    <div style={{ padding: '8px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: SECTION_COLORS['Vendors'], background: 'var(--bg-hover)' }}>
                      Vendors
                    </div>
                    {results!.vendors.map((vendor) => (
                      <ResultRow key={vendor.id} icon={VENDOR_ICON} label={vendor.companyName} status={vendor.status} to={`/vendors/${vendor.id}`} />
                    ))}
                  </div>
                )}

                {results!.purchaseOrders?.length > 0 && (
                  <div>
                    <div style={{ padding: '8px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: SECTION_COLORS['Purchase Orders'], background: 'var(--bg-hover)' }}>
                      Purchase Orders
                    </div>
                    {results!.purchaseOrders.map((po) => (
                      <ResultRow key={po.id} icon={PO_ICON} label={po.poNumber} status={po.status} to={`/pos/${po.id}`} />
                    ))}
                  </div>
                )}

                {results!.invoices?.length > 0 && (
                  <div>
                    <div style={{ padding: '8px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: SECTION_COLORS['Invoices'], background: 'var(--bg-hover)' }}>
                      Invoices
                    </div>
                    {results!.invoices.map((invoice) => (
                      <ResultRow key={invoice.id} icon={INVOICE_ICON} label={invoice.invoiceNumber} status={invoice.status} to={`/invoices/${invoice.id}`} />
                    ))}
                  </div>
                )}

                {results!.contracts?.length > 0 && (
                  <div>
                    <div style={{ padding: '8px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: SECTION_COLORS['Contracts'], background: 'var(--bg-hover)' }}>
                      Contracts
                    </div>
                    {results!.contracts.map((contract) => (
                      <ResultRow key={contract.id} icon={CONTRACT_ICON} label={contract.title} status={contract.status} to={`/contracts/${contract.id}`} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}