import type { CSSProperties } from 'react';

type Action = {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary';
};

type Props = {
  selectedCount: number;
  actions: Action[];
  onClearSelection: () => void;
};

const VARIANT_STYLE: Record<'default' | 'danger' | 'primary', CSSProperties> = {
  default: { background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' },
  danger: { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
  primary: { background: 'rgba(6,182,212,0.15)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.3)' },
};

export default function BulkActionBar({ selectedCount, actions, onClearSelection }: Props) {
  if (selectedCount === 0) return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        borderRadius: 16, border: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)', padding: '12px 20px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Count badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: '50%',
            background: '#06b6d4', color: '#fff', fontSize: 12, fontWeight: 700,
          }}>
            {selectedCount}
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-secondary)' }}>
            {selectedCount === 1 ? 'item' : 'items'} selected
          </span>
        </div>

        <div style={{ width: 1, height: 16, background: 'var(--border-dim)' }} />

        {/* Action buttons */}
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            style={{
              borderRadius: 10, padding: '7px 14px', fontSize: 13.5, fontWeight: 500,
              cursor: 'pointer', transition: 'filter 150ms',
              ...VARIANT_STYLE[action.variant ?? 'default'],
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.filter = 'brightness(1.25)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.filter = 'brightness(1)')}
          >
            {action.label}
          </button>
        ))}

        <div style={{ width: 1, height: 16, background: 'var(--border-dim)' }} />

        {/* Clear */}
        <button
          onClick={onClearSelection}
          title="Clear selection"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 10, border: '1px solid var(--border-subtle)',
            background: 'var(--bg-hover)', padding: 7,
            color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Reusable confirmation modal for bulk destructive actions
type ConfirmProps = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  variant?: 'danger' | 'primary';
};

export function BulkConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  loading,
  variant = 'primary',
}: ConfirmProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" style={{ maxWidth: 420, padding: 0 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
          <p style={{ marginTop: 8, fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{message}</p>
        </div>
        <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--border-dim)', padding: '16px 24px' }}>
          <button onClick={onCancel} disabled={loading} className="btn-secondary" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
            style={{ flex: 1 }}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
