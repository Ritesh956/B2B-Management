import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Role } from '../../store/authStore';
import { ContractStatus, type Contract } from '../../services/contracts';
import RoleGate from '../../components/RoleGate';
import { useContractQuery } from '../../hooks/useContractsQuery';
import { updateContractStatus } from '../../services/contracts';

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [updating, setUpdating] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const { data, isLoading, refetch } = useContractQuery(id ?? '');
  const contract = data?.contract ?? null;

  const handleStatusChange = async (newStatus: ContractStatus) => {
    if (!contract) return;
    try {
      setUpdating(true);
      await updateContractStatus(contract.id, newStatus);
      setShowStatusMenu(false);
      await refetch();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (contract: Contract) => {
    if (contract.isExpired) {
      return <span className="badge badge-rejected" style={{ fontSize: '13px', padding: '5px 14px' }}>Expired</span>;
    }
    if (contract.isExpiringSoon) {
      return <span className="badge badge-pending" style={{ fontSize: '13px', padding: '5px 14px' }}>Expiring in {contract.daysUntilExpiry} days</span>;
    }
    return <span className="badge badge-active" style={{ fontSize: '13px', padding: '5px 14px' }}>Active</span>;
  };

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', background: 'var(--bg-base)' }}>
      Loading...
    </div>
  );
  if (!contract) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', background: 'var(--bg-base)' }}>
      Contract not found
    </div>
  );

  const startDate = new Date(contract.startDate);
  const endDate = new Date(contract.endDate);

  return (
    <div className="page-root">
      {/* Header Card */}
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => navigate('/contracts')}
                className="btn-ghost"
                style={{ width: 'fit-content', fontSize: '12px', color: '#67e8f9' }}
              >
                &larr; Back to Contracts
              </button>
              <h1 className="page-title" style={{ marginBottom: 0 }}>{contract.title}</h1>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
              {getStatusBadge(contract)}
              <RoleGate roles={[Role.ADMIN, Role.PROCUREMENT]}>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    className="btn-secondary"
                  >
                    Change status &#9660;
                  </button>
                  {showStatusMenu && (
                    <div style={{
                      position: 'absolute', right: 0, top: '100%', marginTop: '8px',
                      width: '160px', borderRadius: '12px',
                      border: '1px solid var(--border-dim)',
                      background: 'var(--bg-card)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                      zIndex: 10, overflow: 'hidden'
                    }}>
                      {Object.values(ContractStatus).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(status)}
                          disabled={updating || contract.status === status}
                          style={{
                            display: 'block', width: '100%',
                            padding: '10px 16px',
                            textAlign: 'left',
                            fontSize: '13px',
                            color: 'var(--text-secondary)',
                            background: 'none',
                            border: 'none',
                            borderBottom: '1px solid var(--border-dim)',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            opacity: (updating || contract.status === status) ? 0.5 : 1,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </RoleGate>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginTop: '24px' }}>
        {/* Vendor */}
        <div className="card-sm">
          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' }}>Vendor</p>
          <p
            style={{ fontSize: '15px', fontWeight: 600, color: '#38bdf8', cursor: 'pointer' }}
            onClick={() => navigate(`/vendors/${contract.vendor.id}`)}
          >
            {contract.vendor.companyName}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{contract.vendor.email}</p>
        </div>

        {/* Status */}
        <div className="card-sm">
          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' }}>Status</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{contract.status}</p>
        </div>

        {/* Start Date */}
        <div className="card-sm">
          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' }}>Start Date</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{startDate.toLocaleDateString()}</p>
        </div>

        {/* End Date */}
        <div className="card-sm">
          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' }}>End Date</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{endDate.toLocaleDateString()}</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>
            {contract.isExpired ? (
              <span style={{ color: '#f87171' }}>Expired {Math.abs(contract.daysUntilExpiry)} days ago</span>
            ) : (
              <span style={{ color: '#34d399' }}>{contract.daysUntilExpiry} days remaining</span>
            )}
          </p>
        </div>

        {/* Duration */}
        <div className="card-sm">
          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' }}>Contract Duration</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
          </p>
        </div>

        {/* Created */}
        <div className="card-sm">
          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' }}>Created</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {new Date(contract.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* PDF Viewer */}
      {contract.fileUrl ? (
        <div style={{ marginBottom: '32px', marginTop: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Contract Document</h2>
          <div className="card-sm" style={{ padding: '16px' }}>
            <iframe
              src={contract.fileUrl}
              style={{ width: '100%', height: '384px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}
              title={contract.title}
            />
          </div>
          <div style={{ marginTop: '12px' }}>
            <a
              href={contract.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#67e8f9', fontWeight: 500, textDecoration: 'none', fontSize: '13px' }}
            >
              Download Contract PDF
            </a>
          </div>
        </div>
      ) : (
        <div className="card" style={{
          marginTop: '24px',
          marginBottom: '32px',
          border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.08)'
        }}>
          <p style={{ color: '#fde68a', fontSize: '13px', margin: 0 }}>No contract document attached</p>
        </div>
      )}
    </div>
  );
}
