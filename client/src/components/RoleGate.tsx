import type { ReactNode } from 'react';
import { useAuthStore, Role } from '../store/authStore';

interface RoleGateProps {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RoleGate({ roles, children, fallback }: RoleGateProps) {
  const user = useAuthStore((s) => s.user);

  if (!user || !roles.includes(user.role)) {
    return fallback !== undefined ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
