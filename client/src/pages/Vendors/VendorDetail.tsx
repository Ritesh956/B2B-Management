import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vendorService } from '../../services/vendors';
import RoleGate from '../../components/RoleGate';
import { Role } from '../../store/authStore';
import { useVendorQuery } from '../../hooks/useVendorsQuery';
import ActivityFeed from '../../components/ActivityFeed';
import { DetailPageSkeleton } from '../../components/Skeletons';
import { withAuthToken } from '../../utils/fileUrl';

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

  if (isLoading) return <DetailPageSkeleton />;

  if (error || !vendor) return (
    <div className="page-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ textAlign: 'center', padding: '40px 32px', maxWidth: 380 }}>
        <p style={{ color: '#ef4444', fontWeight: 600, fontSize: 15, marginBottom: 16 }}>
          {error || 'Vendor not found'}
        </p>
        <button
          onClick={() => navigate('/vendors')}
          className="btn-ghost"
          style={{ fontSize: 13 }}
        >
          ← Back to vendors
        </button>
      </div>
    </div>
  );

  const docs = Array.isArray(vendor.documents) ? vendor.documents : [];

  const statusColorMap: Record<string, string> = {
    VERIFIED: '#10b981',
    PENDING: '#f59e0b',
    REJECTED: '#ef4444',
  };
  const statusBgMap: Record<string, string> = {
    VERIFIED: 'rgba(16,185,129,0.12)',
    PENDING: 'rgba(245,158,11,0.12)',
    REJECTED: 'rgba(239,68,68,0.12)',
  };
  const statusBorderMap: Record<string, string> = {
    VERIFIED: 'rgba(16,185,129,0.3)',
    PENDING: 'rgba(245,158,11,0.3)',
    REJECTED: 'rgba(239,68,68,0.3)',
  };

  return (
    <div className="page-root animate-in">
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => navigate('/vendors')}
              className="btn-ghost"
              style={{ padding: '8px 10px', borderRadius: 10, lineHeight: 1 }}
              aria-label="Back"
            >
              <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="page-title" style={{ marginBottom: 6 }}>{vendor.companyName}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* Status badge */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  color: statusColorMap[vendor.status],
                  background: statusBgMap[vendor.status],
                  border: `1px solid ${statusBorderMap[vendor.status]}`,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColorMap[vendor.status], display: 'inline-block' }} />
                  {vendor.status}
                </span>
                {vendor.performanceScore !== null && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Score: <strong style={{ color: 'var(--text-secondary)' }}>{vendor.performanceScore.toFixed(1)}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <RoleGate roles={[Role.ADMIN]}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {vendor.status !== 'VERIFIED' && (
                <button
                  onClick={() => handleStatusChange('VERIFIED')}
                  disabled={updating}
                  className="btn-primary"
                  style={{ fontSize: 13, opacity: updating ? 0.6 : 1 }}
                >
                  ✓ Verify
                </button>
              )}
              {vendor.status !== 'REJECTED' && (
                <button
                  onClick={() => handleStatusChange('REJECTED')}
                  disabled={updating}
                  className="btn-danger"
                  style={{ fontSize: 13, opacity: updating ? 0.6 : 1 }}
                >
                  ✕ Reject
                </button>
              )}
            </div>
          </RoleGate>
        </div>
      </div>

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Vendor Information card */}
            <div className="card">
              <h2 style={{
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 20,
              }}>
                Vendor Information
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 32px' }}>
                {[
                  { label: 'Company Name', value: vendor.companyName },
                  { label: 'Contact Person', value: vendor.contactName },
                  { label: 'Email', value: vendor.email },
                  { label: 'Phone', value: vendor.phone },
                  { label: 'Registered', value: new Date(vendor.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) },
                  { label: 'Performance Score', value: vendor.performanceScore?.toFixed(1) ?? 'N/A' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                    <p style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity feed */}
            <div style={{ height: 384 }}>
              <ActivityFeed entity="Vendor" entityId={id!} />
            </div>
          </div>

          {/* Right column — Documents */}
          <div className="card" style={{ height: 'fit-content' }}>
            <h2 style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 20,
            }}>
              Documents{' '}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
                ({docs.length})
              </span>
            </h2>
            {docs.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No documents uploaded</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {docs.map((doc, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'var(--bg-hover)', borderRadius: 10,
                      padding: '10px 12px',
                    }}
                    className="doc-row"
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                      background: 'rgba(99,102,241,0.15)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg style={{ width: 16, height: 16, color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.name}
                      </p>
                      {typeof doc.size === 'number' && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {(doc.size / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>
                    <a
                      href={withAuthToken(doc.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent-primary)', opacity: 0.8, transition: 'opacity 0.15s' }}
                      onMouseOver={e => (e.currentTarget.style.opacity = '1')}
                      onMouseOut={e => (e.currentTarget.style.opacity = '0.8')}
                      aria-label="Download document"
                    >
                      <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </div>
  );
}


