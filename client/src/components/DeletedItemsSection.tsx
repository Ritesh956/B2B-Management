import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../utils/apiError';

type DeletedItem = { id: string; type: string; name?: string; email?: string; deletedAt: string };

export default function DeletedItemsSection() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      const res = await api.get('/admin/deleted-items');
      setItems(res.data.items || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load deleted items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchItems();
    }
  }, [user]);

  const onRestore = async (id: string, type: string) => {
    try {
      setRestoring(id);
      await api.patch('/admin/restore', { id, type });
      toast.success(`${type} restored successfully`);
      fetchItems();
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, 'Failed to restore item'));
    } finally {
      setRestoring(null);
    }
  };

  if (user?.role !== 'ADMIN') return null;

  return (
    <div className="rounded-4xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/45 p-6 shadow-lg shadow-black/10 backdrop-blur-xl lg:col-span-2">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Deleted Items (Soft Deletes)</h2>
      <div className="mt-5 space-y-4 max-w-2xl">
        {loading ? (
          <p className="text-sm text-slate-500">Loading deleted items...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No deleted items found.</p>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 overflow-hidden">
            <ul className="divide-y divide-slate-200 dark:divide-white/10">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between p-4 hover:bg-slate-100 dark:hover:bg-white/10 transition">
                  <div>
                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-200">{item.name || item.email}</span>
                    <span className="block text-xs text-slate-500">
                      {item.type} • Deleted: {new Date(item.deletedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => onRestore(item.id, item.type)}
                    disabled={restoring === item.id}
                    className="rounded-lg bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition disabled:opacity-50"
                  >
                    {restoring === item.id ? 'Restoring...' : 'Restore'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
