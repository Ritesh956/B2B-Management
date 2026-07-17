import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInvoicesQuery } from '../../hooks/useInvoicesQuery';
import EmptyState from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeletons';
import { formatCurrency } from '../../utils/currency';

export default function VendorInvoiceList() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useInvoicesQuery();
  const invoices = data?.invoices || [];
  const filteredInvoices = invoices.filter((inv) =>
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    inv.po.poNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-root animate-in">
      <div className="page-header">
        <h1 className="page-title">My Invoices</h1>
        <p className="page-subtitle">All invoices submitted against your purchase orders.</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', maxWidth: 340, flex: 1, minWidth: 220 }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--text-muted)', pointerEvents: 'none' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by invoice or PO number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base"
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>
        <Link to="/vendor/invoices/new" className="btn-primary" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>
          + Submit Invoice
        </Link>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : filteredInvoices.length === 0 ? (
        <EmptyState
          title="No invoices"
          description={invoices.length === 0 ? "You haven't submitted any invoices yet." : "No invoices match your search."}
        />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>PO #</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Submitted</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.invoiceNumber}</td>
                  <td>{inv.po.poNumber}</td>
                  <td>{formatCurrency(inv.amount)}</td>
                  <td>
                    <span className={`badge badge-${inv.status.toLowerCase()}`}>{inv.status}</span>
                  </td>
                  <td>{new Date(inv.submittedAt).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link to={`/vendor/invoices/${inv.id}`} style={{ color: '#10b981', fontWeight: 600, fontSize: 12.5 }}>View Details →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
