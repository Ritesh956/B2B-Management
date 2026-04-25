import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vendorService } from '../../services/vendors';
import RoleGate from '../../components/RoleGate';
import { Role } from '../../store/authStore';
import { useVendorQuery } from '../../hooks/useVendorsQuery';

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

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const { data, isLoading, refetch } = useVendorQuery(id ?? '');
  const vendor = data?.vendor ?? null;

  const handleStatusChange = async (status: 'VERIFIED' | 'REJECTED') => {
    if (!id || !vendor) return;
    setUpdating(true);
    try {
      await vendorService.updateStatus(id, status);
      await refetch();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !vendor) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 text-lg font-semibold">{error || 'Vendor not found'}</p>
        <button onClick={() => navigate('/vendors')} className="mt-4 text-violet-400 hover:text-violet-300 text-sm">
          â† Back to Vendors
        </button>
      </div>
    </div>
  );

  const docs = Array.isArray(vendor.documents) ? vendor.documents : [];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-8 py-5 flex items-center gap-4">
        <button onClick={() => navigate('/vendors')} className="text-slate-400 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{vendor.companyName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[vendor.status]}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[vendor.status]}`} />
              {vendor.status}
            </span>
            {vendor.performanceScore !== null && (
              <span className="text-xs text-slate-400">Score: {vendor.performanceScore.toFixed(1)}</span>
            )}
          </div>
        </div>

        {/* Admin status controls */}
        <RoleGate roles={[Role.ADMIN]}>
          {vendor.status !== 'VERIFIED' && (
            <button
              onClick={() => handleStatusChange('VERIFIED')}
              disabled={updating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition"
            >
              âœ“ Verify
            </button>
          )}
          {vendor.status !== 'REJECTED' && (
            <button
              onClick={() => handleStatusChange('REJECTED')}
              disabled={updating}
              className="px-4 py-2 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition"
            >
              âœ— Reject
            </button>
          )}
        </RoleGate>
      </div>

      {/* Content */}
      <div className="px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Vendor Information</h2>
            <div className="grid grid-cols-2 gap-y-5 gap-x-8">
              {[
                { label: 'Company Name', value: vendor.companyName },
                { label: 'Contact Person', value: vendor.contactName },
                { label: 'Email', value: vendor.email },
                { label: 'Phone', value: vendor.phone },
                { label: 'Registered', value: new Date(vendor.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) },
                { label: 'Performance Score', value: vendor.performanceScore?.toFixed(1) ?? 'N/A' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className="text-sm text-white font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white/3 border border-white/5 rounded-2xl p-6 h-fit">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Documents <span className="text-slate-600 normal-case tracking-normal font-normal">({docs.length})</span>
          </h2>
          {docs.length === 0 ? (
            <p className="text-sm text-slate-600 italic">No documents uploaded</p>
          ) : (
            <ul className="space-y-2.5">
              {docs.map((doc, i) => (
                <li key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 group">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{doc.name}</p>
                    <p className="text-xs text-slate-500">{(doc.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 opacity-0 group-hover:opacity-100 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
