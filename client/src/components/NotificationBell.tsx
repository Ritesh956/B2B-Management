import { useEffect, useMemo, useState } from 'react';
import { notificationService, type NotificationItem } from '../services/notifications';
import EmptyState from './EmptyState';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const recentNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.list();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const onMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Notifications"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 8,
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
        }}
      >
        <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              borderRadius: 99,
              background: '#ef4444',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="card-sm"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 380,
            zIndex: 30,
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Notifications
            </p>
            {unreadCount > 0 && (
              <span className="badge" style={{ background: '#ef4444', color: '#fff', fontSize: 10 }}>
                {unreadCount} unread
              </span>
            )}
          </div>

          {/* Body */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '16px', fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border-subtle)', borderTopColor: '#6366f1', animation: 'spin 0.7s linear infinite' }} />
                Loading...
              </div>
            ) : recentNotifications.length === 0 ? (
              <div style={{ padding: 16 }}>
                <EmptyState
                  title="You're all caught up"
                  description="No new notifications at this time."
                />
              </div>
            ) : (
              recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-dim)',
                    opacity: notification.read ? 0.6 : 1,
                    transition: 'background 0.12s',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = '')}
                >
                  {/* Unread indicator dot + message */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {!notification.read && (
                      <span style={{ marginTop: 5, flexShrink: 0, width: 7, height: 7, borderRadius: '50%', background: '#6366f1' }} />
                    )}
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5, flex: 1 }}>
                      {notification.message}
                    </p>
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                    {!notification.read && (
                      <button
                        onClick={() => onMarkAsRead(notification.id)}
                        style={{
                          fontSize: 11,
                          color: '#6366f1',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          fontWeight: 500,
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#818cf8')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#6366f1')}
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
