import { Navigate, Outlet } from 'react-router-dom';
import { Role, useAuthStore } from '../store/authStore';

export default function VendorOnlyRoute() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== Role.VENDOR) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
