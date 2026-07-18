import { useEffect, useState } from 'react';
import { listUsers, updateUserRole, deactivateUser, type User } from '../../services/users';
import { useAuthStore, Role } from '../../store/authStore';
import RoleGate from '../../components/RoleGate';
import InviteUserModal from './InviteUserModal';
import { getErrorMessage } from '../../utils/apiError';
import toast from 'react-hot-toast';

// Vendor accounts are managed through the Vendor directory, not here — the
// server rejects converting a user to/from VENDOR (it would orphan or lack
// the linked Vendor company record), so don't offer it as an option.
const ASSIGNABLE_ROLES = Object.values(Role).filter((r) => r !== Role.VENDOR);

export default function UserManagementPage() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await listUsers();
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      toast.success('User role updated');
    } catch (err) {
      console.error('Failed to update role', err);
      toast.error(getErrorMessage(err, 'Failed to update user role'));
    }
  };

  const handleDeactivate = (userId: string) => {
    toast(
      (t) => (
        <div>
          <p style={{ marginBottom: 10, fontWeight: 600 }}>Deactivate this user?</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: 13, background: '#ef4444' }}
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  await deactivateUser(userId);
                  setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: false, status: 'INACTIVE' } : u)));
                  toast.success('User deactivated');
                } catch (err) {
                  console.error('Failed to deactivate user', err);
                  toast.error(getErrorMessage(err, 'Failed to deactivate user'));
                }
              }}
            >
              Yes, deactivate
            </button>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => toast.dismiss(t.id)}>Cancel</button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  };

  return (
    <RoleGate roles={[Role.ADMIN]}>
      <div className="page-root animate-in">
        <header className="page-header" style={{ marginBottom: 24 }}>
          <div className="page-title-group">
            <h1 className="page-title">User Management</h1>
            <p className="page-description">Manage admin, finance, and procurement team access.</p>
          </div>
          <div className="page-actions">
            <button className="btn-primary" onClick={() => setShowInviteModal(true)}>
              <span className="btn-icon">+</span>
              Invite User
            </button>
          </div>
        </header>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Action</th>
                </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                    <td>
                      {user.role === Role.VENDOR ? (
                        <span className="badge badge-vendor" title="Vendor accounts are managed from the Vendor directory">VENDOR</span>
                      ) : (
                        <select
                          value={user.role}
                          disabled={user.id === currentUserId}
                          title={user.id === currentUserId ? 'You cannot change your own role' : undefined}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                          style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-dim)',
                            borderRadius: 8,
                            padding: '6px 12px',
                            color: 'var(--text-primary)',
                            fontSize: 13,
                            outline: 'none',
                            opacity: user.id === currentUserId ? 0.6 : 1,
                            cursor: user.id === currentUserId ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${user.isActive ? 'approved' : 'rejected'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                    </td>
                    <td>
                      {user.isActive && user.id !== currentUserId && (
                        <button
                          onClick={() => handleDeactivate(user.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

        {showInviteModal && (
          <InviteUserModal
            onClose={() => setShowInviteModal(false)}
            onSuccess={() => {
              setShowInviteModal(false);
              fetchUsers();
            }}
          />
        )}
      </div>
    </RoleGate>
  );
}
