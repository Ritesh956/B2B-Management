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

export default function BulkActionBar({ selectedCount, actions, onClearSelection }: Props) {
  if (selectedCount === 0) return null;

  const variantClass = {
    default: 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/10 text-slate-200 hover:bg-white/15',
    danger: 'border-red-500/30 bg-red-500/15 text-red-300 hover:bg-red-500/25',
    primary: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25',
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-900/95 px-5 py-3 shadow-2xl shadow-black/40 backdrop-blur-xl ring-1 ring-white/5">
        {/* Count badge */}
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-white">
            {selectedCount}
          </span>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {selectedCount === 1 ? 'item' : 'items'} selected
          </span>
        </div>

        <div className="h-4 w-px bg-slate-100 dark:bg-white/10" />

        {/* Action buttons */}
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`rounded-xl border px-3.5 py-1.5 text-sm font-medium transition ${
              variantClass[action.variant ?? 'default']
            }`}
          >
            {action.label}
          </button>
        ))}

        <div className="h-4 w-px bg-slate-100 dark:bg-white/10" />

        {/* Clear */}
        <button
          onClick={onClearSelection}
          className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-1.5 text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:bg-white/10 hover:text-slate-900 dark:text-white"
          title="Clear selection"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  const confirmClass =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-400 shadow-red-500/20'
      : 'bg-gradient-to-r from-sky-500 via-cyan-500 to-violet-500 hover:brightness-110 shadow-cyan-500/20';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
        </div>
        <div className="flex gap-3 border-t border-slate-200 dark:border-white/10 px-6 py-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold text-slate-900 dark:text-white shadow-lg transition disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
