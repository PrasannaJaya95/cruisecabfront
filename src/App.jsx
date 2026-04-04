import React, { Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';
import Login from './pages/Login';
import Register from './pages/Register';
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Checkout = React.lazy(() => import('./pages/public/Checkout'));
const ThankYou = React.lazy(() => import('./pages/public/ThankYou'));
import VehicleManagement from './pages/VehicleManagement';

import DriverManagement from './pages/DriverManagement';
import CustomerManagement from './pages/CustomerManagement';
import VendorManagement from './pages/VendorManagement';
import UserManagement from './pages/UserManagement';
import VehicleBrandManagement from './pages/VehicleBrandManagement';
import VehicleModelManagement from './pages/VehicleModelManagement';
import FleetCategoryManagement from './pages/FleetCategoryManagement';
import VehicleRepair from './pages/VehicleRepair';
import VehicleExpenses from './pages/VehicleExpenses';
import OdometerManagement from './pages/OdometerManagement';
import GeneralSettings from './pages/GeneralSettings';
import PermissionGroupManagement from './pages/PermissionGroupManagement';
import EmailSettings from './pages/EmailSettings';
import CompanyProfileSettings from './pages/CompanyProfileSettings';
import Contracts from './pages/Contracts';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Quotations from './pages/Quotations';
import MyBookings from './pages/customer/MyBookings';
import MyProfile from './pages/customer/MyProfile';
import LandingPage from './pages/LandingPage';
import VehicleListing from './pages/public/VehicleListing';
import VehicleDetail from './pages/public/VehicleDetail';
import WebsiteGuard from './components/WebsiteGuard';
import PLReports from './pages/PLReports';
import VendorBills from './pages/VendorBills';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  if (user.role === 'SUPER_ADMIN') return children || <Outlet />;

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children || <Outlet />;
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error", error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: 'red', color: 'white' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.info && this.state.info.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 italic tracking-widest animate-pulse">Initializing Rentix...</div>}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/portal/vehicle" element={<VehicleListing />} />
              <Route path="/portal/vehicle/:id" element={<VehicleDetail />} />
              <Route path="/checkout/:id" element={<Checkout />} />
              <Route path="/thank-you" element={<ThankYou />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Admin/Staff Routes */}
              <Route element={<RoleProtectedRoute allowedRoles={['ADMIN', 'STAFF']} />}>
                <Route path="/vehicles" element={<VehicleManagement />} />
                <Route path="/fleet/categories" element={<FleetCategoryManagement />} />
                <Route path="/fleet/brands" element={<VehicleBrandManagement />} />
                <Route path="/fleet/models" element={<VehicleModelManagement />} />
                <Route path="/fleet/repairs" element={<VehicleRepair />} />
                <Route path="/fleet/expenses" element={<VehicleExpenses />} />
                <Route path="/fleet/odometers" element={<OdometerManagement />} />
                <Route path="/fleet/reports-pl" element={<PLReports />} />
                <Route path="/fleet/vendor-bills" element={<VendorBills />} />

                {/* Bookings */}
                <Route path="/bookings/quotations" element={<Quotations />} />
                <Route path="/bookings/contracts" element={<Contracts />} />
                <Route path="/bookings/invoices" element={<Invoices />} />
                <Route path="/bookings/payments" element={<Payments />} />

                {/* Contacts */}
                <Route path="/drivers" element={<DriverManagement />} />
                <Route path="/customers" element={<CustomerManagement />} />
                <Route path="/vendors" element={<VendorManagement />} />

                {/* Settings */}
                <Route path="/settings/users" element={<UserManagement />} />
                <Route path="/settings/permissions" element={<PermissionGroupManagement />} />
                <Route path="/settings/general" element={<GeneralSettings />} />
              </Route>

              {/* Email SMTP Settings - Admin only */}
              <Route element={<RoleProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/settings/email" element={<EmailSettings />} />
                <Route path="/settings/company" element={<CompanyProfileSettings />} />
              </Route>

              {/* Customer Only Routes */}
              <Route element={<RoleProtectedRoute allowedRoles={['CUSTOMER']} />}>
                <Route path="/my-bookings" element={<MyBookings />} />
                <Route path="/my-profile" element={<MyProfile />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
