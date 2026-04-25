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
import VendorOnlyRoute from './components/VendorOnlyRoute';
import VendorDashboardPage from './pages/Vendor/VendorDashboardPage';
import VendorInvoiceNewPage from './pages/Vendor/VendorInvoiceNewPage';
import VendorProfilePage from './pages/Vendor/VendorProfilePage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

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
            <Route path="/settings" element={<SettingsPage />} />

            <Route path="/vendor" element={<VendorOnlyRoute />}>
              <Route path="dashboard" element={<VendorDashboardPage />} />
              <Route path="invoices/new" element={<VendorInvoiceNewPage />} />
              <Route path="profile" element={<VendorProfilePage />} />
            </Route>
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
        <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
