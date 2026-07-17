import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import VendorList from './pages/Vendors/VendorList';
import VendorPerformancePage from './pages/Vendors/VendorPerformancePage';
import VendorDetail from './pages/Vendors/VendorDetail';
import POList from './pages/POs/POList';
import PODetail from './pages/POs/PODetail';
import InvoiceList from './pages/Invoices/InvoiceList';
import InvoiceDetail from './pages/Invoices/InvoiceDetail';
import ContractList from './pages/Contracts/ContractList';
import ContractDetail from './pages/Contracts/ContractDetail';
import AuditLogPage from './pages/AuditLogs/AuditLogPage';
import ReportsPage from './pages/Reports/ReportsPage';
import VendorOnlyRoute from './components/VendorOnlyRoute';
import VendorLayout from './components/VendorLayout';
import VendorDashboardPage from './pages/Vendor/VendorDashboardPage';
import VendorInvoiceNewPage from './pages/Vendor/VendorInvoiceNewPage';
import VendorProfilePage from './pages/Vendor/VendorProfilePage';
import VendorPOList from './pages/Vendor/VendorPOList';
import VendorInvoiceList from './pages/Vendor/VendorInvoiceList';
import VendorContractList from './pages/Vendor/VendorContractList';
import SettingsPage from './pages/SettingsPage';
import UserManagementPage from './pages/Users/UserManagementPage';
import AcceptInvitePage from './pages/Users/AcceptInvitePage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import { Toaster } from 'react-hot-toast';
import { SkeletonTheme } from './components/Skeletons';
import { ThemeProvider, useTheme } from './context/ThemeContext';

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
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/vendors" element={<VendorList />} />
            <Route path="/vendors/performance" element={<VendorPerformancePage />} />
            <Route path="/vendors/:id" element={<VendorDetail />} />
            <Route path="/pos" element={<POList />} />
            <Route path="/pos/:id" element={<PODetail />} />
            <Route path="/invoices" element={<InvoiceList />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/contracts" element={<ContractList />} />
            <Route path="/contracts/:id" element={<ContractDetail />} />
            <Route path="/audit-logs" element={<AuditLogPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin/users" element={<UserManagementPage />} />

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
    </BrowserRouter>
    </SkeletonThemeWrapper>
    </ThemeProvider>
  );
}
