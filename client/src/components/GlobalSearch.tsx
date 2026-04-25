import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { searchService, type GlobalSearchResult } from '../services/search';

const groupLabel: Record<GlobalSearchResult['type'], string> = {
  Vendor: 'Vendor',
  PurchaseOrder: 'Purchase Order',
  Invoice: 'Invoice',
};

export default function GlobalSearch() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      try {
        setLoading(true);
        const data = await searchService.globalSearch(trimmed);
        setResults(data.results);
        setIsOpen(true);
      } catch (err) {
        console.error('Failed to run global search', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

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

  const groupedResults = useMemo(() => results, [results]);

  return (
    <div ref={rootRef} className="relative w-full max-w-xl">
      <div className="relative">
        <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.2-5.2m1.7-4.3a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search vendors, POs, invoices"
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="border-b border-white/10 px-4 py-2 text-xs uppercase tracking-wider text-slate-500">
            {loading ? 'Searching...' : 'Results'}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-4 text-sm text-slate-400">Searching across vendors, POs and invoices...</div>
            ) : groupedResults.length === 0 ? (
              <div className="px-4 py-4 text-sm text-slate-400">No matches found.</div>
            ) : (
              groupedResults.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className="block border-b border-white/5 px-4 py-3 hover:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{item.subtitle}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-300">
                      {groupLabel[item.type]}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}