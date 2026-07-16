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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-slate-900 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-200 dark:border-white/10 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-900 dark:text-white">Keyboard Shortcuts</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-500 dark:text-slate-400">Navigate faster with your keyboard</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-white/5 p-2 text-slate-500 dark:text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/10 hover:text-slate-900 dark:text-slate-900 dark:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Shortcut list */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            {SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-50 dark:bg-white/5 px-4 py-3"
              >
                <kbd className="inline-flex min-w-[28px] items-center justify-center rounded-lg border border-white/20 bg-slate-800 px-2 py-1 text-xs font-bold text-cyan-300 font-mono shadow-sm">
                  {shortcut.key}
                </kbd>
                <span className="text-sm text-slate-600 dark:text-slate-600 dark:text-slate-300">{shortcut.action}</span>
              </div>
            ))}
          </div>

          <p className="mt-5 text-center text-xs text-slate-500">
            Shortcuts are disabled when an input field is focused.
          </p>
        </div>
      </div>
    </div>
  );
}
