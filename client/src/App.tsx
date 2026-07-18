import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, Role } from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import { Toaster } from 'react-hot-toast';
import { SkeletonTheme } from './components/Skeletons';
import { ThemeProvider } from './context/ThemeContext';
import { useTheme } from './hooks/useTheme';

// Everything behind auth is route-split — none of it is needed for the very
// first paint (the login screen), and several of these pull in Recharts,
// which was the single biggest contributor to the 1.2MB single-chunk bundle.
// The public auth-flow pages above stay eagerly bundled since they're what
// an unauthenticated visitor loads first anyway.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const VendorList = lazy(() => import('./pages/Vendors/VendorList'));
const VendorPerformancePage = lazy(() => import('./pages/Vendors/VendorPerformancePage'));
const VendorDetail = lazy(() => import('./pages/Vendors/VendorDetail'));
const POList = lazy(() => import('./pages/POs/POList'));
const PODetail = lazy(() => import('./pages/POs/PODetail'));
const InvoiceList = lazy(() => import('./pages/Invoices/InvoiceList'));
const InvoiceDetail = lazy(() => import('./pages/Invoices/InvoiceDetail'));
const ContractList = lazy(() => import('./pages/Contracts/ContractList'));
const ContractDetail = lazy(() => import('./pages/Contracts/ContractDetail'));
const AuditLogPage = lazy(() => import('./pages/AuditLogs/AuditLogPage'));
const ReportsPage = lazy(() => import('./pages/Reports/ReportsPage'));
const VendorDashboardPage = lazy(() => import('./pages/Vendor/VendorDashboardPage'));
const VendorInvoiceNewPage = lazy(() => import('./pages/Vendor/VendorInvoiceNewPage'));
const VendorProfilePage = lazy(() => import('./pages/Vendor/VendorProfilePage'));
const VendorPOList = lazy(() => import('./pages/Vendor/VendorPOList'));
const VendorInvoiceList = lazy(() => import('./pages/Vendor/VendorInvoiceList'));
const VendorContractList = lazy(() => import('./pages/Vendor/VendorContractList'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UserManagementPage = lazy(() => import('./pages/Users/UserManagementPage'));
const AcceptInvitePage = lazy(() => import('./pages/Users/AcceptInvitePage'));

import VendorOnlyRoute from './components/VendorOnlyRoute';
import VendorLayout from './components/VendorLayout';

function SkeletonThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <SkeletonTheme
      baseColor={theme === 'dark' ? '#1e2030' : '#f1f5f9'}
      highlightColor={theme === 'dark' ? '#2a2d3e' : '#e2e8f0'}
    >
      {children}
    </SkeletonTheme>
  );
}

function RouteSpinner() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

// ProtectedRoute above only checks "is there a token" — it doesn't know
// about roles, so a VENDOR (or a MANAGER hitting an ADMIN-only page) could
// previously load any AppLayout route directly by URL and get an empty page
// backed by 403s. This mirrors each route's actual backend authorization
// (see server/src/routes/*.ts) so the redirect happens before a doomed
// request is even made.
const STAFF_ROLES = [Role.ADMIN, Role.FINANCE, Role.PROCUREMENT, Role.MANAGER];

function RoleRoute({ roles, children }: { roles: Role[]; children: React.ReactElement }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return null; // ProtectedRoute's loading/redirect already covers this
  if (!roles.includes(user.role)) {
    return <Navigate to={user.role === Role.VENDOR ? '/vendor/dashboard' : '/dashboard'} replace />;
  }
  return children;
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const token = useAuthStore((s) => s.token);
  const loading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (loading) {
    return (
      <ThemeProvider>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-base)' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid var(--border-subtle)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontWeight: 500, fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>VendorHub Loading...</p>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SkeletonThemeWrapper>
        <Toaster position="top-right" />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<RouteSpinner />}>
        <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<RoleRoute roles={STAFF_ROLES}><DashboardPage /></RoleRoute>} />
            <Route path="/vendors" element={<RoleRoute roles={STAFF_ROLES}><VendorList /></RoleRoute>} />
            <Route path="/vendors/performance" element={<RoleRoute roles={STAFF_ROLES}><VendorPerformancePage /></RoleRoute>} />
            <Route path="/vendors/:id" element={<RoleRoute roles={STAFF_ROLES}><VendorDetail /></RoleRoute>} />
            <Route path="/pos" element={<RoleRoute roles={STAFF_ROLES}><POList /></RoleRoute>} />
            <Route path="/pos/:id" element={<RoleRoute roles={STAFF_ROLES}><PODetail /></RoleRoute>} />
            <Route path="/invoices" element={<RoleRoute roles={[Role.ADMIN, Role.FINANCE]}><InvoiceList /></RoleRoute>} />
            <Route path="/invoices/:id" element={<RoleRoute roles={[Role.ADMIN, Role.FINANCE]}><InvoiceDetail /></RoleRoute>} />
            <Route path="/contracts" element={<RoleRoute roles={STAFF_ROLES}><ContractList /></RoleRoute>} />
            <Route path="/contracts/:id" element={<RoleRoute roles={STAFF_ROLES}><ContractDetail /></RoleRoute>} />
            <Route path="/audit-logs" element={<RoleRoute roles={[Role.ADMIN]}><AuditLogPage /></RoleRoute>} />
            <Route path="/reports" element={<RoleRoute roles={[Role.FINANCE, Role.ADMIN]}><ReportsPage /></RoleRoute>} />
            <Route path="/settings" element={<RoleRoute roles={STAFF_ROLES}><SettingsPage /></RoleRoute>} />
            <Route path="/admin/users" element={<RoleRoute roles={[Role.ADMIN]}><UserManagementPage /></RoleRoute>} />

          </Route>

          <Route path="/vendor" element={<VendorOnlyRoute />}>
            <Route element={<VendorLayout />}>
              <Route path="dashboard" element={<VendorDashboardPage />} />
              <Route path="pos" element={<VendorPOList />} />
              <Route path="pos/:id" element={<PODetail />} />
              <Route path="invoices" element={<VendorInvoiceList />} />
              <Route path="invoices/new" element={<VendorInvoiceNewPage />} />
              <Route path="invoices/:id" element={<InvoiceDetail />} />
              <Route path="contracts" element={<VendorContractList />} />
              <Route path="profile" element={<VendorProfilePage />} />
            </Route>
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
    </SkeletonThemeWrapper>
    </ThemeProvider>
  );
}
