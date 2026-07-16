import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        borderRadius: 14,
        border: '1px dashed var(--border-dim)',
        background: 'var(--bg-card)',
      }}
    >
      {/* Icon container */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 64,
          height: 64,
          borderRadius: '50%',
          border: '1px solid rgba(6,182,212,0.18)',
          background: 'rgba(6,182,212,0.08)',
        }}
      >
        {icon || (
          <svg style={{ width: 30, height: 30, color: '#06b6d4' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0l-3-3m3 3l-3 3m0-16l-3 3m3-3l3 3M8 7h8M8 11h8M8 15h5" />
          </svg>
        )}
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
        {title}
      </h3>
      <p style={{ marginTop: 6, fontSize: 13, color: 'var(--text-muted)', maxWidth: 340, lineHeight: 1.6 }}>
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-primary"
          style={{ marginTop: 20 }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}