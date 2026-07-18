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
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', margin: 0 }}>
        Deleted Items (Soft Deletes)
      </h2>
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Loading deleted items...</p>
        ) : items.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No deleted items found.</p>
        ) : (
          <div style={{ borderRadius: 10, border: '1px solid var(--border-dim)', background: 'var(--bg-surface)', overflow: 'hidden' }}>
            {items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 16, borderTop: index === 0 ? 'none' : '1px solid var(--border-dim)',
                  transition: 'background 150ms',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <div>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.name || item.email}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    {item.type} · Deleted: {new Date(item.deletedAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => onRestore(item.id, item.type)}
                  disabled={restoring === item.id}
                  style={{
                    borderRadius: 8, border: 'none', background: 'rgba(6,182,212,0.1)',
                    padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#22d3ee',
                    cursor: restoring === item.id ? 'not-allowed' : 'pointer',
                    opacity: restoring === item.id ? 0.5 : 1, transition: 'background 150ms',
                  }}
                >
                  {restoring === item.id ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
