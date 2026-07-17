import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import RoleGate from '../../components/RoleGate';
import { Role } from '../../store/authStore';
import { useAuthStore } from '../../store/authStore';
import SubmitInvoiceModal from './SubmitInvoiceModal';
import EmptyState from '../../components/EmptyState';
import { downloadBlob } from '../../utils/csv';
import { formatCurrency } from '../../utils/currency';
import { useInvoicesQuery } from '../../hooks/useInvoicesQuery';
import { TableSkeleton } from '../../components/Skeletons';
import CopyToClipboard from '../../components/CopyToClipboard';
import BulkActionBar, { BulkConfirmModal } from '../../components/BulkActionBar';
import { useRowSelection } from '../../hooks/useRowSelection';

import api from '../../services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/apiError';

type FilterValues = { statuses: string[]; vendorId: string; minAmount: string; maxAmount: string; fromDate: string; toDate: string; createdById: string; };

function paramsToFilters(params: URLSearchParams): FilterValues {
  return {
    statuses: params.get('status') ? params.get('status')!.split(',') : [],
    vendorId: params.get('vendorId') || '',
    minAmount: params.get('minAmount') || '',
    maxAmount: params.get('maxAmount') || '',
    fromDate: params.get('fromDate') || '',
    toDate: params.get('toDate') || '',
    createdById: '',
  };
}

export default function InvoiceList() {
  const userRole = useAuthStore((s) => s.user?.role);
  const [searchParams] = useSearchParams();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [confirmBulkApprove, setConfirmBulkApprove] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const filters = paramsToFilters(searchParams);

  const { data, isLoading, refetch } = useInvoicesQuery();
  const allInvoices = data?.invoices ?? [];

  const invoices = allInvoices.filter((inv) => {
    if (filters.statuses.length > 0 && !filters.statuses.includes(inv.status)) return false;
    if (filters.vendorId && inv.vendorId !== filters.vendorId) return false;
    if (filters.minAmount && inv.amount < parseFloat(filters.minAmount)) return false;
    if (filters.maxAmount && inv.amount > parseFloat(filters.maxAmount)) return false;
    if (filters.fromDate && new Date(inv.submittedAt) < new Date(filters.fromDate)) return false;
    if (filters.toDate && new Date(inv.submittedAt) > new Date(filters.toDate)) return false;
    return true;
  });

  const {
    selectedIds, toggleRow, toggleAll, clearSelection,
    isAllSelected, isPartiallySelected, selectedCount, selectedArray,
  } = useRowSelection(invoices);

  const submittedCount = invoices.filter((inv) => inv.status === 'SUBMITTED').length;
  const approvedCount = invoices.filter((inv) => inv.status === 'APPROVED').length;
  const paidCount = invoices.filter((inv) => inv.status === 'PAID').length;

  const exportCsv = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/invoices/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to export CSV');
      const blob = await res.blob();
      downloadBlob(blob, 'invoices.csv');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const executeBulkApprove = async () => {
    setBulkLoading(true);
    try {
      const { data: result } = await api.patch('/invoices/bulk', { ids: selectedArray });
      const skippedCount = result.skipped?.length ?? 0;
      if (skippedCount > 0) {
        toast.success(`${result.updated} invoice(s) approved`);
        toast.error(
          `${skippedCount} skipped — only MATCHED invoices can be bulk approved (use force-approve on individual mismatched invoices instead)`,
          { duration: 6000 }
        );
      } else {
        toast.success(`${result.updated} invoice(s) approved successfully`);
      }
      clearSelection();
      await refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to approve invoices'));
    } finally {
      setBulkLoading(false);
      setConfirmBulkApprove(false);
    }
  };

  return (
    <div className="page-root">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h1 className="page-title">Invoices</h1>
            <p className="page-subtitle">Keep track of invoice status, approvals, and matching against purchase orders.</p>
          </div>

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', minWidth: '300px' }}>
            <div className="stat-card">
              <p className="stat-label">Total</p>
              <p className="stat-value">{invoices.length}</p>
            </div>
            <div className="stat-card" style={{ borderColor: 'rgba(6,182,212,0.25)', background: 'rgba(6,182,212,0.08)' }}>
              <p className="stat-label" style={{ color: '#06b6d4' }}>Submitted</p>
              <p className="stat-value">{submittedCount}</p>
            </div>
            <div className="stat-card" style={{ borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.08)' }}>
              <p className="stat-label" style={{ color: '#10b981' }}>Approved/Paid</p>
              <p className="stat-value">{approvedCount + paidCount}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <button onClick={exportCsv} className="btn-secondary">
            Export CSV
          </button>
              <button className="btn-secondary">
                <svg style={{ width: '14px', height: '14px', marginRight: '8px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                Filters
              </button>
          <RoleGate roles={[Role.VENDOR]} fallback={null}>
            <button onClick={() => setShowSubmitModal(true)} className="btn-primary">
              Submit Invoice
            </button>
          </RoleGate>
        </div>
      </div>

      {/* Active filter pills */}


      {/* Table */}
      <div>
        {isLoading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : invoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="Submit your first invoice against an approved purchase order to start the finance flow."
            actionLabel={userRole === Role.VENDOR ? 'Submit your first invoice' : undefined}
            onAction={userRole === Role.VENDOR ? () => setShowSubmitModal(true) : undefined}
          />
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '44px' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => { if (el) el.indeterminate = isPartiallySelected; }}
                      onChange={toggleAll}
                      style={{ width: '16px', height: '16px', accentColor: '#06b6d4', cursor: 'pointer' }}
                    />
                  </th>
                  {['Invoice #', 'PO #', 'Vendor', 'Amount', 'Status', 'Submitted', ''].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    style={selectedIds.has(inv.id) ? { background: 'rgba(6,182,212,0.05)' } : {}}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(inv.id)}
                        onChange={() => toggleRow(inv.id)}
                        style={{ width: '16px', height: '16px', accentColor: '#06b6d4', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {inv.invoiceNumber}
                        <CopyToClipboard text={inv.invoiceNumber} label="Copy Invoice Number" />
                      </div>
                    </td>
                    <td>{inv.po.poNumber}</td>
                    <td>{inv.vendor.companyName}</td>
                    <td>{formatCurrency(inv.amount)}</td>
                    <td>
                      <span className={`badge badge-${inv.status.toLowerCase()}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>{new Date(inv.submittedAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <Link to={`/invoices/${inv.id}`} style={{ color: '#06b6d4', fontWeight: 500, fontSize: '12px' }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk action bar — Finance only */}
      <RoleGate roles={[Role.FINANCE]}>
        <BulkActionBar
          selectedCount={selectedCount}
          onClearSelection={clearSelection}
          actions={[
            { label: 'Approve All', variant: 'primary', onClick: () => setConfirmBulkApprove(true) },
          ]}
        />
      </RoleGate>

      {confirmBulkApprove && (
        <BulkConfirmModal
          title={`Approve ${selectedCount} invoice${selectedCount > 1 ? 's' : ''}?`}
          message={`Only MATCHED invoices will be approved. Are you sure you want to bulk approve ${selectedCount} invoice${selectedCount > 1 ? 's' : ''}?`}
          confirmLabel="Approve All"
          variant="primary"
          loading={bulkLoading}
          onConfirm={executeBulkApprove}
          onCancel={() => setConfirmBulkApprove(false)}
        />
      )}



      {showSubmitModal && (
        <SubmitInvoiceModal
          onClose={() => setShowSubmitModal(false)}
          onSubmitted={refetch}
        />
      )}
    </div>
  );
}
