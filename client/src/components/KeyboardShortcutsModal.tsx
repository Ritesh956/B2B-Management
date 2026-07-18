import { useEffect } from 'react';

type Shortcut = {
  key: string;
  action: string;
};

const SHORTCUTS: Shortcut[] = [
  { key: 'V', action: 'Go to Vendors' },
  { key: 'P', action: 'Go to Purchase Orders' },
  { key: 'N', action: 'New PO (on PO list)' },
  { key: 'I', action: 'Go to Invoices' },
  { key: 'C', action: 'Go to Contracts' },
  { key: 'A', action: 'Go to Audit Logs (Admin only)' },
  { key: '/', action: 'Focus search bar' },
  { key: '?', action: 'Open this shortcuts help' },
  { key: 'Esc', action: 'Close modal / dropdown' },
];

type Props = {
  onClose: () => void;
};

export default function KeyboardShortcutsModal({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Keyboard Shortcuts</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>Navigate faster with your keyboard</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, transition: 'color 150ms' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Shortcut list */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.key}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                borderRadius: 10, border: '1px solid var(--border-dim)',
                background: 'var(--bg-hover)', padding: '10px 14px',
              }}
            >
              <kbd style={{
                display: 'inline-flex', minWidth: 28, alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--bg-input)',
                padding: '4px 8px', fontSize: 12, fontWeight: 700, color: '#22d3ee',
                fontFamily: 'ui-monospace, monospace',
              }}>
                {shortcut.key}
              </kbd>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{shortcut.action}</span>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 11.5, color: 'var(--text-muted)' }}>
          Shortcuts are disabled when an input field is focused.
        </p>
      </div>
    </div>
  );
}
