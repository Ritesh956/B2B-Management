import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Vendor } from '../../services/vendors';
import AddVendorModal from './AddVendorModal';
import RoleGate from '../../components/RoleGate';
import { Role } from '../../store/authStore';
import { useAuthStore } from '../../store/authStore';
import EmptyState from '../../components/EmptyState';
import { downloadCsv } from '../../utils/csv';
import { useVendorsQuery } from '../../hooks/useVendorsQuery';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table';

const STATUS_COLORS = {
  PENDING:  'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  VERIFIED: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  REJECTED: 'bg-red-500/15 text-red-400 border border-red-500/30',
};

const STATUS_DOT = {
  PENDING:  'bg-amber-400',
  VERIFIED: 'bg-emerald-400',
  REJECTED: 'bg-red-400',
};

export default function VendorList() {
  const userRole = useAuthStore((s) => s.user?.role);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showModal, setShowModal] = useState(false);
  const limit = 10;
  const { data, isLoading, refetch } = useVendorsQuery({ search, status: statusFilter || undefined, page, limit });

  const vendors = data?.vendors ?? [];
  const total = data?.total ?? 0;

  const columns = useMemo<ColumnDef<Vendor>[]>(
    () => [
      { accessorKey: 'companyName', header: 'Company' },
      { accessorKey: 'contactName', header: 'Contact' },
      { accessorKey: 'email', header: 'Email' },
      { accessorKey: 'phone', header: 'Phone' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const vendor = row.original;
          return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[vendor.status]}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[vendor.status]}`} />
              {vendor.status}
            </span>
          );
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
          <Link to={`/vendors/${row.original.id}`} className="text-violet-400 hover:text-violet-300 font-medium transition text-xs">
            View →
          </Link>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: vendors,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalPages = Math.ceil(total / 10);

  const exportCsv = () => {
    downloadCsv(
      'vendors.csv',
      ['Company', 'Contact', 'Email', 'Phone', 'Status', 'Score'],
      vendors.map((vendor) => [
        vendor.companyName,
        vendor.contactName,
        vendor.email,
        vendor.phone,
        vendor.status,
        vendor.performanceScore ?? '',
      ])
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top bar */}
      <div className="border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            â† Dashboard
          </Link>

          <div>
          <h1 className="text-2xl font-bold text-white">Vendors</h1>
          <p className="text-slate-400 text-sm mt-0.5">{total} vendors total</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium rounded-xl transition text-sm"
          >
            Export CSV
          </button>
          <RoleGate roles={[Role.ADMIN, Role.PROCUREMENT]}>
            <Link
              to="/vendors/performance"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium rounded-xl transition text-sm"
            >
              Performance
            </Link>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium rounded-xl transition shadow-lg shadow-violet-500/25 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Vendor
            </button>
          </RoleGate>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 flex flex-col sm:flex-row gap-3 border-b border-white/5">
        <div className="relative flex-1">
          <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, contact, emailâ€¦"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
          />
        </div>
        <div className="flex gap-2">
          {['', 'PENDING', 'VERIFIED', 'REJECTED'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                statusFilter === s
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : vendors.length === 0 ? (
          <EmptyState
            title="No vendors yet"
            description="Add your first vendor to start tracking onboarding, performance, and purchase activity."
            actionLabel={userRole === Role.ADMIN || userRole === Role.PROCUREMENT ? 'Add your first vendor' : undefined}
            onAction={userRole === Role.ADMIN || userRole === Role.PROCUREMENT ? () => setShowModal(true) : undefined}
          />
        ) : (
          <div className="bg-white/3 border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-white/5">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                        onClick={header.column.getToggleSortingHandler()}
                        style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-5 py-4 text-slate-300">
                        {cell.column.id === 'companyName' ? (
                          <span className="font-medium text-white">{String(cell.getValue() ?? '')}</span>
                        ) : cell.column.id === 'status' || cell.column.id === 'action' ? (
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
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 hover:text-white disabled:opacity-40 transition"
              >
                â† Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 hover:text-white disabled:opacity-40 transition"
              >
                Next â†’
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <AddVendorModal
          onClose={() => setShowModal(false)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
