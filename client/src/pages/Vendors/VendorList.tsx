import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Vendor } from '../../services/vendors';
import AddVendorModal from './AddVendorModal';
import RoleGate from '../../components/RoleGate';
import { Role } from '../../store/authStore';
import { useAuthStore } from '../../store/authStore';
import EmptyState from '../../components/EmptyState';
import { downloadBlob } from '../../utils/csv';
import { useVendorsQuery } from '../../hooks/useVendorsQuery';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table';
import CopyToClipboard from '../../components/CopyToClipboard';
import BulkActionBar, { BulkConfirmModal } from '../../components/BulkActionBar';
import { useRowSelection } from '../../hooks/useRowSelection';
import { TableSkeleton } from '../../components/Skeletons';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/apiError';

type ConfirmAction = { type: 'verify' | 'reject'; count: number } | null;

export default function VendorList() {
  const userRole = useAuthStore((s) => s.user?.role);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showModal, setShowModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const limit = 10;
  const { data, isLoading, refetch } = useVendorsQuery({ search, status: statusFilter || undefined, page, limit });

  const vendors = data?.vendors ?? [];
  const total = data?.total ?? 0;
  const verifiedCount = vendors.filter((v) => v.status === 'VERIFIED').length;
  const pendingCount = vendors.filter((v) => v.status === 'PENDING').length;
  const rejectedCount = vendors.filter((v) => v.status === 'REJECTED').length;

  const {
    selectedIds, toggleRow, toggleAll, clearSelection,
    isAllSelected, isPartiallySelected, selectedCount, selectedArray,
  } = useRowSelection(vendors);

  const columns = useMemo<ColumnDef<Vendor>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => { if (el) el.indeterminate = isPartiallySelected; }}
            onChange={toggleAll}
            style={{ accentColor: 'var(--accent-primary)', width: 16, height: 16, cursor: 'pointer' }}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => toggleRow(row.original.id)}
            style={{ accentColor: 'var(--accent-primary)', width: 16, height: 16, cursor: 'pointer' }}
          />
        ),
        enableSorting: false,
      },
      { accessorKey: 'companyName', header: 'Company' },
      { accessorKey: 'contactName', header: 'Contact' },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {row.original.email}
            <CopyToClipboard text={row.original.email} label="Copy Vendor Email" />
          </div>
        ),
      },
      { accessorKey: 'phone', header: 'Phone' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const s = row.original.status.toLowerCase();
          return <span className={`badge badge-${s}`}>{row.original.status}</span>;
        },
      },
      {
        accessorKey: 'performanceScore',
        header: 'Score',
        cell: ({ getValue }) => {
          const score = getValue<number | null>();
          return score?.toFixed(1) ?? '—';
        },
      },
      {
        id: 'action',
        header: '',
        cell: ({ row }) => (
          <Link
            to={`/vendors/${row.original.id}`}
            style={{ color: 'var(--accent-primary)', fontWeight: 500, fontSize: 13 }}
          >
            View →
          </Link>
        ),
      },
    ],
    [isAllSelected, isPartiallySelected, selectedIds, toggleAll, toggleRow]
  );

  const table = useReactTable({
    data: vendors,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalPages = Math.ceil(total / limit);

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/vendors/export?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = res.data;
      downloadBlob(blob, 'vendors.csv');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export CSV');
    }
  };

  const exportSelected = async () => {
    try {
      const res = await api.post('/vendors/bulk-export', { ids: selectedArray }, {
        responseType: 'blob',
      });
      const blob = res.data;
      downloadBlob(blob, 'selected-vendors.csv');
    } catch {
      toast.error('Failed to export selected vendors');
    }
  };

  const executeBulkAction = async (action: 'verify' | 'reject') => {
    setBulkLoading(true);
    try {
      await api.patch('/vendors/bulk', { ids: selectedArray, action });
      toast.success(`${selectedCount} vendor(s) ${action === 'verify' ? 'verified' : 'rejected'} successfully`);
      clearSelection();
      await refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to ${action} vendors`));
    } finally {
      setBulkLoading(false);
      setConfirmAction(null);
    }
  };

  return (
    <>
      <div className="page-root animate-in">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Link
            to="/dashboard"
            className="btn-ghost"
            style={{ fontSize: 12, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12, borderRadius: 20 }}
          >
            ← Dashboard
          </Link>
          <h1 className="page-title">Vendors</h1>
          <p className="page-subtitle">Track onboarding, contact details, and supplier performance in one searchable list.</p>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1 }}>
          <div className="stat-card" style={{ flex: 1, minWidth: 100 }}>
            <div className="stat-value">{total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card" style={{ flex: 1, minWidth: 100, borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.07)' }}>
            <div className="stat-value" style={{ color: '#10b981' }}>{verifiedCount}</div>
            <div className="stat-label">Verified</div>
          </div>
          <div className="stat-card" style={{ flex: 1, minWidth: 100, borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.07)' }}>
            <div className="stat-value" style={{ color: '#f59e0b' }}>{pendingCount}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card" style={{ flex: 1, minWidth: 100, borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)' }}>
            <div className="stat-value" style={{ color: '#ef4444' }}>{rejectedCount}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 24 }}>
        {/* Search */}
        <div style={{ position: 'relative', width: 240 }}>
          <svg
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)', pointerEvents: 'none' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search vendors…"
            className="input-base"
            style={{ paddingLeft: 32, width: '100%' }}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-base"
          style={{ width: 'auto', minWidth: 140 }}
        >
          {['', 'PENDING', 'VERIFIED', 'REJECTED'].map((s) => (
            <option key={s} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        <button onClick={exportCsv} className="btn-secondary" style={{ fontSize: 13 }}>
          Export CSV
        </button>
        <RoleGate roles={[Role.ADMIN, Role.PROCUREMENT]}>
          <Link to="/vendors/performance" className="btn-secondary" style={{ fontSize: 13 }}>
            Performance
          </Link>
          <button onClick={() => setShowModal(true)} className="btn-primary" style={{ fontSize: 13 }}>
            + Add Vendor
          </button>
        </RoleGate>
      </div>

      {/* Table / Empty */}
      <div>
        {isLoading ? (
          <TableSkeleton rows={5} cols={8} />
        ) : vendors.length === 0 ? (
          <EmptyState
            title="No vendors yet"
            description="Add your first vendor to start tracking onboarding, performance, and purchase activity."
            actionLabel={userRole === Role.ADMIN || userRole === Role.PROCUREMENT ? 'Add your first vendor' : undefined}
            onAction={userRole === Role.ADMIN || userRole === Role.PROCUREMENT ? () => setShowModal(true) : undefined}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default', userSelect: 'none' }}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    style={selectedIds.has(row.original.id) ? { background: 'rgba(99,102,241,0.06)' } : {}}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {cell.column.id === 'companyName' ? (
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{String(cell.getValue() ?? '')}</span>
                        ) : cell.column.id === 'select' || cell.column.id === 'status' || cell.column.id === 'action' ? (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        ) : (
                          String(cell.getValue() ?? '')
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} · {total} vendors
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost"
                style={{ fontSize: 13, opacity: page === 1 ? 0.4 : 1 }}
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-ghost"
                style={{ fontSize: 13, opacity: page === totalPages ? 0.4 : 1 }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      <RoleGate roles={[Role.ADMIN]}>
        <BulkActionBar
          selectedCount={selectedCount}
          onClearSelection={clearSelection}
          actions={[
            { label: 'Verify All', variant: 'primary', onClick: () => setConfirmAction({ type: 'verify', count: selectedCount }) },
            { label: 'Reject All', variant: 'danger', onClick: () => setConfirmAction({ type: 'reject', count: selectedCount }) },
            { label: 'Export Selected', variant: 'default', onClick: exportSelected },
          ]}
        />
      </RoleGate>

      </div>

      {confirmAction && (
        <BulkConfirmModal
          title={`${confirmAction.type === 'verify' ? 'Verify' : 'Reject'} ${confirmAction.count} vendor${confirmAction.count > 1 ? 's' : ''}?`}
          message={`Are you sure you want to ${confirmAction.type} ${confirmAction.count} vendor${confirmAction.count > 1 ? 's' : ''}? This will update their status immediately.`}
          confirmLabel={confirmAction.type === 'verify' ? 'Verify All' : 'Reject All'}
          variant={confirmAction.type === 'reject' ? 'danger' : 'primary'}
          loading={bulkLoading}
          onConfirm={() => executeBulkAction(confirmAction.type)}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {showModal && (
        <AddVendorModal
          onClose={() => setShowModal(false)}
          onSuccess={refetch}
        />
      )}
    </>
  );
}
