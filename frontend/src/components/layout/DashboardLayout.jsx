import { useEffect, useState, useContext } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('cs.sidebarCollapsed');
      if (stored === '1') setSidebarCollapsed(true);
    } catch {
      setSidebarCollapsed(false);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('cs.sidebarCollapsed', sidebarCollapsed ? '1' : '0');
    } catch {
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const breadcrumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/-/g, ' '));

  return (
    <div className="h-screen overflow-hidden bg-[var(--app-bg-gradient)] text-slate-900 dark:text-slate-100">
      <Topbar breadcrumbs={breadcrumbs} user={user} onLogout={handleLogout} onMenuOpen={() => setSidebarOpen(true)} />
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 top-[61px] z-10 bg-slate-950/35 backdrop-blur-sm md:hidden"
        />
      ) : null}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        permissions={user?.permissions || []}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
      />
      <div className={`flex h-[calc(100vh-61px)] flex-1 flex-col overflow-hidden transition-[margin] duration-300 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <main className={`flex-1 overflow-y-auto py-4 sm:py-5 ${sidebarCollapsed ? 'px-2 sm:px-3 lg:px-4' : 'px-4 sm:px-5 lg:px-6'}`}>
          <div className="w-full max-w-none">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
