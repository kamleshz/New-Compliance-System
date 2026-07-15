import { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './components/layout/AuthLayout.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import { AuthContext } from './context/AuthContext.jsx';
import DashboardHome from './pages/DashboardHome.jsx';
import PoDashboard from './pages/PoDashboard.jsx';
import AccountDashboard from './pages/AccountDashboard.jsx';
import Users from './pages/Users.jsx';
import Roles from './pages/Roles.jsx';
import Permissions from './pages/Permissions.jsx';
import Departments from './pages/Departments.jsx';
import ClientMaster from './pages/ClientMaster.jsx';
import ClientDetails from './pages/ClientDetails.jsx';
import Accounts from './pages/Accounts.jsx';
import UserRegister from './pages/UserRegister.jsx';
import RegulatoryTracker from './pages/RegulatoryTracker.jsx';
import ComplianceCalendar from './pages/ComplianceCalendar.jsx';
import TaskManagement from './pages/TaskManagement.jsx';
import DocumentRepository from './pages/DocumentRepository.jsx';
import Notifications from './pages/Notifications.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';

function App() {
  const { user, isAuthenticated, isAuthReady } = useContext(AuthContext);

  if (!isAuthReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm font-semibold text-slate-600">
        Loading workspace...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <AuthLayout><Login /></AuthLayout>} />
      <Route path="/" element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" replace />}>
        <Route index element={<DashboardHome />} />
        <Route path="po-dashboard" element={<PoDashboard />} />
        <Route path="account-dashboard" element={<AccountOnlyRoute user={user}><AccountDashboard /></AccountOnlyRoute>} />
        <Route path="users" element={<AdminOnlyRoute user={user}><Users /></AdminOnlyRoute>} />
        <Route path="roles" element={<Roles />} />
        <Route path="permissions" element={<Permissions />} />
        <Route path="departments" element={<Departments />} />
        <Route path="clients" element={<ClientMaster />} />
        <Route path="clients/:id" element={<ClientDetails />} />
        <Route path="accounts" element={<AccountOnlyRoute user={user}><Accounts /></AccountOnlyRoute>} />
        <Route path="user-register" element={<AdminOnlyRoute user={user}><UserRegister /></AdminOnlyRoute>} />
        <Route path="regulatory-tracker" element={<RegulatoryTracker />} />
        <Route path="compliance-calendar" element={<ComplianceCalendar />} />
        <Route path="task-management" element={<TaskManagement />} />
        <Route path="document-repository" element={<DocumentRepository />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function AdminOnlyRoute({ user, children }) {
  return isAdminUser(user) ? children : <Navigate to="/" replace />;
}

function AccountOnlyRoute({ user, children }) {
  const roleName = getRoleName(user);
  return roleName === 'account' || roleName === 'accounts' || isAdminUser(user)
    ? children
    : <Navigate to="/" replace />;
}

function isAdminUser(user) {
  const roleName = getRoleName(user);
  return roleName === 'admin' || roleName === 'super admin' || roleName === 'superadmin';
}

function getRoleName(user) {
  return String(user?.role || user?.roleName || user?.designation || user?.roleId?.roleName || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export default App;
